import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { sendBadRequest, sendServerError } from '../utils/response.js';
import {
  generateDaycareComment,
  analyzePhotoForRecord,
  analyzePhotoForActivity,
  generateReport,
} from '../services/aiService.js';
import { getAISuggestions } from '../services/aiSuggestionsService.js';
import {
  recordAIFeedback,
  recordSuggestionFeedback,
  getAISettings,
} from '../utils/aiLearning.js';

const router = express.Router();
router.use(authenticate);

// 日誌コメント生成
router.post('/generate-comment', async (req: AuthRequest, res) => {
  console.log('🤖 /generate-comment エンドポイント到達');
  console.log('🤖 GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

  try {
    const comment = await generateDaycareComment(req.body);
    res.json({ comment });
  } catch (error) {
    sendServerError(res, 'コメント生成に失敗しました', error);
  }
});

// 写真からの活動推測・健康チェック
router.post('/analyze-photo', async (req: AuthRequest, res) => {
  try {
    const { mode, record_type, photo, photo_base64, dog_name } = req.body;

    if (mode === 'record' || record_type) {
      if (!photo_base64 && !photo) {
        sendBadRequest(res, '写真が必要です');
        return;
      }

      const result = await analyzePhotoForRecord({
        record_type: record_type || 'daycare',
        photo,
        photo_base64,
        dog_name,
      });
      return res.json(result);
    }

    if (!photo_base64) {
      sendBadRequest(res, '写真が必要です');
      return;
    }

    try {
      const result = await analyzePhotoForActivity({
        photo_base64,
        dog_name,
      });
      return res.json(result);
    } catch (apiError: any) {
      console.error('Gemini API error:', apiError);
      sendServerError(res, '写真解析に失敗しました', apiError);
      return;
    }
  } catch (error: any) {
    sendServerError(res, '写真解析に失敗しました', error);
  }
});

// 業種別レポート生成
router.post('/generate-report', async (req: AuthRequest, res) => {
  try {
    const { record_type, dog_name } = req.body;

    if (!record_type || !dog_name) {
      sendBadRequest(res, 'record_typeとdog_nameは必須です');
      return;
    }

    const { report, learningDataId } = await generateReport(req.body, req.storeId);
    res.json({
      report,
      learning_data_id: learningDataId,
    });
  } catch (error) {
    sendServerError(res, 'レポート生成に失敗しました', error);
  }
});

// AIサジェスション取得
router.get('/suggestions/:recordId', async (req: AuthRequest, res) => {
  try {
    const { recordId } = req.params;

    if (!recordId) {
      sendBadRequest(res, 'recordIdは必須です');
      return;
    }

    const { record, suggestions } = await getAISuggestions(recordId, req.storeId);
    if (!record) {
      sendBadRequest(res, 'カルテが見つかりません');
      return;
    }

    res.json({ suggestions });
  } catch (error) {
    sendServerError(res, 'サジェスション取得に失敗しました', error);
  }
});

// AI出力へのフィードバック記録
router.post('/feedback', async (req: AuthRequest, res) => {
  try {
    const { learning_data_id, was_used, was_edited, final_text } = req.body;

    if (learning_data_id && req.storeId) {
      await recordAIFeedback({
        learningDataId: learning_data_id,
        wasUsed: was_used ?? false,
        wasEdited: was_edited ?? false,
        finalText: final_text,
      });
    }

    res.json({ success: true });
  } catch (error) {
    sendServerError(res, 'フィードバック記録に失敗しました', error);
  }
});

// サジェスションへのフィードバック記録
router.post('/suggestion-feedback', async (req: AuthRequest, res) => {
  try {
    const { suggestion_type, was_applied, record_type } = req.body;

    if (suggestion_type && req.storeId) {
      await recordSuggestionFeedback(
        req.storeId,
        suggestion_type,
        was_applied ?? false,
        record_type
      );
    }

    res.json({ success: true });
  } catch (error) {
    sendServerError(res, 'フィードバック記録に失敗しました', error);
  }
});

// AI設定の取得
router.get('/settings', async (req: AuthRequest, res) => {
  try {
    if (!req.storeId) {
      sendBadRequest(res, 'storeIdが必要です');
      return;
    }

    const settings = await getAISettings(req.storeId);
    res.json(settings);
  } catch (error) {
    sendServerError(res, 'AI設定の取得に失敗しました', error);
  }
});

export default router;
