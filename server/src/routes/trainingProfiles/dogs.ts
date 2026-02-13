import express from 'express';
import type { AuthRequest } from '../../middleware/auth.js';
import {
  requireStoreId,
  sendBadRequest,
  sendNotFound,
  sendServerError,
  sendSuccess,
} from '../../utils/response.js';
import {
  createConcern,
  createLogEntry,
  deleteConcern,
  deleteGridEntry,
  deleteLogEntry,
  getAllDogTrainingData,
  hasConcern,
  hasGridEntry,
  hasLogEntry,
  upsertGridEntry,
  updateConcern,
  updateLogEntry,
  verifyDogBelongsToStore,
} from '../../services/trainingProfilesService.js';
import { parseCategoryId, parseDogId, parseEntryId, parseTrainingItemId } from './validators.js';

const router = express.Router({ mergeParams: true });

function resolveDogId(req: AuthRequest, res: express.Response): number | null {
  const dogId = parseDogId(req.params.dogId);
  if (!dogId) {
    sendBadRequest(res, '犬IDが不正です');
    return null;
  }
  return dogId;
}

function resolveEntryId(req: AuthRequest, res: express.Response): number | null {
  const entryId = parseEntryId(req.params.entryId);
  if (!entryId) {
    sendBadRequest(res, 'エントリIDが不正です');
    return null;
  }
  return entryId;
}

async function ensureDogBelongsToStore(dogId: number, storeId: number, res: express.Response): Promise<boolean> {
  if (!(await verifyDogBelongsToStore(dogId, storeId))) {
    sendNotFound(res, '犬が見つかりません');
    return false;
  }
  return true;
}

router.get('/all', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = resolveDogId(req, res);
    if (!dogId) return;

    if (!(await ensureDogBelongsToStore(dogId, storeId, res))) {
      return;
    }

    const result = await getAllDogTrainingData(storeId, dogId);
    res.json(result);
  } catch (error) {
    sendServerError(res, 'トレーニングデータの取得に失敗しました', error);
  }
});

router.put('/grid', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = resolveDogId(req, res);
    if (!dogId) return;

    const { category_id, training_item_id, entry_date, achievement_symbol } = req.body;
    if (!category_id || !training_item_id || !entry_date || !achievement_symbol) {
      return sendBadRequest(res, '必須項目が不足しています');
    }

    const categoryId = parseCategoryId(category_id);
    const trainingItemId = parseTrainingItemId(training_item_id);
    if (!categoryId || !trainingItemId) {
      return sendBadRequest(res, 'カテゴリIDまたはトレーニング項目IDが不正です');
    }

    if (!(await ensureDogBelongsToStore(dogId, storeId, res))) {
      return;
    }

    const result = await upsertGridEntry({
      storeId,
      dogId,
      categoryId,
      trainingItemId,
      entryDate: entry_date,
      achievementSymbol: achievement_symbol,
      staffId: req.userId,
    });

    res.json(result);
  } catch (error) {
    sendServerError(res, 'グリッドエントリの保存に失敗しました', error);
  }
});

router.delete('/grid/:entryId', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = resolveDogId(req, res);
    if (!dogId) return;
    const entryId = resolveEntryId(req, res);
    if (!entryId) return;

    if (!(await ensureDogBelongsToStore(dogId, storeId, res))) {
      return;
    }

    if (!(await hasGridEntry(entryId, storeId, dogId))) {
      return sendNotFound(res, 'エントリが見つかりません');
    }

    await deleteGridEntry(entryId);
    sendSuccess(res);
  } catch (error) {
    sendServerError(res, 'グリッドエントリの削除に失敗しました', error);
  }
});

router.post('/logs', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = resolveDogId(req, res);
    if (!dogId) return;
    const { category_id, entry_date, note } = req.body;

    if (!category_id || !entry_date || !note) {
      return sendBadRequest(res, '必須項目が不足しています');
    }

    const categoryId = parseCategoryId(category_id);
    if (!categoryId) {
      return sendBadRequest(res, 'カテゴリIDが不正です');
    }

    if (!(await ensureDogBelongsToStore(dogId, storeId, res))) {
      return;
    }

    const result = await createLogEntry({
      storeId,
      dogId,
      categoryId,
      entryDate: entry_date,
      staffId: req.userId,
      note,
    });

    res.status(201).json(result);
  } catch (error) {
    sendServerError(res, 'ログエントリの作成に失敗しました', error);
  }
});

router.put('/logs/:entryId', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = resolveDogId(req, res);
    if (!dogId) return;
    const entryId = resolveEntryId(req, res);
    if (!entryId) return;
    const { entry_date, note } = req.body;

    if (!(await ensureDogBelongsToStore(dogId, storeId, res))) {
      return;
    }

    if (!(await hasLogEntry(entryId, storeId, dogId))) {
      return sendNotFound(res, 'エントリが見つかりません');
    }

    const result = await updateLogEntry({
      storeId,
      entryId,
      entryDate: entry_date,
      note,
    });

    res.json(result);
  } catch (error) {
    sendServerError(res, 'ログエントリの更新に失敗しました', error);
  }
});

router.delete('/logs/:entryId', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = resolveDogId(req, res);
    if (!dogId) return;
    const entryId = resolveEntryId(req, res);
    if (!entryId) return;

    if (!(await ensureDogBelongsToStore(dogId, storeId, res))) {
      return;
    }

    if (!(await hasLogEntry(entryId, storeId, dogId))) {
      return sendNotFound(res, 'エントリが見つかりません');
    }

    await deleteLogEntry(entryId);
    sendSuccess(res);
  } catch (error) {
    sendServerError(res, 'ログエントリの削除に失敗しました', error);
  }
});

router.post('/concerns', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = resolveDogId(req, res);
    if (!dogId) return;
    const { entry_date, note } = req.body;

    if (!entry_date || !note) {
      return sendBadRequest(res, '必須項目が不足しています');
    }

    if (!(await ensureDogBelongsToStore(dogId, storeId, res))) {
      return;
    }

    const result = await createConcern({
      storeId,
      dogId,
      entryDate: entry_date,
      staffId: req.userId,
      note,
    });

    res.status(201).json(result);
  } catch (error) {
    sendServerError(res, '気になることの作成に失敗しました', error);
  }
});

router.put('/concerns/:entryId', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = resolveDogId(req, res);
    if (!dogId) return;
    const entryId = resolveEntryId(req, res);
    if (!entryId) return;
    const { entry_date, note } = req.body;

    if (!(await ensureDogBelongsToStore(dogId, storeId, res))) {
      return;
    }

    if (!(await hasConcern(entryId, storeId, dogId))) {
      return sendNotFound(res, 'エントリが見つかりません');
    }

    const result = await updateConcern({
      storeId,
      entryId,
      entryDate: entry_date,
      note,
    });

    res.json(result);
  } catch (error) {
    sendServerError(res, '気になることの更新に失敗しました', error);
  }
});

router.delete('/concerns/:entryId', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = resolveDogId(req, res);
    if (!dogId) return;
    const entryId = resolveEntryId(req, res);
    if (!entryId) return;

    if (!(await ensureDogBelongsToStore(dogId, storeId, res))) {
      return;
    }

    if (!(await hasConcern(entryId, storeId, dogId))) {
      return sendNotFound(res, 'エントリが見つかりません');
    }

    await deleteConcern(entryId);
    sendSuccess(res);
  } catch (error) {
    sendServerError(res, '気になることの削除に失敗しました', error);
  }
});

export default router;
