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

const router = express.Router();
router.use(authenticate);

// 登園前入力取得
router.get('/reservation/:reservationId', async (req: AuthRequest, res) => {
  try {
    const { reservationId } = req.params;

    if (!requireStoreId(req, res)) {
      return;
    }

    const result = await pool.query(
      `SELECT pvi.*, r.store_id
       FROM pre_visit_inputs pvi
       JOIN reservations r ON pvi.reservation_id = r.id
       WHERE pvi.reservation_id = $1 AND r.store_id = $2`,
      [reservationId, req.storeId]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, '登園前入力が見つかりません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching pre-visit input:', error);
    sendServerError(res, '登園前入力の取得に失敗しました', error);
  }
});

// 登園前入力作成/更新
router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      reservation_id,
      morning_urination,
      morning_defecation,
      afternoon_urination,
      afternoon_defecation,
      breakfast_status,
      health_status,
      notes,
    } = req.body;

    if (!requireStoreId(req, res)) {
      return;
    }

    if (!reservation_id) {
      sendBadRequest(res, '予約IDが必要です');
      return;
    }

    // 予約のstore_idを確認
    const reservationCheck = await pool.query(
      `SELECT store_id FROM reservations WHERE id = $1 AND store_id = $2`,
      [reservation_id, req.storeId]
    );

    if (reservationCheck.rows.length === 0) {
      sendForbidden(res);
      return;
    }

    // 既存の入力があるか確認
    const existing = await pool.query(
      `SELECT id FROM pre_visit_inputs WHERE reservation_id = $1`,
      [reservation_id]
    );

    let result;
    if (existing.rows.length > 0) {
      // 更新
      result = await pool.query(
        `UPDATE pre_visit_inputs SET
          morning_urination = $1, morning_defecation = $2,
          afternoon_urination = $3, afternoon_defecation = $4,
          breakfast_status = $5, health_status = $6, notes = $7
        WHERE reservation_id = $8
        RETURNING *`,
        [
          morning_urination,
          morning_defecation,
          afternoon_urination,
          afternoon_defecation,
          breakfast_status,
          health_status,
          notes,
          reservation_id,
        ]
      );
    } else {
      // 新規作成
      result = await pool.query(
        `INSERT INTO pre_visit_inputs (
          reservation_id, morning_urination, morning_defecation,
          afternoon_urination, afternoon_defecation,
          breakfast_status, health_status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          reservation_id,
          morning_urination,
          morning_defecation,
          afternoon_urination,
          afternoon_defecation,
          breakfast_status,
          health_status,
          notes,
        ]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating/updating pre-visit input:', error);
    sendServerError(res, '登園前入力の保存に失敗しました', error);
  }
});

export default router;
