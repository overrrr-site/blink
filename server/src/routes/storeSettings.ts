import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireStoreId, sendBadRequest, sendServerError } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

// 店舗設定取得
router.get('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const result = await pool.query(
      `SELECT * FROM store_settings WHERE store_id = $1`,
      [req.storeId]
    );

    if (result.rows.length === 0) {
      // デフォルト値を返す
      return res.json({
        store_id: req.storeId,
        max_capacity: 15,
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching store settings:', error);
    sendServerError(res, '店舗設定の取得に失敗しました', error);
  }
});

// 店舗設定更新
router.put('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { max_capacity } = req.body;

    if (max_capacity === undefined || max_capacity < 1) {
      sendBadRequest(res, '受入可能頭数は1以上である必要があります');
      return;
    }

    const result = await pool.query(
      `INSERT INTO store_settings (store_id, max_capacity)
       VALUES ($1, $2)
       ON CONFLICT (store_id) DO UPDATE SET
         max_capacity = EXCLUDED.max_capacity,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.storeId, max_capacity]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating store settings:', error);
    sendServerError(res, '店舗設定の更新に失敗しました', error);
  }
});

export default router;
