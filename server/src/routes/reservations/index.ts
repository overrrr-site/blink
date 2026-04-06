import express from 'express';
import pool from '../../db/connection.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';
import { cacheControl } from '../../middleware/cache.js';
import {
  requireStoreId,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
} from '../../utils/response.js';
import { appendBusinessTypeFilter } from '../../utils/businessTypes.js';
import {
  syncCalendarOnCreate,
  syncCalendarOnUpdate,
  syncCalendarOnDelete,
} from '../../services/reservationsService.js';
import { getMonthDateRange, parseDateTimeRange, findRoomConflict } from './utils.js';
import availabilityRouter from './availability.js';
import exportRouter from './export.js';
import {
  idParamSchema,
  parseSchema,
  reservationCreateSchema,
  reservationsListQuerySchema,
  reservationUpdateSchema,
} from '../schemas.js';

const router = express.Router();
router.use(authenticate);

// サブルーターをマウント
router.use(availabilityRouter);
router.use(exportRouter);

// 予約一覧取得（日付指定）
router.get('/', cacheControl(0, 30), async function(req: AuthRequest, res): Promise<void> {
  try {
    const parsedQuery = parseSchema(reservationsListQuerySchema, req.query);
    if ('error' in parsedQuery) {
      sendBadRequest(res, parsedQuery.error);
      return;
    }

    const { date, month, service_type } = parsedQuery.data;

    // storeIdがnullの場合はエラー
    if (!requireStoreId(req, res)) {
      return;
    }

    let query = `
      SELECT r.*,
             d.name as dog_name, d.photo_url as dog_photo,
             o.name as owner_name,
             hr.room_name,
             hr.room_size,
             pvi.daycare_data,
             CASE WHEN j.id IS NOT NULL THEN true ELSE false END as has_record
      FROM reservations r
      JOIN dogs d ON r.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      LEFT JOIN hotel_rooms hr ON r.room_id = hr.id
      LEFT JOIN pre_visit_inputs pvi ON r.id = pvi.reservation_id
      LEFT JOIN LATERAL (
        SELECT j.id FROM records j WHERE j.reservation_id = r.id AND j.deleted_at IS NULL LIMIT 1
      ) j ON true
      WHERE r.store_id = $1
    `;
    const params: (string | number)[] =[req.storeId];

    if (date) {
      query += ` AND r.reservation_date = $${params.length + 1}`;
      params.push(String(date));
    } else if (month) {
      // month は 'yyyy-MM' 形式（例: '2024-01'）
      const range = getMonthDateRange(String(month));
      if (range) {
        query += ` AND r.reservation_date >= $${params.length + 1} AND r.reservation_date < $${params.length + 2}`;
        params.push(range.start, range.end);
      }
    }

    // 業種フィルタ
    query += appendBusinessTypeFilter(params, 'r.service_type', service_type);

    query += ` ORDER BY r.reservation_date, r.reservation_time`;

    const result = await pool.query(query, params);

    // デバッグ用ログ（開発環境 + LOG_LEVEL=debug の場合のみ）
    if (process.env.NODE_ENV === 'development' && process.env.LOG_LEVEL === 'debug') {
      console.log('📅 Reservations query:', {
        month,
        date,
        storeId: req.storeId,
        params,
        count: result.rows.length,
        sample: result.rows.slice(0, 2).map(r => ({
          id: r.id,
          date: r.reservation_date,
          status: r.status,
        }))
      });
    }

    res.json(result.rows);
  } catch (error) {
    sendServerError(res, '予約一覧の取得に失敗しました', error);
  }
});

// 予約詳細取得
router.get('/:id(\\d+)', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const parsedParams = parseSchema(idParamSchema, req.params);
    if ('error' in parsedParams) {
      sendBadRequest(res, parsedParams.error);
      return;
    }

    const { id } = parsedParams.data;

    // 最適化: スカラーサブクエリをLATERAL JOINに変更
    const result = await pool.query(
      `SELECT r.*,
              d.name as dog_name, d.photo_url as dog_photo,
              o.name as owner_name, o.phone as owner_phone,
              hr.room_name, hr.room_size,
              pvi.daycare_data, pvi.service_type as pre_visit_service_type,
              pvi.grooming_data, pvi.hotel_data,
              COALESCE(stats.visit_count, 0) as visit_count,
              next.next_visit_date
       FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       JOIN owners o ON d.owner_id = o.id
       LEFT JOIN hotel_rooms hr ON r.room_id = hr.id
       LEFT JOIN pre_visit_inputs pvi ON r.id = pvi.reservation_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*) as visit_count
         FROM reservations r2
         WHERE r2.dog_id = r.dog_id
           AND r2.reservation_date <= r.reservation_date
           AND r2.status IN ('登園済', '降園済', '予定')
       ) stats ON true
       LEFT JOIN LATERAL (
         SELECT r3.reservation_date as next_visit_date
         FROM reservations r3
         WHERE r3.dog_id = r.dog_id
           AND r3.reservation_date > r.reservation_date
           AND r3.status = '予定'
         ORDER BY r3.reservation_date
         LIMIT 1
       ) next ON true
       WHERE r.id = $1 AND r.store_id = $2`,
      [id, req.storeId]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, '予約が見つかりません');
      return;
    }

    const reservation = result.rows[0];
    reservation.visit_count = Math.max(Number(reservation.visit_count) || 0, 1);
    reservation.next_visit_date = reservation.next_visit_date || null;

    res.json(reservation);
  } catch (error) {
    sendServerError(res, '予約情報の取得に失敗しました', error);
  }
});

// 予約作成
router.post('/', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const parsedBody = parseSchema(reservationCreateSchema, req.body);
    if ('error' in parsedBody) {
      sendBadRequest(res, parsedBody.error);
      return;
    }
    const payload = parsedBody.data;

    const roomId = payload.room_id ?? null;
    if ((payload.service_type || null) === 'hotel') {
      if (!roomId) {
        sendBadRequest(res, 'ホテル予約ではroom_idが必須です');
        return;
      }

      const dateRange = parseDateTimeRange({
        reservationDate: payload.reservation_date,
        reservationTime: payload.reservation_time,
        endDatetime: payload.end_datetime || null,
      });
      if (!dateRange) {
        sendBadRequest(res, 'ホテル予約ではチェックアウト日時が必要です');
        return;
      }

      const roomResult = await pool.query(
        `SELECT id
         FROM hotel_rooms
         WHERE id = $1 AND store_id = $2 AND enabled = TRUE`,
        [roomId, req.storeId]
      );
      if (roomResult.rows.length === 0) {
        sendBadRequest(res, '指定された部屋は利用できません');
        return;
      }

      const conflictId = await findRoomConflict({
        storeId: req.storeId!,
        roomId,
        startAt: dateRange.startAt,
        endAt: dateRange.endAt,
      });
      if (conflictId) {
        sendBadRequest(res, '指定された部屋は同時間帯に予約済みです');
        return;
      }
    }

    const result = await pool.query(
      `INSERT INTO reservations (
        store_id, dog_id, reservation_date, reservation_time, memo, service_type, service_details, end_datetime, room_id
      )
      SELECT $5, d.id, $2, $3, $4, $6, $7, $8, $9
      FROM dogs d
      JOIN owners o ON d.owner_id = o.id
      WHERE d.id = $1 AND o.store_id = $5
      RETURNING *`,
      [
        payload.dog_id,
        payload.reservation_date,
        payload.reservation_time,
        payload.memo,
        req.storeId,
        payload.service_type || null,
        payload.service_details ? JSON.stringify(payload.service_details) : null,
        payload.end_datetime || null,
        (payload.service_type || null) === 'hotel' ? roomId : null,
      ]
    );

    if (result.rows.length === 0) {
      sendForbidden(res);
      return;
    }

    const reservation = result.rows[0];

    const calendarSync = await syncCalendarOnCreate({
      storeId: req.storeId!,
      reservation,
      dogId: payload.dog_id,
    });

    res.status(201).json({
      ...reservation,
      calendar_sync: calendarSync,
    });
  } catch (error) {
    sendServerError(res, '予約の作成に失敗しました', error);
  }
});

// 予約更新
router.put('/:id(\\d+)', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const parsedParams = parseSchema(idParamSchema, req.params);
    if ('error' in parsedParams) {
      sendBadRequest(res, parsedParams.error);
      return;
    }
    const parsedBody = parseSchema(reservationUpdateSchema, req.body);
    if ('error' in parsedBody) {
      sendBadRequest(res, parsedBody.error);
      return;
    }

    const { id } = parsedParams.data;
    const payload = parsedBody.data;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const previousStatusResult = await client.query(
        `SELECT status, checked_in_at, service_type, reservation_date, reservation_time, end_datetime, room_id
         FROM reservations
         WHERE id = $1 AND store_id = $2
         FOR UPDATE`,
        [id, req.storeId]
      );

      if (previousStatusResult.rows.length === 0) {
        await client.query('ROLLBACK');
        sendNotFound(res, '予約が見つかりません');
        return;
      }

      const previousStatus = previousStatusResult.rows[0]?.status;
      const previousCheckedInAt = previousStatusResult.rows[0]?.checked_in_at;
      const currentReservation = previousStatusResult.rows[0];

      const nextServiceType = payload.service_type ?? currentReservation.service_type ?? null;
      const nextReservationDate = payload.reservation_date ?? currentReservation.reservation_date;
      const nextReservationTime = payload.reservation_time ?? currentReservation.reservation_time;
      const nextEndDatetime = payload.end_datetime ?? currentReservation.end_datetime;
      const roomId = payload.room_id === null ? null : payload.room_id;
      const nextRoomId = roomId !== undefined ? roomId : currentReservation.room_id;

      if (nextServiceType === 'hotel') {
        if (!nextRoomId) {
          await client.query('ROLLBACK');
          sendBadRequest(res, 'ホテル予約ではroom_idが必須です');
          return;
        }

        const dateRange = parseDateTimeRange({
          reservationDate: nextReservationDate,
          reservationTime: nextReservationTime,
          endDatetime: nextEndDatetime,
        });
        if (!dateRange) {
          await client.query('ROLLBACK');
          sendBadRequest(res, 'ホテル予約ではチェックアウト日時が必要です');
          return;
        }

        const roomResult = await client.query(
          `SELECT id
           FROM hotel_rooms
           WHERE id = $1 AND store_id = $2 AND enabled = TRUE`,
          [nextRoomId, req.storeId]
        );
        if (roomResult.rows.length === 0) {
          await client.query('ROLLBACK');
          sendBadRequest(res, '指定された部屋は利用できません');
          return;
        }

        const conflictId = await findRoomConflict({
          storeId: req.storeId!,
          roomId: nextRoomId,
          startAt: dateRange.startAt,
          endAt: dateRange.endAt,
          excludeReservationId: Number(id),
          queryable: client,
        });
        if (conflictId) {
          await client.query('ROLLBACK');
          sendBadRequest(res, '指定された部屋は同時間帯に予約済みです');
          return;
        }
      }

      const result = await client.query(
        `UPDATE reservations SET
          reservation_date = COALESCE($1, reservation_date),
          reservation_time = COALESCE($2, reservation_time),
          status = COALESCE($3, status),
          memo = COALESCE($4, memo),
          checked_in_at = CASE WHEN $3 = '登園済' THEN COALESCE(checked_in_at, CURRENT_TIMESTAMP) ELSE checked_in_at END,
          checked_out_at = CASE WHEN $3 = '降園済' THEN COALESCE(checked_out_at, CURRENT_TIMESTAMP) ELSE checked_out_at END,
          cancelled_at = CASE WHEN $3 = 'キャンセル' THEN COALESCE(cancelled_at, CURRENT_TIMESTAMP) ELSE cancelled_at END,
          service_type = COALESCE($7, service_type),
          service_details = COALESCE($8, service_details),
          end_datetime = COALESCE($9, end_datetime),
          room_id = CASE
            WHEN COALESCE($7, service_type) = 'hotel' THEN COALESCE($10, room_id)
            ELSE NULL
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5 AND store_id = $6
        RETURNING *`,
        [
          payload.reservation_date ?? null,
          payload.reservation_time ?? null,
          payload.status ?? null,
          payload.memo ?? null,
          id,
          req.storeId,
          payload.service_type || null,
          payload.service_details ? JSON.stringify(payload.service_details) : null,
          payload.end_datetime || null,
          nextServiceType === 'hotel' ? (nextRoomId ?? null) : null,
        ]
      );

      const reservation = result.rows[0];
      const nextStatus = reservation?.status;

      // ステータスが「登園済」に遷移した場合のみ契約残数を減算
      if (nextStatus === '登園済' && previousStatus !== '登園済' && !previousCheckedInAt) {
        const contractResult = await client.query(
          `SELECT id, contract_type, remaining_sessions
           FROM contracts
           WHERE dog_id = $1
             AND contract_type = 'チケット制'
             AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
             AND remaining_sessions > 0
           ORDER BY created_at DESC
           LIMIT 1`,
          [reservation.dog_id]
        );

        if (contractResult.rows.length > 0) {
          const contract = contractResult.rows[0];
          await client.query(
            `UPDATE contracts
             SET remaining_sessions = remaining_sessions - 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [contract.id]
          );
        }
      }

      await client.query('COMMIT');

      const calendarSync = await syncCalendarOnUpdate({
        storeId: req.storeId!,
        reservationId: id,
        reservation,
        status: payload.status,
      });

      res.json({
        ...reservation,
        calendar_sync: calendarSync,
      });
      return;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    sendServerError(res, '予約の更新に失敗しました', error);
  }
});

// 予約削除
router.delete('/:id(\\d+)', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const parsedParams = parseSchema(idParamSchema, req.params);
    if ('error' in parsedParams) {
      sendBadRequest(res, parsedParams.error);
      return;
    }

    const { id } = parsedParams.data;

    const result = await pool.query(
      `DELETE FROM reservations WHERE id = $1 AND store_id = $2 RETURNING *`,
      [id, req.storeId]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, '予約が見つかりません');
      return;
    }

    const calendarSync = await syncCalendarOnDelete({
      storeId: req.storeId,
      reservationId: id,
    });

    res.json({
      success: true,
      calendar_sync: calendarSync,
    });
  } catch (error) {
    sendServerError(res, '予約の削除に失敗しました', error);
  }
});

export default router;
