import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  requireStoreId,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
} from '../utils/response.js';
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
  const monthIndex = Number(monthPart) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return null;
  }

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));

  return { start: toIsoDateString(start), end: toIsoDateString(end) };
}

const router = express.Router();
router.use(authenticate);

// 予約一覧取得（日付指定）
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { date, month } = req.query;

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
    const params: any[] = [req.storeId];

    if (date) {
      query += ` AND r.reservation_date = $2`;
      params.push(date);
    } else if (month) {
      // month は 'yyyy-MM' 形式（例: '2024-01'）
      const range = getMonthDateRange(String(month));
      if (range) {
        query += ` AND r.reservation_date >= $2 AND r.reservation_date < $3`;
        params.push(range.start, range.end);
      }
    }

    query += ` ORDER BY r.reservation_date, r.reservation_time`;

    const result = await pool.query(query, params);
    
    // デバッグ用ログ（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
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
    console.error('Error fetching reservations:', error);
    sendServerError(res, '予約一覧の取得に失敗しました', error);
  }
});

// 予約詳細取得
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*,
              d.name as dog_name, d.photo_url as dog_photo,
              o.name as owner_name, o.phone as owner_phone,
              pvi.morning_urination as pvi_morning_urination,
              pvi.morning_defecation as pvi_morning_defecation,
              pvi.afternoon_urination as pvi_afternoon_urination,
              pvi.afternoon_defecation as pvi_afternoon_defecation,
              pvi.breakfast_status, pvi.health_status, pvi.notes,
              (
                SELECT COUNT(*)
                FROM reservations r2
                WHERE r2.dog_id = r.dog_id
                  AND r2.reservation_date <= r.reservation_date
                  AND r2.status IN ('チェックイン済', '予定')
              ) as visit_count,
              (
                SELECT r3.reservation_date
                FROM reservations r3
                WHERE r3.dog_id = r.dog_id
                  AND r3.reservation_date > r.reservation_date
                  AND r3.status = '予定'
                ORDER BY r3.reservation_date
                LIMIT 1
              ) as next_visit_date
       FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       JOIN owners o ON d.owner_id = o.id
       LEFT JOIN pre_visit_inputs pvi ON r.id = pvi.reservation_id
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
    console.error('Error fetching reservation:', error);
    sendServerError(res, '予約情報の取得に失敗しました', error);
  }
});

// 予約作成
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { dog_id, reservation_date, reservation_time, memo, base_price } = req.body;

    if (!dog_id || !reservation_date || !reservation_time) {
      sendBadRequest(res, '必須項目が不足しています');
      return;
    }

    const result = await pool.query(
      `INSERT INTO reservations (
        store_id, dog_id, reservation_date, reservation_time, memo
      )
      SELECT $5, d.id, $2, $3, $4
      FROM dogs d
      JOIN owners o ON d.owner_id = o.id
      WHERE d.id = $1 AND o.store_id = $5
      RETURNING *`,
      [dog_id, reservation_date, reservation_time, memo, req.storeId]
    );

    if (result.rows.length === 0) {
      sendForbidden(res);
      return;
    }

    const reservation = result.rows[0];

    // Googleカレンダーに同期（エラーが発生しても予約は作成済み）
    await syncCalendarOnCreate({
      storeId: req.storeId!,
      reservation,
      dogId: dog_id,
    });

    res.status(201).json(reservation);
  } catch (error) {
    console.error('Error creating reservation:', error);
    sendServerError(res, '予約の作成に失敗しました', error);
  }
});

// 予約更新
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { reservation_date, reservation_time, status, memo } = req.body;

    const result = await pool.query(
      `UPDATE reservations SET
        reservation_date = COALESCE($1, reservation_date),
        reservation_time = COALESCE($2, reservation_time),
        status = COALESCE($3, status),
        memo = COALESCE($4, memo),
        checked_in_at = CASE WHEN $3 = 'チェックイン済' THEN COALESCE(checked_in_at, CURRENT_TIMESTAMP) ELSE checked_in_at END,
        cancelled_at = CASE WHEN $3 = 'キャンセル' THEN COALESCE(cancelled_at, CURRENT_TIMESTAMP) ELSE cancelled_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND store_id = $6
      RETURNING *`,
      [reservation_date, reservation_time, status, memo, id, req.storeId]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, '予約が見つかりません');
      return;
    }

    const reservation = result.rows[0];

    // ステータスが「チェックイン済」に変更された場合、契約残数を減算
    if (status === 'チェックイン済') {
      const previousStatus = await pool.query(
        `SELECT status FROM reservations WHERE id = $1`,
        [id]
      );
      
      // 既にチェックイン済みでない場合のみ減算（重複減算を防ぐ）
      if (previousStatus.rows[0]?.status !== 'チェックイン済') {
        const contractResult = await pool.query(
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
          await pool.query(
            `UPDATE contracts 
             SET remaining_sessions = remaining_sessions - 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [contract.id]
          );
        }
      }
    }

    // Googleカレンダーに同期（エラーが発生しても予約は更新済み）
    await syncCalendarOnUpdate({
      storeId: req.storeId!,
      reservationId: parseInt(id, 10),
      reservation,
      status,
    });

    res.json(reservation);
  } catch (error) {
    console.error('Error updating reservation:', error);
    sendServerError(res, '予約の更新に失敗しました', error);
  }
});

// 予約削除
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (!requireStoreId(req, res)) {
      return;
    }

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
    console.error('Error deleting reservation:', error);
    sendServerError(res, '予約の削除に失敗しました', error);
  }
});

export default router;
