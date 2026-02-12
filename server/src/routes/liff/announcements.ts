import express from 'express';
import pool from '../../db/connection.js';
import { sendBadRequest, sendNotFound, sendServerError } from '../../utils/response.js';
import { requireOwnerToken } from './common.js';

const router = express.Router();

// 公開中のお知らせ一覧取得
router.get('/announcements', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const now = new Date().toISOString();

    const result = await pool.query(
      `SELECT sa.id, sa.title, sa.content, sa.image_url, sa.is_important, sa.published_at, sa.created_at,
              CASE WHEN oar.announcement_id IS NOT NULL THEN true ELSE false END as is_read
       FROM store_announcements sa
       LEFT JOIN owner_announcement_reads oar
         ON oar.announcement_id = sa.id
        AND oar.owner_id = $2
       WHERE store_id = $1
         AND published_at IS NOT NULL
         AND published_at <= $3
         AND (expires_at IS NULL OR expires_at > $3)
       ORDER BY is_important DESC, published_at DESC`,
      [decoded.storeId, decoded.ownerId, now]
    );

    res.json(result.rows);
  } catch (error: any) {
    sendServerError(res, 'お知らせの取得に失敗しました', error);
  }
});

// お知らせ既読登録（冪等）
router.post('/announcements/:id/read', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const announcementId = Number(req.params.id);
    if (!Number.isInteger(announcementId) || announcementId <= 0) {
      sendBadRequest(res, 'お知らせIDが不正です');
      return;
    }

    const now = new Date().toISOString();
    const announcementResult = await pool.query(
      `SELECT id
       FROM store_announcements
       WHERE id = $1
         AND store_id = $2
         AND published_at IS NOT NULL
         AND published_at <= $3
         AND (expires_at IS NULL OR expires_at > $3)`,
      [announcementId, decoded.storeId, now]
    );

    if (announcementResult.rows.length === 0) {
      sendNotFound(res, 'お知らせが見つかりません');
      return;
    }

    await pool.query(
      `INSERT INTO owner_announcement_reads (owner_id, announcement_id, read_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (owner_id, announcement_id) DO NOTHING`,
      [decoded.ownerId, announcementId]
    );

    res.status(201).json({ success: true });
  } catch (error: any) {
    sendServerError(res, 'お知らせ既読登録に失敗しました', error);
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
      `SELECT sa.id, sa.title, sa.content, sa.image_url, sa.is_important, sa.published_at, sa.created_at,
              CASE WHEN oar.announcement_id IS NOT NULL THEN true ELSE false END as is_read
       FROM store_announcements sa
       LEFT JOIN owner_announcement_reads oar
         ON oar.announcement_id = sa.id
        AND oar.owner_id = $2
       WHERE id = $1
         AND store_id = $3
         AND published_at IS NOT NULL
         AND published_at <= $4
         AND (expires_at IS NULL OR expires_at > $4)`,
      [id, decoded.ownerId, decoded.storeId, now]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, 'お知らせが見つかりません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    sendServerError(res, 'お知らせの取得に失敗しました', error);
  }
});

export default router;
