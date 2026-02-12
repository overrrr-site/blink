import express from 'express';
import pool from '../../db/connection.js';
import {
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
} from '../../utils/response.js';
import { parseBusinessTypeInput } from '../../utils/businessTypes.js';
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

    const { service_type } = req.query as { service_type?: string };
    const { value: serviceType, error: serviceTypeError } = parseBusinessTypeInput(service_type, 'service_type');
    if (serviceTypeError) {
      sendBadRequest(res, serviceTypeError);
      return;
    }

    const result = await pool.query(
      `SELECT pvi.morning_urination, pvi.morning_defecation,
              pvi.afternoon_urination, pvi.afternoon_defecation,
              pvi.breakfast_status, pvi.health_status, pvi.notes,
              pvi.meal_data, pvi.service_type, pvi.grooming_data, pvi.hotel_data
       FROM pre_visit_inputs pvi
       JOIN reservations r ON pvi.reservation_id = r.id
       WHERE r.dog_id = $1
         AND ($2::text IS NULL OR COALESCE(pvi.service_type, r.service_type, 'daycare') = $2)
       ORDER BY pvi.submitted_at DESC
       LIMIT 1`,
      [dogId, serviceType ?? null]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, '過去の登園前入力がありません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
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
      service_type,
      morning_urination,
      morning_defecation,
      afternoon_urination,
      afternoon_defecation,
      breakfast_status,
      health_status,
      notes,
      meal_data,
      grooming_data,
      hotel_data,
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

    const { value: parsedServiceType, error: serviceTypeError } = parseBusinessTypeInput(service_type, 'service_type');
    if (serviceTypeError) {
      sendBadRequest(res, serviceTypeError);
      return;
    }
    const reservationServiceType = reservationCheck.rows[0]?.service_type;
    const finalServiceType = parsedServiceType ?? reservationServiceType ?? 'daycare';

    const mealDataJson = meal_data ? JSON.stringify(meal_data) : null;
    const groomingDataJson = grooming_data ? JSON.stringify(grooming_data) : null;
    const hotelDataJson = hotel_data ? JSON.stringify(hotel_data) : null;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO pre_visit_inputs (
          reservation_id, morning_urination, morning_defecation,
          afternoon_urination, afternoon_defecation,
          breakfast_status, health_status, notes, meal_data,
          service_type, grooming_data, hotel_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (reservation_id) DO UPDATE SET
          morning_urination = EXCLUDED.morning_urination,
          morning_defecation = EXCLUDED.morning_defecation,
          afternoon_urination = EXCLUDED.afternoon_urination,
          afternoon_defecation = EXCLUDED.afternoon_defecation,
          breakfast_status = EXCLUDED.breakfast_status,
          health_status = EXCLUDED.health_status,
          notes = EXCLUDED.notes,
          meal_data = EXCLUDED.meal_data,
          service_type = EXCLUDED.service_type,
          grooming_data = EXCLUDED.grooming_data,
          hotel_data = EXCLUDED.hotel_data,
          submitted_at = CURRENT_TIMESTAMP
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
          mealDataJson,
          finalServiceType,
          groomingDataJson,
          hotelDataJson,
        ]
      );

      await client.query(
        `UPDATE reservations
         SET service_type = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [finalServiceType, reservation_id]
      );

      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    sendServerError(res, '登園前入力の保存に失敗しました', error);
  }
});

export default router;
