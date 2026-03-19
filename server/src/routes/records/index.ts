import express from 'express';
import pool from '../../db/connection.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';
import { cacheControl } from '../../middleware/cache.js';
import { buildPaginatedResponse, extractTotalCount, parsePaginationParams } from '../../utils/pagination.js';
import {
  requireStoreId,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
} from '../../utils/response.js';
import { parseBusinessTypeInput } from '../../utils/businessTypes.js';
import {
  ensureDogBelongsToStore,
  fetchLatestRecordForDog,
  shareRecordForOwner,
} from '../../services/recordsService.js';
import {
  validateCreateRecordPayload,
  validateUpdateRecordPayload,
} from '../../utils/recordValidation.js';
import { hasRequiredGroomingCounseling } from './utils.js';
import photosRouter from './photos.js';
import exportRouter from './export.js';
import { buildRecordListQuery } from './queries.js';
import {
  createRecord,
  fetchRecordDetail,
  fetchShareTarget,
  recordExists,
  softDeleteRecord,
  updateRecord,
} from './repository.js';

const router = express.Router();
router.use(authenticate);

// サブルーターをマウント
router.use(photosRouter);
router.use(exportRouter);

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

    const { query, params } = buildRecordListQuery(req.storeId ?? 0, {
      recordType,
      dogId: Array.isArray(dog_id) ? dog_id[0] : dog_id,
      status: Array.isArray(status) ? status[0] : status,
      staffId: Array.isArray(staff_id) ? staff_id[0] : staff_id,
      dateFrom: Array.isArray(date_from) ? date_from[0] : date_from,
      dateTo: Array.isArray(date_to) ? date_to[0] : date_to,
      search: Array.isArray(search) ? search[0] : search,
    }, pagination);
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

    const record = await fetchRecordDetail(id, req.storeId!);

    if (!record) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
    }

    res.json(record);
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

    const record = await createRecord({
      storeId: req.storeId!,
      userId: req.userId,
      dogId: Number(dog_id),
      reservationId: reservation_id || null,
      recordType: record_type,
      recordDate: record_date,
      groomingData: grooming_data,
      daycareData: daycare_data,
      hotelData: hotel_data,
      photos,
      notes,
      condition,
      healthCheck: health_check,
      aiGeneratedText: ai_generated_text,
      aiSuggestions: ai_suggestions,
      status,
    });
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

    const exists = await recordExists(id, req.storeId!);
    if (!exists) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
    }

    const { record, updated } = await updateRecord({
      id,
      storeId: req.storeId!,
      input: {
        recordType,
        recordDate: record_date,
        groomingData: grooming_data,
        daycareData: daycare_data,
        hotelData: hotel_data,
        photos,
        notes,
        condition,
        healthCheck: health_check,
        aiGeneratedText: ai_generated_text,
        aiSuggestions: ai_suggestions,
        status,
      },
    });

    if (!updated) {
      sendBadRequest(res, '更新する項目がありません');
      return;
    }

    if (!record) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
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

    const deletedRecord = await softDeleteRecord(id, req.storeId!);
    if (!deletedRecord) {
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

    const targetRecord = await fetchShareTarget(id, req.storeId!);
    if (!targetRecord) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
    }

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

export default router;
