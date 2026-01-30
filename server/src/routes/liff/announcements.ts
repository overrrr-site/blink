import express from 'express';
import pool from '../../db/connection.js';
import { sendNotFound, sendServerError } from '../../utils/response.js';
import { requireOwnerToken } from './common.js';

const router = express.Router();

// 公開中のお知らせ一覧取得
router.get('/announcements', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const now = new Date().toISOString();

    const result = await pool.query(
      `SELECT id, title, content, image_url, is_important, published_at, created_at
       FROM store_announcements
       WHERE store_id = $1
         AND published_at IS NOT NULL
         AND published_at <= $2
         AND (expires_at IS NULL OR expires_at > $2)
       ORDER BY is_important DESC, published_at DESC`,
      [decoded.storeId, now]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Announcements fetch error:', error);
    sendServerError(res, 'お知らせの取得に失敗しました', error);
  }
});

// お知らせ詳細取得
router.get('/announcements/:id', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { id } = req.params;
    const now = new Date().toISOString();

    const result = await pool.query(
      `SELECT id, title, content, image_url, is_important, published_at, created_at
       FROM store_announcements
       WHERE id = $1
         AND store_id = $2
         AND published_at IS NOT NULL
         AND published_at <= $3
         AND (expires_at IS NULL OR expires_at > $3)`,
      [id, decoded.storeId, now]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, 'お知らせが見つかりません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Announcement detail fetch error:', error);
    sendServerError(res, 'お知らせの取得に失敗しました', error);
  }
});

export default router;
