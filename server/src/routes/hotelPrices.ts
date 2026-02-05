import express from 'express';
import pool from '../db/connection.js';
import { authenticate, requireOwner, AuthRequest } from '../middleware/auth.js';
import { requireStoreId, sendBadRequest, sendServerError } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

// ホテル料金一覧取得
router.get('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const result = await pool.query(
      `SELECT * FROM hotel_price_masters
       WHERE store_id = $1 AND enabled = TRUE
       ORDER BY
         CASE dog_size
           WHEN '小型' THEN 1
           WHEN '中型' THEN 2
           WHEN '大型' THEN 3
         END`,
      [req.storeId]
    );

    res.json(result.rows);
  } catch (error) {
    sendServerError(res, 'ホテル料金の取得に失敗しました', error);
  }
});

// ホテル料金更新（UPSERT）
router.put('/', requireOwner, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { prices } = req.body;

    if (!Array.isArray(prices)) {
      sendBadRequest(res, '料金データの形式が不正です');
      return;
    }

    const results = [];
    for (const item of prices) {
      const { dog_size, price_per_night, description } = item;

      if (!dog_size || !['小型', '中型', '大型'].includes(dog_size)) {
        continue;
      }

      const result = await pool.query(
        `INSERT INTO hotel_price_masters (store_id, dog_size, price_per_night, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (store_id, dog_size) DO UPDATE SET
           price_per_night = EXCLUDED.price_per_night,
           description = EXCLUDED.description,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [req.storeId, dog_size, price_per_night || 0, description || null]
      );

      results.push(result.rows[0]);
    }

    res.json(results);
  } catch (error) {
    sendServerError(res, 'ホテル料金の更新に失敗しました', error);
  }
});

export default router;
