import express from 'express';
import pool from '../db/connection.js';
import { authenticate, requireOwner, AuthRequest } from '../middleware/auth.js';
import { requireStoreId, sendBadRequest, sendServerError } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

// 施術メニュー一覧取得
router.get('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const result = await pool.query(
      `SELECT * FROM grooming_menu_masters
       WHERE store_id = $1 AND enabled = TRUE
       ORDER BY display_order, id`,
      [req.storeId]
    );

    res.json(result.rows);
  } catch (error) {
    sendServerError(res, '施術メニューの取得に失敗しました', error);
  }
});

// 施術メニュー詳細取得
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const result = await pool.query(
      `SELECT * FROM grooming_menu_masters WHERE id = $1 AND store_id = $2`,
      [req.params.id, req.storeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '施術メニューが見つかりません' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '施術メニューの取得に失敗しました', error);
  }
});

// 施術メニュー作成
router.post('/', requireOwner, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { menu_name, description, price, duration_minutes, dog_size, display_order } = req.body;

    if (!menu_name) {
      sendBadRequest(res, 'メニュー名は必須です');
      return;
    }

    const result = await pool.query(
      `INSERT INTO grooming_menu_masters (store_id, menu_name, description, price, duration_minutes, dog_size, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.storeId, menu_name, description || null, price || null, duration_minutes || 30, dog_size || '全サイズ', display_order || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '施術メニューの作成に失敗しました', error);
  }
});

// 施術メニュー更新
router.put('/:id', requireOwner, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { menu_name, description, price, duration_minutes, dog_size, display_order, enabled } = req.body;

    const result = await pool.query(
      `UPDATE grooming_menu_masters SET
        menu_name = COALESCE($3, menu_name),
        description = COALESCE($4, description),
        price = COALESCE($5, price),
        duration_minutes = COALESCE($6, duration_minutes),
        dog_size = COALESCE($7, dog_size),
        display_order = COALESCE($8, display_order),
        enabled = COALESCE($9, enabled),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND store_id = $2
       RETURNING *`,
      [req.params.id, req.storeId, menu_name, description, price, duration_minutes, dog_size, display_order, enabled]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '施術メニューが見つかりません' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '施術メニューの更新に失敗しました', error);
  }
});

// 施術メニュー削除（論理削除）
router.delete('/:id', requireOwner, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const result = await pool.query(
      `UPDATE grooming_menu_masters SET enabled = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND store_id = $2
       RETURNING *`,
      [req.params.id, req.storeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '施術メニューが見つかりません' });
    }

    res.json({ success: true });
  } catch (error) {
    sendServerError(res, '施術メニューの削除に失敗しました', error);
  }
});

export default router;
