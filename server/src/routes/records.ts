import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { cacheControl } from '../middleware/cache.js';
import { buildPaginatedResponse, extractTotalCount, parsePaginationParams } from '../utils/pagination.js';
import {
  requireStoreId,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
} from '../utils/response.js';
import { appendBusinessTypeFilter, parseBusinessTypeInput } from '../utils/businessTypes.js';
import {
  createPhotoId,
  normalizeStoredPhotos,
  processRecordPhotos,
  resolveRecordPhotoUrl,
} from '../services/recordPhotos.js';
import {
  ensureDogBelongsToStore,
  fetchLatestRecordForDog,
  shareRecordForOwner,
} from '../services/recordsService.js';
import { logExportAction } from '../services/exportLogService.js';
import {
  validateCreateRecordPayload,
  validateUpdateRecordPayload,
} from '../utils/recordValidation.js';
import { isNonEmptyString, isNumberLike } from '../utils/validation.js';

function serializeJsonOrNull(value: unknown): string | null {
  if (!value) return null;
  return JSON.stringify(value);
}

function escapeCsvValue(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ];
  return `\uFEFF${lines.join('\n')}`;
}

function hasRequiredGroomingCounseling(groomingData: unknown): boolean {
  if (!groomingData) return false;

  let parsed = groomingData;
  if (typeof groomingData === 'string') {
    try {
      parsed = JSON.parse(groomingData);
    } catch {
      return false;
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false;
  }

  const counseling = (parsed as Record<string, unknown>).counseling;
  if (!counseling || typeof counseling !== 'object' || Array.isArray(counseling)) {
    return false;
  }

  const styleRequest = (counseling as Record<string, unknown>).style_request;
  const conditionNotes = (counseling as Record<string, unknown>).condition_notes;
  const consentConfirmed = (counseling as Record<string, unknown>).consent_confirmed;

  return (
    typeof styleRequest === 'string'
    && styleRequest.trim().length > 0
    && typeof conditionNotes === 'string'
    && conditionNotes.trim().length > 0
    && consentConfirmed === true
  );
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
      staff_id?: string | string[];
      date_from?: string | string[];
      date_to?: string | string[];
      search?: string | string[];
      page?: string | string[];
      limit?: string | string[];
    };
    const { record_type, dog_id, status, staff_id, date_from, date_to, search } = queryParams;
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

    if (staff_id) {
      const val = Array.isArray(staff_id) ? staff_id[0] : staff_id;
      if (isNumberLike(val)) {
        query += ` AND r.staff_id = $${params.length + 1}`;
        params.push(Number(val));
      }
    }

    if (date_from) {
      const val = Array.isArray(date_from) ? date_from[0] : date_from;
      if (isNonEmptyString(val)) {
        query += ` AND r.record_date >= $${params.length + 1}`;
        params.push(val);
      }
    }

    if (date_to) {
      const val = Array.isArray(date_to) ? date_to[0] : date_to;
      if (isNonEmptyString(val)) {
        query += ` AND r.record_date <= $${params.length + 1}`;
        params.push(val);
      }
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

// カルテ履歴をCSV形式でエクスポート
router.get('/export.csv', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const {
      record_type,
      dog_id,
      staff_id,
      status,
      date_from,
      date_to,
      search,
    } = req.query as {
      record_type?: string;
      dog_id?: string;
      staff_id?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
      search?: string;
    };

    const { value: recordType, error: recordTypeError } = parseBusinessTypeInput(record_type, 'record_type');
    if (recordTypeError) {
      sendBadRequest(res, recordTypeError);
      return;
    }

    let query = `
      SELECT r.id,
             r.record_date,
             r.status,
             r.record_type,
             d.name AS dog_name,
             o.name AS owner_name,
             s.name AS staff_name,
             r.notes,
             r.created_at
      FROM records r
      JOIN dogs d ON r.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      LEFT JOIN staff s ON r.staff_id = s.id
      WHERE r.store_id = $1
        AND r.deleted_at IS NULL
    `;
    const params: Array<string | number> = [req.storeId!];

    query += appendBusinessTypeFilter(params, 'r.record_type', recordType);

    if (isNumberLike(dog_id)) {
      query += ` AND r.dog_id = $${params.length + 1}`;
      params.push(Number(dog_id));
    }
    if (isNumberLike(staff_id)) {
      query += ` AND r.staff_id = $${params.length + 1}`;
      params.push(Number(staff_id));
    }
    if (isNonEmptyString(status)) {
      query += ` AND r.status = $${params.length + 1}`;
      params.push(status);
    }
    if (isNonEmptyString(date_from)) {
      query += ` AND r.record_date >= $${params.length + 1}`;
      params.push(date_from);
    }
    if (isNonEmptyString(date_to)) {
      query += ` AND r.record_date <= $${params.length + 1}`;
      params.push(date_to);
    }
    if (isNonEmptyString(search)) {
      query += ` AND (d.name ILIKE $${params.length + 1} OR o.name ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY r.record_date DESC, r.created_at DESC`;

    const result = await pool.query(query, params);
    const headers = [
      'カルテID',
      '記録日',
      'ステータス',
      '業態',
      '犬名',
      '飼い主名',
      '担当スタッフ',
      'レポート',
      '作成日時',
    ];
    const rows = result.rows.map((row) => {
      let reportText = '';
      if (row.notes && typeof row.notes === 'object' && !Array.isArray(row.notes)) {
        const maybeReport = (row.notes as Record<string, unknown>).report_text;
        reportText = typeof maybeReport === 'string' ? maybeReport : '';
      }
      return [
        row.id,
        row.record_date ? new Date(row.record_date).toISOString().slice(0, 10) : '',
        row.status ?? '',
        row.record_type ?? '',
        row.dog_name ?? '',
        row.owner_name ?? '',
        row.staff_name ?? '',
        reportText,
        row.created_at ? new Date(row.created_at).toISOString().slice(0, 16).replace('T', ' ') : '',
      ];
    });

    await logExportAction({
      storeId: req.storeId!,
      staffId: req.userId,
      exportType: 'records',
      outputFormat: 'csv',
      filters: {
        record_type: recordType ?? null,
        dog_id: dog_id ?? null,
        staff_id: staff_id ?? null,
        status: status ?? null,
        date_from: date_from ?? null,
        date_to: date_to ?? null,
        search: search ?? null,
      },
    });

    const csv = buildCsv(headers, rows);
    const filename = `records-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    sendServerError(res, 'カルテCSVエクスポートに失敗しました', error);
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

    const dogBelongs = await ensureDogBelongsToStore(Number(dogId), req.storeId!);
    if (!dogBelongs) {
      sendForbidden(res);
      return;
    }
    const record = await fetchLatestRecordForDog(Number(dogId), req.storeId!, recordType);
    if (!record) {
      sendNotFound(res, '過去のカルテがありません');
      return;
    }
    res.json(record);
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

    const validation = validateCreateRecordPayload(req.body);
    if (!validation.ok) {
      sendBadRequest(res, validation.error || '必須項目が不足しています（dog_id, record_type, record_date）');
      return;
    }

    const dogBelongs = await ensureDogBelongsToStore(Number(dog_id), req.storeId!);
    if (!dogBelongs) {
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

    const record = result.rows[0];

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

    const updateValidation = validateUpdateRecordPayload(req.body);
    if (!updateValidation.ok) {
      sendBadRequest(res, updateValidation.error || '更新内容が不正です');
      return;
    }

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

    const record = result.rows[0];

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

    const recordCheck = await pool.query(
      `SELECT record_type, grooming_data
       FROM records
       WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
      [id, req.storeId]
    );

    if (recordCheck.rows.length === 0) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
    }

    const targetRecord = recordCheck.rows[0];
    if (
      targetRecord.record_type === 'grooming'
      && !hasRequiredGroomingCounseling(targetRecord.grooming_data)
    ) {
      sendBadRequest(res, 'トリミングのカウンセリング項目（希望スタイル・当日体調・確認チェック）を入力してください');
      return;
    }

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
