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
      // これを 'yyyy-MM-01' に変換して日付として扱う
      const monthDate = `${month}-01`;
      query += ` AND DATE_TRUNC('month', r.reservation_date) = DATE_TRUNC('month', $2::date)`;
      params.push(monthDate);
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
              pvi.breakfast_status, pvi.health_status, pvi.notes
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

    // 登園回数を取得（この予約日以前のチェックイン済み予約数）
    const visitCountResult = await pool.query(
      `SELECT COUNT(*) as visit_count
       FROM reservations
       WHERE dog_id = $1
         AND reservation_date <= $2
         AND status IN ('チェックイン済', '予定')`,
      [reservation.dog_id, reservation.reservation_date]
    );
    reservation.visit_count = parseInt(visitCountResult.rows[0].visit_count) || 1;

    // 次回登園日を取得
    const nextVisitResult = await pool.query(
      `SELECT reservation_date
       FROM reservations
       WHERE dog_id = $1
         AND reservation_date > $2
         AND status = '予定'
       ORDER BY reservation_date
       LIMIT 1`,
      [reservation.dog_id, reservation.reservation_date]
    );
    reservation.next_visit_date = nextVisitResult.rows[0]?.reservation_date || null;

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

    // 犬のstore_idとowner_idを確認
    const dogCheck = await pool.query(
      `SELECT o.store_id, o.id as owner_id FROM dogs d
       JOIN owners o ON d.owner_id = o.id
       WHERE d.id = $1 AND o.store_id = $2`,
      [dog_id, req.storeId]
    );

    if (dogCheck.rows.length === 0) {
      sendForbidden(res);
      return;
    }

    const result = await pool.query(
      `INSERT INTO reservations (
        store_id, dog_id, reservation_date, reservation_time, memo
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [req.storeId, dog_id, reservation_date, reservation_time, memo]
    );

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
