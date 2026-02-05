import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { cacheControl } from '../middleware/cache.js';
import { buildPaginatedResponse, extractTotalCount, parsePaginationParams } from '../utils/pagination.js';
import {
  isSupabaseStorageAvailable,
  uploadBase64ToSupabaseStorage,
} from '../services/storageService.js';
import {
  requireStoreId,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
} from '../utils/response.js';
import { isNonEmptyString, isNumberLike } from '../utils/validation.js';
import { sendRecordNotification } from '../services/notificationService.js';

function serializeJsonOrNull(value: unknown): string | null {
  if (!value) return null;
  return JSON.stringify(value);
}

/**
 * 写真配列を処理し、Base64データをSupabase Storageにアップロード
 */
async function processPhotos(photos: string[] | null): Promise<string[] | null> {
  if (!photos || photos.length === 0) {
    return null;
  }

  const storageAvailable = isSupabaseStorageAvailable();

  const processed = await Promise.all(
    photos.map(async (photo) => {
      if (photo.startsWith('http')) {
        return photo;
      }
      if (photo.startsWith('data:image/')) {
        if (storageAvailable) {
          const result = await uploadBase64ToSupabaseStorage(photo, 'records');
          if (result) {
            return result.url;
          }
          console.warn('Failed to upload photo to Supabase Storage');
          return null;
        }
        console.warn('Supabase Storage is not available, storing Base64 directly');
        return photo;
      }
      return null;
    })
  );

  const processedUrls = processed.filter((url): url is string => url !== null);
  return processedUrls.length > 0 ? processedUrls : null;
}

/**
 * photos JSONB内の写真（regular/concerns）を処理
 */
async function processRecordPhotos(
  photosData: { regular?: string[]; concerns?: Array<{ url: string; label?: string }> } | null
): Promise<{ regular: string[]; concerns: Array<{ url: string; label?: string }> } | null> {
  if (!photosData) return null;

  const result: { regular: string[]; concerns: Array<{ url: string; label?: string }> } = {
    regular: [],
    concerns: [],
  };

  // regular写真の処理
  if (photosData.regular && photosData.regular.length > 0) {
    const processed = await processPhotos(photosData.regular);
    result.regular = processed || [];
  }

  // concerns写真の処理
  if (photosData.concerns && photosData.concerns.length > 0) {
    const storageAvailable = isSupabaseStorageAvailable();
    result.concerns = await Promise.all(
      photosData.concerns.map(async (concern) => {
        if (concern.url.startsWith('http')) {
          return concern;
        }
        if (concern.url.startsWith('data:image/') && storageAvailable) {
          const uploaded = await uploadBase64ToSupabaseStorage(concern.url, 'records');
          if (uploaded) {
            return { ...concern, url: uploaded.url };
          }
        }
        return concern;
      })
    );
  }

  return result;
}

const router = express.Router();
router.use(authenticate);

// カルテ一覧取得
router.get('/', cacheControl(), async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const queryParams = req.query as {
      record_type?: string | string[];
      dog_id?: string | string[];
      status?: string | string[];
      search?: string | string[];
      page?: string | string[];
      limit?: string | string[];
    };
    const { record_type, dog_id, status, search } = queryParams;
    const pagination = parsePaginationParams({ page: queryParams.page, limit: queryParams.limit });

    let query = `
      SELECT r.*,
             d.name as dog_name, d.photo_url as dog_photo, d.breed as dog_breed,
             o.name as owner_name, o.id as owner_id,
             s.name as staff_name,
             COUNT(*) OVER() as total_count
      FROM records r
      JOIN dogs d ON r.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      LEFT JOIN staff s ON r.staff_id = s.id
      WHERE r.store_id = $1 AND r.deleted_at IS NULL
    `;
    const params: Array<string | number> = [req.storeId ?? 0];

    if (record_type) {
      const val = Array.isArray(record_type) ? record_type[0] : record_type;
      query += ` AND r.record_type = $${params.length + 1}`;
      params.push(val);
    }

    if (dog_id) {
      const val = Array.isArray(dog_id) ? dog_id[0] : dog_id;
      query += ` AND r.dog_id = $${params.length + 1}`;
      params.push(val);
    }

    if (status) {
      const val = Array.isArray(status) ? status[0] : status;
      query += ` AND r.status = $${params.length + 1}`;
      params.push(val);
    }

    if (search) {
      const searchValue = Array.isArray(search) ? search[0] : search;
      query += ` AND (d.name ILIKE $${params.length + 1} OR o.name ILIKE $${params.length + 1})`;
      params.push(`%${searchValue}%`);
    }

    query += ` ORDER BY r.record_date DESC, r.created_at DESC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(pagination.limit, pagination.offset);

    const result = await pool.query(query, params);
    const { data, total } = extractTotalCount(result.rows as Record<string, unknown>[]);
    res.json(buildPaginatedResponse(data, total, pagination));
  } catch (error) {
    sendServerError(res, 'カルテ一覧の取得に失敗しました', error);
  }
});

// 特定の犬の最新カルテを取得（前回コピー用）
router.get('/dogs/:dogId/latest', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { dogId } = req.params;
    const { record_type } = req.query as { record_type?: string };

    const dogCheck = await pool.query(
      `SELECT o.store_id FROM dogs d
       JOIN owners o ON d.owner_id = o.id
       WHERE d.id = $1 AND o.store_id = $2`,
      [dogId, req.storeId]
    );

    if (dogCheck.rows.length === 0) {
      sendForbidden(res);
      return;
    }

    let query = `
      SELECT r.*
      FROM records r
      WHERE r.dog_id = $1 AND r.deleted_at IS NULL
    `;
    const params: Array<string | number> = [dogId];

    if (record_type) {
      query += ` AND r.record_type = $${params.length + 1}`;
      params.push(record_type);
    }

    query += ` ORDER BY r.record_date DESC, r.created_at DESC LIMIT 1`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      sendNotFound(res, '過去のカルテがありません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '最新カルテの取得に失敗しました', error);
  }
});

// カルテ詳細取得
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*,
              d.name as dog_name, d.photo_url as dog_photo, d.breed as dog_breed,
              d.birth_date as dog_birth_date, d.gender as dog_gender,
              o.name as owner_name, o.id as owner_id,
              s.name as staff_name
       FROM records r
       JOIN dogs d ON r.dog_id = d.id
       JOIN owners o ON d.owner_id = o.id
       LEFT JOIN staff s ON r.staff_id = s.id
       WHERE r.id = $1 AND r.store_id = $2 AND r.deleted_at IS NULL`,
      [id, req.storeId]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'カルテ情報の取得に失敗しました', error);
  }
});

// カルテ作成
router.post('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const {
      dog_id,
      reservation_id,
      record_type,
      record_date,
      grooming_data,
      daycare_data,
      hotel_data,
      photos,
      notes,
      condition,
      health_check,
      ai_generated_text,
      ai_suggestions,
      status,
    } = req.body;

    if (!isNumberLike(dog_id) || !isNonEmptyString(record_type) || !isNonEmptyString(record_date)) {
      sendBadRequest(res, '必須項目が不足しています（dog_id, record_type, record_date）');
      return;
    }

    if (!['grooming', 'daycare', 'hotel'].includes(record_type)) {
      sendBadRequest(res, 'record_typeが不正です');
      return;
    }

    // 犬のstore_idを確認
    const dogCheck = await pool.query(
      `SELECT o.store_id FROM dogs d
       JOIN owners o ON d.owner_id = o.id
       WHERE d.id = $1 AND o.store_id = $2`,
      [dog_id, req.storeId]
    );

    if (dogCheck.rows.length === 0) {
      sendForbidden(res);
      return;
    }

    // 写真処理
    const processedPhotos = photos ? await processRecordPhotos(photos) : null;

    const result = await pool.query(
      `INSERT INTO records (
        store_id, dog_id, reservation_id, staff_id,
        record_type, record_date,
        grooming_data, daycare_data, hotel_data,
        photos, notes, condition, health_check,
        ai_generated_text, ai_suggestions, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        req.storeId,
        dog_id,
        reservation_id || null,
        req.userId,
        record_type,
        record_date,
        serializeJsonOrNull(grooming_data),
        serializeJsonOrNull(daycare_data),
        serializeJsonOrNull(hotel_data),
        serializeJsonOrNull(processedPhotos),
        serializeJsonOrNull(notes),
        serializeJsonOrNull(condition),
        serializeJsonOrNull(health_check),
        ai_generated_text || null,
        serializeJsonOrNull(ai_suggestions),
        status || 'draft',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'カルテの作成に失敗しました', error);
  }
});

// カルテ更新
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { id } = req.params;
    const {
      record_type,
      record_date,
      grooming_data,
      daycare_data,
      hotel_data,
      photos,
      notes,
      condition,
      health_check,
      ai_generated_text,
      ai_suggestions,
      status,
    } = req.body;

    // カルテの存在確認
    const recordCheck = await pool.query(
      `SELECT id FROM records
       WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
      [id, req.storeId]
    );

    if (recordCheck.rows.length === 0) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
    }

    // 動的にSET句を構築
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    const addParam = (column: string, value: unknown, isJson = false) => {
      if (value !== undefined) {
        const castSuffix = isJson ? '::jsonb' : '';
        setClauses.push(`${column} = $${paramIndex}${castSuffix}`);
        params.push(isJson ? serializeJsonOrNull(value) : value);
        paramIndex++;
      }
    };

    addParam('record_type', record_type);
    addParam('record_date', record_date);
    addParam('grooming_data', grooming_data, true);
    addParam('daycare_data', daycare_data, true);
    addParam('hotel_data', hotel_data, true);
    addParam('notes', notes, true);
    addParam('condition', condition, true);
    addParam('health_check', health_check, true);
    addParam('ai_generated_text', ai_generated_text);
    addParam('ai_suggestions', ai_suggestions, true);
    addParam('status', status);

    // 写真は特別処理（アップロードが必要）
    if (photos !== undefined) {
      const processedPhotos = photos ? await processRecordPhotos(photos) : null;
      setClauses.push(`photos = $${paramIndex}::jsonb`);
      params.push(serializeJsonOrNull(processedPhotos));
      paramIndex++;
    }

    if (setClauses.length === 0) {
      sendBadRequest(res, '更新する項目がありません');
      return;
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    params.push(id);
    params.push(req.storeId);

    const result = await pool.query(
      `UPDATE records SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex} AND store_id = $${paramIndex + 1} AND deleted_at IS NULL
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'カルテの更新に失敗しました', error);
  }
});

// カルテ削除（ソフトデリート）
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { id } = req.params;

    const result = await pool.query(
      `UPDATE records SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, req.storeId]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
    }

    res.json({ success: true });
  } catch (error) {
    sendServerError(res, 'カルテの削除に失敗しました', error);
  }
});

// カルテ共有（飼い主に送信）
router.post('/:id/share', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { id } = req.params;

    // カルテを取得
    const recordResult = await pool.query(
      `SELECT r.*, d.name as dog_name, o.id as owner_id, o.store_id
       FROM records r
       JOIN dogs d ON r.dog_id = d.id
       JOIN owners o ON d.owner_id = o.id
       WHERE r.id = $1 AND r.store_id = $2 AND r.deleted_at IS NULL`,
      [id, req.storeId]
    );

    if (recordResult.rows.length === 0) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
    }

    // ステータスを shared に更新
    const result = await pool.query(
      `UPDATE records SET status = 'shared', shared_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // LINE通知送信（非ブロッキング）
    const record = recordResult.rows[0];
    const photos = record.photos ? (typeof record.photos === 'string' ? JSON.parse(record.photos) : record.photos) : null;
    sendRecordNotification(
      req.storeId!,
      record.owner_id,
      {
        id: record.id,
        record_date: record.record_date,
        record_type: record.record_type,
        dog_name: record.dog_name,
        report_text: record.report_text,
        photos,
      }
    ).catch((err) => console.error('Record notification error:', err));

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'カルテの共有に失敗しました', error);
  }
});

// カルテ写真アップロード
router.post('/:id/photos', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { id } = req.params;
    const { photo, type = 'regular', label } = req.body;

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
    let photoUrl = photo;
    if (photo.startsWith('data:image/') && isSupabaseStorageAvailable()) {
      const uploaded = await uploadBase64ToSupabaseStorage(photo, 'records');
      if (uploaded) {
        photoUrl = uploaded.url;
      }
    }

    // 既存のphotos JSONBを更新
    const currentPhotos = recordResult.rows[0].photos || { regular: [], concerns: [] };

    if (type === 'concern') {
      currentPhotos.concerns = currentPhotos.concerns || [];
      currentPhotos.concerns.push({ url: photoUrl, label: label || '' });
    } else {
      currentPhotos.regular = currentPhotos.regular || [];
      currentPhotos.regular.push(photoUrl);
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

    const currentPhotos = recordResult.rows[0].photos || { regular: [], concerns: [] };

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
