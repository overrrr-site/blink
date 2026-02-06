import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { cacheControl } from '../middleware/cache.js';
import {
  requireStoreId,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
} from '../utils/response.js';
import { isNonEmptyString, isNumberLike } from '../utils/validation.js';
import { appendBusinessTypeFilter, parseBusinessTypeInput } from '../utils/businessTypes.js';
import {
  syncCalendarOnCreate,
  syncCalendarOnUpdate,
  syncCalendarOnDelete,
} from '../services/reservationsService.js';

function toIsoDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonthDateRange(month: string): { start: string; end: string } | null {
  const [yearPart, monthPart] = month.split('-');
  const year = Number(yearPart);
  const monthNumber = Number(monthPart);

  if (!Number.isFinite(year) || !Number.isFinite(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return null;
  }

  const monthIndex = monthNumber - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));

  return { start: toIsoDateString(start), end: toIsoDateString(end) };
}

const router = express.Router();
router.use(authenticate);

// 予約一覧取得（日付指定）
router.get('/', cacheControl(), async function(req: AuthRequest, res): Promise<void> {
  try {
    const { date, month, service_type } = req.query;

    // storeIdがnullの場合はエラー
    if (!requireStoreId(req, res)) {
      return;
    }

    let query = `
      SELECT r.*,
             d.name as dog_name, d.photo_url as dog_photo,
             o.name as owner_name
      FROM reservations r
      JOIN dogs d ON r.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
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

    const { value: serviceType, error: serviceTypeError } = parseBusinessTypeInput(service_type, 'service_type');
    if (serviceTypeError) {
      sendBadRequest(res, serviceTypeError);
      return;
    }

    // 業種フィルタ
    query += appendBusinessTypeFilter(params, 'r.service_type', serviceType);

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
          dog: r.dog_name
        }))
      });
    }
    
    res.json(result.rows);
  } catch (error) {
    sendServerError(res, '予約一覧の取得に失敗しました', error);
  }
});

// 予約詳細取得
router.get('/:id', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { id } = req.params;

    // 最適化: スカラーサブクエリをLATERAL JOINに変更
    const result = await pool.query(
      `SELECT r.*,
              d.name as dog_name, d.photo_url as dog_photo,
              o.name as owner_name, o.phone as owner_phone,
              pvi.morning_urination, pvi.morning_defecation,
              pvi.afternoon_urination, pvi.afternoon_defecation,
              pvi.breakfast_status, pvi.health_status, pvi.notes as pre_visit_notes,
              pvi.meal_data,
              COALESCE(stats.visit_count, 0) as visit_count,
              next.next_visit_date
       FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       JOIN owners o ON d.owner_id = o.id
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

    const { dog_id, reservation_date, reservation_time, memo, base_price, service_type, service_details, end_datetime } = req.body;

    if (!isNumberLike(dog_id) || !isNonEmptyString(reservation_date) || !isNonEmptyString(reservation_time)) {
      sendBadRequest(res, '必須項目が不足しています');
      return;
    }

    const { value: serviceType, error: serviceTypeError } = parseBusinessTypeInput(service_type, 'service_type');
    if (serviceTypeError) {
      sendBadRequest(res, serviceTypeError);
      return;
    }

    const result = await pool.query(
      `INSERT INTO reservations (
        store_id, dog_id, reservation_date, reservation_time, memo, service_type, service_details, end_datetime
      )
      SELECT $5, d.id, $2, $3, $4, $6, $7, $8
      FROM dogs d
      JOIN owners o ON d.owner_id = o.id
      WHERE d.id = $1 AND o.store_id = $5
      RETURNING *`,
      [dog_id, reservation_date, reservation_time, memo, req.storeId, serviceType || null, service_details ? JSON.stringify(service_details) : null, end_datetime || null]
    );

    if (result.rows.length === 0) {
      sendForbidden(res);
      return;
    }

    const reservation = result.rows[0];

    // Googleカレンダーに同期（非ブロッキング: レスポンスを先に返す）
    syncCalendarOnCreate({
      storeId: req.storeId!,
      reservation,
      dogId: dog_id,
    }).catch((err) => console.error('Calendar sync error (create):', err));

    res.status(201).json(reservation);
  } catch (error) {
    sendServerError(res, '予約の作成に失敗しました', error);
  }
});

// 予約更新
router.put('/:id', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { id } = req.params;
    const { reservation_date, reservation_time, status, memo, service_type, service_details, end_datetime } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const previousStatusResult = await client.query(
        `SELECT status, checked_in_at
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

      const { value: serviceType, error: serviceTypeError } = parseBusinessTypeInput(service_type, 'service_type');
      if (serviceTypeError) {
        await client.query('ROLLBACK');
        sendBadRequest(res, serviceTypeError);
        return;
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
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5 AND store_id = $6
        RETURNING *`,
        [reservation_date, reservation_time, status, memo, id, req.storeId, serviceType || null, service_details ? JSON.stringify(service_details) : null, end_datetime || null]
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

      // Googleカレンダーに同期（非ブロッキング: レスポンスを先に返す）
      syncCalendarOnUpdate({
        storeId: req.storeId!,
        reservationId: parseInt(id, 10),
        reservation,
        status,
      }).catch((err) => console.error('Calendar sync error (update):', err));

      res.json(reservation);
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

// 予約をiCS形式でエクスポート
router.get('/export.ics', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { month, date } = req.query;

    // 店舗情報を取得
    const storeResult = await pool.query(
      `SELECT name, address FROM stores WHERE id = $1`,
      [req.storeId]
    );
    const store = storeResult.rows[0] || { name: '店舗', address: '' };

    let query = `
      SELECT r.*, d.name as dog_name, o.name as owner_name
      FROM reservations r
      JOIN dogs d ON r.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      WHERE r.store_id = $1 AND r.status != 'キャンセル'
    `;
    const params: (string | number)[] =[req.storeId];

    if (date) {
      query += ` AND r.reservation_date = $2`;
      params.push(String(date));
    } else if (month) {
      const range = getMonthDateRange(String(month));
      if (range) {
        query += ` AND r.reservation_date >= $2 AND r.reservation_date < $3`;
        params.push(range.start, range.end);
      }
    }

    query += ` ORDER BY r.reservation_date, r.reservation_time`;

    const result = await pool.query(query, params);

    // iCS形式に変換
    const icsLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PetCarte//Admin//JP',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${store.name} 予約一覧`,
    ];

    for (const reservation of result.rows) {
      const dateStr = reservation.reservation_date.toISOString().split('T')[0].replace(/-/g, '');
      const startTime = (reservation.reservation_time || '09:00').replace(':', '') + '00';
      const endTime = (reservation.pickup_time || '17:00').replace(':', '') + '00';

      const uid = `reservation-${reservation.id}@petcarte`;
      const summary = `${reservation.dog_name}（${reservation.owner_name}様）`;
      const description = [
        `予約ID: ${reservation.id}`,
        `犬名: ${reservation.dog_name}`,
        `飼い主: ${reservation.owner_name}`,
        `ステータス: ${reservation.status || '予定'}`,
        reservation.memo ? `メモ: ${reservation.memo}` : '',
      ].filter(Boolean).join('\\n');

      icsLines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTSTART;TZID=Asia/Tokyo:${dateStr}T${startTime}`,
        `DTEND;TZID=Asia/Tokyo:${dateStr}T${endTime}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        store.address ? `LOCATION:${store.address}` : '',
        'END:VEVENT'
      );
    }

    icsLines.push('END:VCALENDAR');
    const icsContent = icsLines.filter(Boolean).join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reservations.ics"');
    res.send(icsContent);
  } catch (error) {
    sendServerError(res, 'カレンダーエクスポートに失敗しました', error);
  }
});

// 予約削除
router.delete('/:id', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { id } = req.params;

    // Googleカレンダーから削除（エラーが発生しても予約削除は続行）
    await syncCalendarOnDelete({ storeId: req.storeId, reservationId: parseInt(id, 10) });

    const result = await pool.query(
      `DELETE FROM reservations WHERE id = $1 AND store_id = $2 RETURNING *`,
      [id, req.storeId]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, '予約が見つかりません');
      return;
    }

    res.json({ success: true });
  } catch (error) {
    sendServerError(res, '予約の削除に失敗しました', error);
  }
});

export default router;
