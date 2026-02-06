import express from 'express';
import { randomUUID } from 'crypto';
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
import { appendBusinessTypeFilter, isBusinessType, parseBusinessTypeInput } from '../utils/businessTypes.js';

function serializeJsonOrNull(value: unknown): string | null {
  if (!value) return null;
  return JSON.stringify(value);
}

type PhotoInput = string | { id?: string; url: string; uploadedAt?: string };
type ConcernInput = string | { id?: string; url: string; uploadedAt?: string; label?: string; annotation?: { x: number; y: number } };

function createId(): string {
  return typeof randomUUID === 'function'
    ? randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePhotoItem(item: PhotoInput): { id: string; url: string; uploadedAt: string } | null {
  if (typeof item === 'string') {
    return { id: createId(), url: item, uploadedAt: new Date().toISOString() };
  }
  if (item && typeof item === 'object' && typeof item.url === 'string') {
    return {
      id: item.id || createId(),
      url: item.url,
      uploadedAt: item.uploadedAt || new Date().toISOString(),
    };
  }
  return null;
}

function normalizeConcernItem(item: ConcernInput): { id: string; url: string; uploadedAt: string; label?: string; annotation?: { x: number; y: number } } | null {
  if (typeof item === 'string') {
    return { id: createId(), url: item, uploadedAt: new Date().toISOString() };
  }
  if (item && typeof item === 'object' && typeof item.url === 'string') {
    return {
      id: item.id || createId(),
      url: item.url,
      uploadedAt: item.uploadedAt || new Date().toISOString(),
      label: item.label,
      annotation: item.annotation,
    };
  }
  return null;
}

function normalizeStoredPhotos(photos: { regular?: PhotoInput[]; concerns?: ConcernInput[] } | null | undefined) {
  const regular: Array<{ id: string; url: string; uploadedAt: string }> = [];
  const concerns: Array<{ id: string; url: string; uploadedAt: string; label?: string; annotation?: { x: number; y: number } }> = [];

  (photos?.regular || []).forEach((item) => {
    const normalized = normalizePhotoItem(item);
    if (normalized) regular.push(normalized);
  });

  (photos?.concerns || []).forEach((item) => {
    const normalized = normalizeConcernItem(item);
    if (normalized) concerns.push(normalized);
  });

  return { regular, concerns };
}

async function shouldAutoShareRecord(storeId: number): Promise<boolean> {
  const settingsResult = await pool.query<{ auto_share_record?: boolean }>(
    `SELECT auto_share_record FROM notification_settings WHERE store_id = $1`,
    [storeId]
  );
  return settingsResult.rows[0]?.auto_share_record === true;
}

async function shareRecordForOwner(storeId: number, recordId: number) {
  const recordResult = await pool.query(
    `SELECT r.*, d.name as dog_name, o.id as owner_id, o.store_id
     FROM records r
     JOIN dogs d ON r.dog_id = d.id
     JOIN owners o ON d.owner_id = o.id
     WHERE r.id = $1 AND r.store_id = $2 AND r.deleted_at IS NULL`,
    [recordId, storeId]
  );

  if (recordResult.rows.length === 0) {
    return null;
  }

  const updateResult = await pool.query(
    `UPDATE records SET status = 'shared', shared_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND store_id = $2
     RETURNING *`,
    [recordId, storeId]
  );

  const record = recordResult.rows[0];
  const photos = record.photos ? (typeof record.photos === 'string' ? JSON.parse(record.photos) : record.photos) : null;
  sendRecordNotification(
    storeId,
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

  return updateResult.rows[0];
}

/**
 * 写真配列を処理し、Base64データをSupabase Storageにアップロード
 */
async function processRecordPhotos(
  photosData: { regular?: PhotoInput[]; concerns?: ConcernInput[] } | null
): Promise<{ regular: Array<{ id: string; url: string; uploadedAt: string }>; concerns: Array<{ id: string; url: string; uploadedAt: string; label?: string; annotation?: { x: number; y: number } }> } | null> {
  if (!photosData) return null;

  const storageAvailable = isSupabaseStorageAvailable();
  const result = { regular: [] as Array<{ id: string; url: string; uploadedAt: string }>, concerns: [] as Array<{ id: string; url: string; uploadedAt: string; label?: string; annotation?: { x: number; y: number } }> };

  if (photosData.regular && photosData.regular.length > 0) {
    for (const item of photosData.regular) {
      const normalized = normalizePhotoItem(item);
      if (!normalized) continue;
      if (normalized.url.startsWith('data:image/') && storageAvailable) {
        const uploaded = await uploadBase64ToSupabaseStorage(normalized.url, 'records');
        if (uploaded) {
          result.regular.push({ ...normalized, url: uploaded.url });
          continue;
        }
      }
      result.regular.push(normalized);
    }
  }

  if (photosData.concerns && photosData.concerns.length > 0) {
    for (const item of photosData.concerns) {
      const normalized = normalizeConcernItem(item);
      if (!normalized) continue;
      if (normalized.url.startsWith('data:image/') && storageAvailable) {
        const uploaded = await uploadBase64ToSupabaseStorage(normalized.url, 'records');
        if (uploaded) {
          result.concerns.push({ ...normalized, url: uploaded.url });
          continue;
        }
      }
      result.concerns.push(normalized);
    }
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
    const { value: recordType, error: recordTypeError } = parseBusinessTypeInput(record_type, 'record_type');
    if (recordTypeError) {
      sendBadRequest(res, recordTypeError);
      return;
    }
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

    query += appendBusinessTypeFilter(params, 'r.record_type', recordType);

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
    const { value: recordType, error: recordTypeError } = parseBusinessTypeInput(record_type, 'record_type');
    if (recordTypeError) {
      sendBadRequest(res, recordTypeError);
      return;
    }

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

    query += appendBusinessTypeFilter(params, 'r.record_type', recordType);

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

    if (!isBusinessType(record_type)) {
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

    const statusValue = status || 'draft';
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
        statusValue,
      ]
    );

    let record = result.rows[0];
    if (statusValue === 'saved' && req.storeId) {
      const autoShare = await shouldAutoShareRecord(req.storeId);
      if (autoShare) {
        const sharedRecord = await shareRecordForOwner(req.storeId, record.id);
        if (sharedRecord) {
          record = sharedRecord;
        }
      }
    }

    res.status(201).json(record);
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
    const { value: recordType, error: recordTypeError } = parseBusinessTypeInput(record_type, 'record_type');
    if (recordTypeError) {
      sendBadRequest(res, recordTypeError);
      return;
    }

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

    if (recordType !== undefined) {
      addParam('record_type', recordType);
    }
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

    let record = result.rows[0];
    if (record.status === 'saved' && req.storeId) {
      const autoShare = await shouldAutoShareRecord(req.storeId);
      if (autoShare) {
        const sharedRecord = await shareRecordForOwner(req.storeId, record.id);
        if (sharedRecord) {
          record = sharedRecord;
        }
      }
    }

    res.json(record);
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

    const sharedRecord = await shareRecordForOwner(req.storeId!, Number(id));
    if (!sharedRecord) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
    }

    res.json(sharedRecord);
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
    let photoUrl = photo;
    if (photo.startsWith('data:image/') && isSupabaseStorageAvailable()) {
      const uploaded = await uploadBase64ToSupabaseStorage(photo, 'records');
      if (uploaded) {
        photoUrl = uploaded.url;
      }
    }

    // 既存のphotos JSONBを更新
    const currentPhotos = normalizeStoredPhotos(recordResult.rows[0].photos || { regular: [], concerns: [] });
    const uploadedAt = new Date().toISOString();

    if (type === 'concern') {
      currentPhotos.concerns.push({
        id: createId(),
        url: photoUrl,
        uploadedAt,
        label: label || '',
        annotation: annotation && typeof annotation === 'object' ? annotation : undefined,
      });
    } else {
      currentPhotos.regular.push({
        id: createId(),
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
