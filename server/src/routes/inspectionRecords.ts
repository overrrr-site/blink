import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  sendBadRequest,
  sendNotFound,
  sendServerError,
} from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

// 点検記録一覧取得（月別）
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { year, month } = req.query;

    let query = `
      SELECT *
      FROM inspection_records
      WHERE store_id = $1
    `;
    const params: (string | number)[] = [req.storeId];

    if (year && month) {
      query += ` AND EXTRACT(YEAR FROM inspection_date) = $2 AND EXTRACT(MONTH FROM inspection_date) = $3`;
      params.push(parseInt(year as string), parseInt(month as string));
    }

    query += ` ORDER BY inspection_date DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    sendServerError(res, '点検記録一覧の取得に失敗しました', error);
  }
});

// 特定日の点検記録取得
router.get('/:date', async (req: AuthRequest, res) => {
  try {
    const { date } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM inspection_records
       WHERE store_id = $1 AND inspection_date = $2`,
      [req.storeId, date]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, '点検記録が見つかりません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '点検記録の取得に失敗しました', error);
  }
});

// 点検記録作成
router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      inspection_date,
      inspection_time,
      cleaning_done,
      disinfection_done,
      maintenance_done,
      animal_count_abnormal,
      animal_state_abnormal,
      inspector_name,
      notes,
    } = req.body;

    if (!inspection_date) {
      sendBadRequest(res, '点検日は必須です');
      return;
    }

    // 既存の記録をチェック
    const existing = await pool.query(
      `SELECT id FROM inspection_records
       WHERE store_id = $1 AND inspection_date = $2`,
      [req.storeId, inspection_date]
    );

    if (existing.rows.length > 0) {
      sendBadRequest(res, 'この日の点検記録は既に存在します。更新APIを使用してください');
      return;
    }

    const result = await pool.query(
      `INSERT INTO inspection_records (
        store_id, inspection_date, inspection_time,
        cleaning_done, disinfection_done, maintenance_done,
        animal_count_abnormal, animal_state_abnormal,
        inspector_name, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        req.storeId,
        inspection_date,
        inspection_time || null,
        cleaning_done || false,
        disinfection_done || false,
        maintenance_done || false,
        animal_count_abnormal || false,
        animal_state_abnormal || false,
        inspector_name || null,
        notes || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '点検記録の作成に失敗しました', error);
  }
});

// 点検記録更新
router.put('/:date', async (req: AuthRequest, res) => {
  try {
    const { date } = req.params;
    const {
      inspection_time,
      cleaning_done,
      disinfection_done,
      maintenance_done,
      animal_count_abnormal,
      animal_state_abnormal,
      inspector_name,
      notes,
    } = req.body;

    // 既存の記録をチェック
    const existing = await pool.query(
      `SELECT id FROM inspection_records
       WHERE store_id = $1 AND inspection_date = $2`,
      [req.storeId, date]
    );

    if (existing.rows.length === 0) {
      sendNotFound(res, '点検記録が見つかりません');
      return;
    }

    const result = await pool.query(
      `UPDATE inspection_records
       SET inspection_time = COALESCE($3, inspection_time),
           cleaning_done = COALESCE($4, cleaning_done),
           disinfection_done = COALESCE($5, disinfection_done),
           maintenance_done = COALESCE($6, maintenance_done),
           animal_count_abnormal = COALESCE($7, animal_count_abnormal),
           animal_state_abnormal = COALESCE($8, animal_state_abnormal),
           inspector_name = COALESCE($9, inspector_name),
           notes = COALESCE($10, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE store_id = $1 AND inspection_date = $2
       RETURNING *`,
      [
        req.storeId,
        date,
        inspection_time,
        cleaning_done,
        disinfection_done,
        maintenance_done,
        animal_count_abnormal,
        animal_state_abnormal,
        inspector_name,
        notes,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '点検記録の更新に失敗しました', error);
  }
});

// エクスポート用データ取得（月別）
router.get('/export/:year/:month', async (req: AuthRequest, res) => {
  try {
    const { year, month } = req.params;

    // 店舗情報を取得
    const storeResult = await pool.query(
      `SELECT name, address, business_types FROM stores WHERE id = $1`,
      [req.storeId]
    );

    if (storeResult.rows.length === 0) {
      sendNotFound(res, '店舗情報が見つかりません');
      return;
    }

    // 点検記録を取得
    const recordsResult = await pool.query(
      `SELECT *
       FROM inspection_records
       WHERE store_id = $1
         AND EXTRACT(YEAR FROM inspection_date) = $2
         AND EXTRACT(MONTH FROM inspection_date) = $3
       ORDER BY inspection_date ASC`,
      [req.storeId, parseInt(year), parseInt(month)]
    );

    res.json({
      store: storeResult.rows[0],
      records: recordsResult.rows,
      year: parseInt(year),
      month: parseInt(month),
    });
  } catch (error) {
    sendServerError(res, 'エクスポートデータの取得に失敗しました', error);
  }
});

export default router;
