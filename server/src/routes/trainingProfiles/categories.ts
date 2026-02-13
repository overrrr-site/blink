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
  createCategory,
  deleteCategory,
  ensureDefaultCategories,
  listCategories,
  reorderCategories,
  type TrainingProfileCategoryType,
  updateCategory,
} from '../../services/trainingProfilesService.js';
import { parseCategoryId, parseOptionalIdArray, parseRequiredIdArray } from './validators.js';

const router = express.Router();

router.get('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;

    await ensureDefaultCategories(storeId);
    const categories = await listCategories(storeId);
    res.json(categories);
  } catch (error) {
    sendServerError(res, 'カテゴリ一覧の取得に失敗しました', error);
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const { name, category_type, goal, instructions, item_ids } = req.body;

    if (!name || !category_type) {
      return sendBadRequest(res, '名前とカテゴリタイプは必須です');
    }

    if (!['grid', 'log'].includes(category_type)) {
      return sendBadRequest(res, 'カテゴリタイプはgridまたはlogである必要があります');
    }

    const parsedItemIds = parseOptionalIdArray(item_ids);
    if (parsedItemIds === null) {
      return sendBadRequest(res, 'item_idsは正の整数の配列である必要があります');
    }

    const result = await createCategory({
      storeId,
      name,
      categoryType: category_type as TrainingProfileCategoryType,
      goal: goal || null,
      instructions: instructions || null,
      itemIds: parsedItemIds,
    });

    res.status(201).json(result);
  } catch (error) {
    sendServerError(res, 'カテゴリの作成に失敗しました', error);
  }
});

router.put('/reorder', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const ids = parseRequiredIdArray(req.body.ids);

    if (!ids) {
      return sendBadRequest(res, 'IDの配列が必要です');
    }

    await reorderCategories(storeId, ids);
    sendSuccess(res);
  } catch (error) {
    sendServerError(res, 'カテゴリの並び替えに失敗しました', error);
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const categoryId = parseCategoryId(req.params.id);
    const { name, goal, instructions, enabled, item_ids } = req.body;

    if (!categoryId) {
      return sendBadRequest(res, 'カテゴリIDが不正です');
    }

    const parsedItemIds = parseOptionalIdArray(item_ids);
    if (parsedItemIds === null) {
      return sendBadRequest(res, 'item_idsは正の整数の配列である必要があります');
    }

    const result = await updateCategory({
      storeId,
      categoryId,
      name,
      goal,
      instructions,
      enabled,
      itemIds: parsedItemIds,
    });

    if (!result) {
      return sendNotFound(res, 'カテゴリが見つかりません');
    }

    res.json(result);
  } catch (error) {
    sendServerError(res, 'カテゴリの更新に失敗しました', error);
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const categoryId = parseCategoryId(req.params.id);

    if (!categoryId) {
      return sendBadRequest(res, 'カテゴリIDが不正です');
    }

    const deleted = await deleteCategory(storeId, categoryId);
    if (!deleted) {
      return sendNotFound(res, 'カテゴリが見つかりません');
    }

    sendSuccess(res);
  } catch (error) {
    sendServerError(res, 'カテゴリの削除に失敗しました', error);
  }
});

export default router;
