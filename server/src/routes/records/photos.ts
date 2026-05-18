import express from 'express';
import pool from '../../db/connection.js';
import { AuthRequest } from '../../middleware/auth.js';
import {
  requireStoreId,
  sendBadRequest,
  sendNotFound,
  sendServerError,
} from '../../utils/response.js';
import {
  createPhotoId,
  normalizeStoredPhotos,
  resolveRecordPhotoUrl,
} from '../../services/recordPhotos.js';

const router = express.Router();

// 犬の記録写真一覧を軽量取得（プロフィール写真として日誌から選択するために利用）
router.get('/photos/:dogId', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const dogId = Number(req.params.dogId);
    if (!Number.isInteger(dogId) || dogId <= 0) {
      sendBadRequest(res, 'dogId が不正です');
      return;
    }

    // 犬が店舗に属することを確認
    const dogCheck = await pool.query(
      `SELECT d.id FROM dogs d
       JOIN owners o ON d.owner_id = o.id
       WHERE d.id = $1 AND o.store_id = $2 AND d.deleted_at IS NULL`,
      [dogId, req.storeId]
    );
    if (dogCheck.rows.length === 0) {
      sendNotFound(res, '犬が見つかりません');
      return;
    }

    // 直近のカルテから写真を収集（最新順、最大100枚）
    const result = await pool.query(
      `SELECT r.id as record_id, r.record_date, r.photos
       FROM records r
       WHERE r.dog_id = $1 AND r.store_id = $2 AND r.deleted_at IS NULL
       ORDER BY r.record_date DESC, r.created_at DESC
       LIMIT 50`,
      [dogId, req.storeId]
    );

    const photos: Array<{ url: string; date: string }> = [];
    for (const row of result.rows as Array<{ record_date: string; photos: unknown }>) {
      const normalized = normalizeStoredPhotos(row.photos || { regular: [], concerns: [] });
      const dateStr = typeof row.record_date === 'string'
        ? row.record_date.slice(0, 10)
        : new Date(row.record_date).toISOString().slice(0, 10);
      for (const p of normalized.regular) {
        if (p?.url) photos.push({ url: p.url, date: dateStr });
        if (photos.length >= 100) break;
      }
      if (photos.length >= 100) break;
    }

    res.json(photos);
  } catch (error) {
    sendServerError(res, '写真の取得に失敗しました', error);
  }
});

// カルテ写真アップロード
router.post('/:id/photos', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { id } = req.params;
    const { photo, type = 'regular', label, annotation } = req.body;

    if (!photo) {
      sendBadRequest(res, '写真データが必要です');
      return;
    }

    // カルテの存在確認
    const recordResult = await pool.query(
      `SELECT photos FROM records
       WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
      [id, req.storeId]
    );

    if (recordResult.rows.length === 0) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
    }

    // 写真をアップロード
    const photoUrl = await resolveRecordPhotoUrl(photo);

    // 既存のphotos JSONBを更新
    const currentPhotos = normalizeStoredPhotos(recordResult.rows[0].photos || { regular: [], concerns: [] });
    const uploadedAt = new Date().toISOString();

    if (type === 'concern') {
      currentPhotos.concerns.push({
        id: createPhotoId(),
        url: photoUrl,
        uploadedAt,
        label: label || '',
        annotation: annotation && typeof annotation === 'object' ? annotation : undefined,
      });
    } else {
      currentPhotos.regular.push({
        id: createPhotoId(),
        url: photoUrl,
        uploadedAt,
      });
    }

    const result = await pool.query(
      `UPDATE records SET photos = $1::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND store_id = $3
       RETURNING *`,
      [JSON.stringify(currentPhotos), id, req.storeId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '写真のアップロードに失敗しました', error);
  }
});

// カルテ写真削除
router.delete('/:id/photos/:photoIndex', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { id, photoIndex } = req.params;
    const { type = 'regular' } = req.query as { type?: string };
    const index = parseInt(photoIndex, 10);

    if (isNaN(index) || index < 0) {
      sendBadRequest(res, '写真インデックスが不正です');
      return;
    }

    const recordResult = await pool.query(
      `SELECT photos FROM records
       WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
      [id, req.storeId]
    );

    if (recordResult.rows.length === 0) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
    }

    const currentPhotos = normalizeStoredPhotos(recordResult.rows[0].photos || { regular: [], concerns: [] });

    if (type === 'concern') {
      if (currentPhotos.concerns && index < currentPhotos.concerns.length) {
        currentPhotos.concerns.splice(index, 1);
      }
    } else {
      if (currentPhotos.regular && index < currentPhotos.regular.length) {
        currentPhotos.regular.splice(index, 1);
      }
    }

    const result = await pool.query(
      `UPDATE records SET photos = $1::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND store_id = $3
       RETURNING *`,
      [JSON.stringify(currentPhotos), id, req.storeId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '写真の削除に失敗しました', error);
  }
});

export default router;
