import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { cacheControl } from '../middleware/cache.js';
import { requireStoreId, sendNotFound, sendBadRequest, sendServerError, sendSuccess } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

router.get('/', cacheControl(60, 120), async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const result = await pool.query(
      `SELECT * FROM course_masters
       WHERE store_id = $1
       ORDER BY created_at DESC`,
      [req.storeId]
    );

    res.json(result.rows);
  } catch (error) {
    sendServerError(res, 'コースマスタ一覧の取得に失敗しました', error);
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const result = await pool.query(
      `SELECT * FROM course_masters WHERE id = $1 AND store_id = $2`,
      [req.params.id, req.storeId]
    );

    if (result.rows.length === 0) {
      return sendNotFound(res, 'コースが見つかりません');
    }

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'コース情報の取得に失敗しました', error);
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const { course_name, contract_type, sessions, price, valid_days, enabled } = req.body;

    if (!course_name || !contract_type || !price) {
      return sendBadRequest(res, '必須項目が不足しています');
    }

    const result = await pool.query(
      `INSERT INTO course_masters (
        store_id, course_name, contract_type, sessions, price, valid_days, enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        req.storeId,
        course_name,
        contract_type,
        sessions || null,
        price,
        valid_days || null,
        enabled !== undefined ? enabled : true,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'コースの作成に失敗しました', error);
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const { id } = req.params;
    const { course_name, contract_type, sessions, price, valid_days, enabled } = req.body;

    const courseCheck = await pool.query(
      `SELECT id FROM course_masters WHERE id = $1 AND store_id = $2`,
      [id, req.storeId]
    );

    if (courseCheck.rows.length === 0) {
      return sendNotFound(res, 'コースが見つかりません');
    }

    const result = await pool.query(
      `UPDATE course_masters SET
        course_name = COALESCE($1, course_name),
        contract_type = COALESCE($2, contract_type),
        sessions = COALESCE($3, sessions),
        price = COALESCE($4, price),
        valid_days = COALESCE($5, valid_days),
        enabled = COALESCE($6, enabled),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND store_id = $8
      RETURNING *`,
      [course_name, contract_type, sessions, price, valid_days, enabled, id, req.storeId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'コースの更新に失敗しました', error);
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const { id } = req.params;

    const courseCheck = await pool.query(
      `SELECT id FROM course_masters WHERE id = $1 AND store_id = $2`,
      [id, req.storeId]
    );

    if (courseCheck.rows.length === 0) {
      return sendNotFound(res, 'コースが見つかりません');
    }

    await pool.query(`DELETE FROM course_masters WHERE id = $1`, [id]);

    sendSuccess(res);
  } catch (error) {
    sendServerError(res, 'コースの削除に失敗しました', error);
  }
});

export default router;
