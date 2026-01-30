import express from 'express';
import pool from '../../db/connection.js';
import {
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
} from '../../utils/response.js';
import { requireOwnerToken } from './common.js';

const router = express.Router();

// 飼い主の犬の最新登園前入力を取得（前回と同じ用）
router.get('/pre-visit-inputs/latest/:dogId', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { dogId } = req.params;

    const dogCheck = await pool.query(
      `SELECT id FROM dogs WHERE id = $1 AND owner_id = $2`,
      [dogId, decoded.ownerId]
    );

    if (dogCheck.rows.length === 0) {
      sendForbidden(res, '権限がありません');
      return;
    }

    const result = await pool.query(
      `SELECT pvi.morning_urination, pvi.morning_defecation,
              pvi.afternoon_urination, pvi.afternoon_defecation,
              pvi.breakfast_status, pvi.health_status, pvi.notes,
              pvi.meal_data
       FROM pre_visit_inputs pvi
       JOIN reservations r ON pvi.reservation_id = r.id
       WHERE r.dog_id = $1
       ORDER BY pvi.submitted_at DESC
       LIMIT 1`,
      [dogId]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, '過去の登園前入力がありません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching latest pre-visit input:', error);
    sendServerError(res, '最新登園前入力の取得に失敗しました', error);
  }
});

// 登園前入力（飼い主が入力）
router.post('/pre-visit-inputs', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const {
      reservation_id,
      morning_urination,
      morning_defecation,
      afternoon_urination,
      afternoon_defecation,
      breakfast_status,
      health_status,
      notes,
      meal_data,
    } = req.body;

    if (!reservation_id) {
      sendBadRequest(res, '予約IDが必要です');
      return;
    }

    // 予約がこの飼い主のものか確認
    const reservationCheck = await pool.query(
      `SELECT r.* FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       WHERE r.id = $1 AND d.owner_id = $2 AND r.store_id = $3`,
      [reservation_id, decoded.ownerId, decoded.storeId]
    );

    if (reservationCheck.rows.length === 0) {
      sendForbidden(res, '権限がありません');
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
          breakfast_status = $5, health_status = $6, notes = $7,
          meal_data = $8, submitted_at = CURRENT_TIMESTAMP
        WHERE reservation_id = $9
        RETURNING *`,
        [
          morning_urination,
          morning_defecation,
          afternoon_urination,
          afternoon_defecation,
          breakfast_status,
          health_status,
          notes,
          meal_data ? JSON.stringify(meal_data) : null,
          reservation_id,
        ]
      );
    } else {
      // 新規作成
      result = await pool.query(
        `INSERT INTO pre_visit_inputs (
          reservation_id, morning_urination, morning_defecation,
          afternoon_urination, afternoon_defecation,
          breakfast_status, health_status, notes, meal_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
          meal_data ? JSON.stringify(meal_data) : null,
        ]
      );
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Pre-visit input save error:', error);
    sendServerError(res, '登園前入力の保存に失敗しました', error);
  }
});

export default router;
