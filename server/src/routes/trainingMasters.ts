import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { cacheControl } from '../middleware/cache.js';
import { requireStoreId, sendNotFound, sendBadRequest, sendServerError, sendSuccess } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

// カテゴリの表示順序
const CATEGORY_ORDER = [
  '基本トレーニング',
  'コマンドトレーニング',
  'トイレトレーニング',
  '社会化トレーニング',
  '問題行動対策',
];

router.get('/', cacheControl(60, 300), async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const result = await pool.query(
      `SELECT * FROM training_item_masters
       WHERE store_id = $1 AND enabled = TRUE
       ORDER BY display_order, id`,
      [req.storeId]
    );

    // Group by category
    const grouped: Record<string, unknown[]> = {};
    for (const item of result.rows) {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    }

    // カテゴリを定義された順序でソート
    const orderedResult: Record<string, unknown[]> = {};
    for (const category of CATEGORY_ORDER) {
      if (grouped[category]) {
        orderedResult[category] = grouped[category];
      }
    }
    // 定義されていないカテゴリがあれば末尾に追加
    for (const category of Object.keys(grouped)) {
      if (!CATEGORY_ORDER.includes(category)) {
        orderedResult[category] = grouped[category];
      }
    }

    res.json(orderedResult);
  } catch (error) {
    sendServerError(res, 'トレーニング項目マスタ一覧の取得に失敗しました', error);
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM training_item_masters WHERE id = $1 AND store_id = $2`,
      [id, req.storeId]
    );

    if (result.rows.length === 0) {
      return sendNotFound(res, 'トレーニング項目が見つかりません');
    }

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'トレーニング項目の取得に失敗しました', error);
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const { category, item_key, item_label, display_order, enabled, evaluation_type, has_note } = req.body;

    if (!category || !item_key || !item_label) {
      return sendBadRequest(res, '必須項目が不足しています');
    }

    const existing = await pool.query(
      `SELECT id FROM training_item_masters WHERE store_id = $1 AND item_key = $2`,
      [req.storeId, item_key]
    );

    if (existing.rows.length > 0) {
      return sendBadRequest(res, 'この項目キーは既に登録されています');
    }

    const result = await pool.query(
      `INSERT INTO training_item_masters (
        store_id, category, item_key, item_label, display_order, enabled, evaluation_type, has_note
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        req.storeId,
        category,
        item_key,
        item_label,
        display_order || 0,
        enabled !== undefined ? enabled : true,
        evaluation_type || 'simple',
        has_note !== undefined ? has_note : false,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'トレーニング項目の作成に失敗しました', error);
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const { id } = req.params;
    const { category, item_key, item_label, display_order, enabled, evaluation_type, has_note } = req.body;

    const itemCheck = await pool.query(
      `SELECT id FROM training_item_masters WHERE id = $1 AND store_id = $2`,
      [id, req.storeId]
    );

    if (itemCheck.rows.length === 0) {
      return sendNotFound(res, 'トレーニング項目が見つかりません');
    }

    if (item_key) {
      const existing = await pool.query(
        `SELECT id FROM training_item_masters
         WHERE store_id = $1 AND item_key = $2 AND id != $3`,
        [req.storeId, item_key, id]
      );

      if (existing.rows.length > 0) {
        return sendBadRequest(res, 'この項目キーは既に登録されています');
      }
    }

    const result = await pool.query(
      `UPDATE training_item_masters SET
        category = COALESCE($1, category),
        item_key = COALESCE($2, item_key),
        item_label = COALESCE($3, item_label),
        display_order = COALESCE($4, display_order),
        enabled = COALESCE($5, enabled),
        evaluation_type = COALESCE($6, evaluation_type),
        has_note = COALESCE($7, has_note),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 AND store_id = $9
      RETURNING *`,
      [category, item_key, item_label, display_order, enabled, evaluation_type, has_note, id, req.storeId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'トレーニング項目の更新に失敗しました', error);
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const { id } = req.params;

    const itemCheck = await pool.query(
      `SELECT id FROM training_item_masters WHERE id = $1 AND store_id = $2`,
      [id, req.storeId]
    );

    if (itemCheck.rows.length === 0) {
      return sendNotFound(res, 'トレーニング項目が見つかりません');
    }

    await pool.query(`DELETE FROM training_item_masters WHERE id = $1`, [id]);

    sendSuccess(res);
  } catch (error) {
    sendServerError(res, 'トレーニング項目の削除に失敗しました', error);
  }
});

export default router;
