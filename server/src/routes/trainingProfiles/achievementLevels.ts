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
  createAchievementLevel,
  deleteAchievementLevel,
  ensureDefaultAchievementLevels,
  listAchievementLevels,
  updateAchievementLevel,
} from '../../services/trainingProfilesService.js';
import { parseEntryId } from './validators.js';

const router = express.Router();

router.get('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;

    await ensureDefaultAchievementLevels(storeId);
    const result = await listAchievementLevels(storeId);
    res.json(result);
  } catch (error) {
    sendServerError(res, '評価段階一覧の取得に失敗しました', error);
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const { symbol, label, color_class } = req.body;

    if (!symbol || !label) {
      return sendBadRequest(res, '記号とラベルは必須です');
    }

    const result = await createAchievementLevel({
      storeId,
      symbol,
      label,
      colorClass: color_class || null,
    });

    res.status(201).json(result);
  } catch (error) {
    sendServerError(res, '評価段階の作成に失敗しました', error);
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const levelId = parseEntryId(req.params.id);
    const { symbol, label, color_class } = req.body;

    if (!levelId) {
      return sendBadRequest(res, '評価段階IDが不正です');
    }

    const result = await updateAchievementLevel({
      storeId,
      levelId,
      symbol,
      label,
      colorClass: color_class,
    });

    if (!result) {
      return sendNotFound(res, '評価段階が見つかりません');
    }

    res.json(result);
  } catch (error) {
    sendServerError(res, '評価段階の更新に失敗しました', error);
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const levelId = parseEntryId(req.params.id);

    if (!levelId) {
      return sendBadRequest(res, '評価段階IDが不正です');
    }

    const deleted = await deleteAchievementLevel(storeId, levelId);
    if (!deleted) {
      return sendNotFound(res, '評価段階が見つかりません');
    }

    sendSuccess(res);
  } catch (error) {
    sendServerError(res, '評価段階の削除に失敗しました', error);
  }
});

export default router;
