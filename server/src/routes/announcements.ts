import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireStoreId, sendServerError, sendBadRequest, sendNotFound } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

// お知らせ一覧取得
router.get('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const result = await pool.query(
      `SELECT a.*, s.name as created_by_name
       FROM store_announcements a
       LEFT JOIN staff s ON a.created_by = s.id
       WHERE a.store_id = $1
       ORDER BY a.created_at DESC`,
      [req.storeId]
    );

    res.json(result.rows);
  } catch (error) {
    sendServerError(res, 'お知らせの取得に失敗しました', error);
  }
});

// お知らせ詳細取得
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const { id } = req.params;
    const result = await pool.query(
      `SELECT a.*, s.name as created_by_name
       FROM store_announcements a
       LEFT JOIN staff s ON a.created_by = s.id
       WHERE a.id = $1 AND a.store_id = $2`,
      [id, req.storeId]
    );

    if (result.rows.length === 0) {
      return sendNotFound(res, 'お知らせが見つかりません');
    }

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'お知らせの取得に失敗しました', error);
  }
});

// お知らせ新規作成
router.post('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const { title, content, image_url, is_important, published_at, expires_at } = req.body;

    if (!title || !content) {
      return sendBadRequest(res, 'タイトルと本文は必須です');
    }

    const result = await pool.query(
      `INSERT INTO store_announcements (
        store_id, title, content, image_url, is_important, published_at, expires_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        req.storeId,
        title,
        content,
        image_url || null,
        is_important || false,
        published_at || null,
        expires_at || null,
        req.userId || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'お知らせの作成に失敗しました', error);
  }
});

// お知らせ更新
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const { id } = req.params;
    const { title, content, image_url, is_important, published_at, expires_at } = req.body;

    if (!title || !content) {
      return sendBadRequest(res, 'タイトルと本文は必須です');
    }

    // 存在確認
    const existing = await pool.query(
      `SELECT id FROM store_announcements WHERE id = $1 AND store_id = $2`,
      [id, req.storeId]
    );

    if (existing.rows.length === 0) {
      return sendNotFound(res, 'お知らせが見つかりません');
    }

    const result = await pool.query(
      `UPDATE store_announcements
       SET title = $1, content = $2, image_url = $3, is_important = $4,
           published_at = $5, expires_at = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND store_id = $8
       RETURNING *`,
      [title, content, image_url || null, is_important || false, published_at || null, expires_at || null, id, req.storeId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'お知らせの更新に失敗しました', error);
  }
});

// お知らせ削除
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM store_announcements WHERE id = $1 AND store_id = $2 RETURNING id`,
      [id, req.storeId]
    );

    if (result.rows.length === 0) {
      return sendNotFound(res, 'お知らせが見つかりません');
    }

    res.json({ message: 'お知らせを削除しました' });
  } catch (error) {
    sendServerError(res, 'お知らせの削除に失敗しました', error);
  }
});

// お知らせ件数取得（ダッシュボード用）
router.get('/stats/count', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const now = new Date().toISOString();

    // 公開中のお知らせ件数
    const publishedResult = await pool.query(
      `SELECT COUNT(*) as count FROM store_announcements
       WHERE store_id = $1
         AND published_at IS NOT NULL
         AND published_at <= $2
         AND (expires_at IS NULL OR expires_at > $2)`,
      [req.storeId, now]
    );

    // 下書き（未公開）のお知らせ件数
    const draftResult = await pool.query(
      `SELECT COUNT(*) as count FROM store_announcements
       WHERE store_id = $1
         AND (published_at IS NULL OR published_at > $2)`,
      [req.storeId, now]
    );

    res.json({
      published: parseInt(publishedResult.rows[0].count),
      draft: parseInt(draftResult.rows[0].count),
    });
  } catch (error) {
    sendServerError(res, 'お知らせ件数の取得に失敗しました', error);
  }
});

export default router;
