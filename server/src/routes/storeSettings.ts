import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { cacheControl } from '../middleware/cache.js';
import { requireStoreId, sendBadRequest, sendServerError } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

// 店舗設定取得
router.get('/', cacheControl(30, 60), async (req: AuthRequest, res) => {
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
        ai_assistant_enabled: true,
        ai_store_data_contribution: true,
        ai_service_improvement: false,
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '店舗設定の取得に失敗しました', error);
  }
});

// 店舗設定更新
router.put('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const {
      max_capacity,
      ai_assistant_enabled,
      ai_store_data_contribution,
      ai_service_improvement,
    } = req.body;

    if (max_capacity !== undefined && max_capacity < 1) {
      sendBadRequest(res, '受入可能頭数は1以上である必要があります');
      return;
    }

    const result = await pool.query(
      `INSERT INTO store_settings (store_id, max_capacity, ai_assistant_enabled, ai_store_data_contribution, ai_service_improvement)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (store_id) DO UPDATE SET
         max_capacity = COALESCE(EXCLUDED.max_capacity, store_settings.max_capacity),
         ai_assistant_enabled = COALESCE(EXCLUDED.ai_assistant_enabled, store_settings.ai_assistant_enabled),
         ai_store_data_contribution = COALESCE(EXCLUDED.ai_store_data_contribution, store_settings.ai_store_data_contribution),
         ai_service_improvement = COALESCE(EXCLUDED.ai_service_improvement, store_settings.ai_service_improvement),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        req.storeId,
        max_capacity ?? null,
        ai_assistant_enabled ?? null,
        ai_store_data_contribution ?? null,
        ai_service_improvement ?? null,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '店舗設定の更新に失敗しました', error);
  }
});

export default router;
