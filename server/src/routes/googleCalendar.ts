import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  getAuthUrl,
  saveTokens,
  getGoogleCalendarIntegration,
} from '../services/googleCalendar.js';
import { requireStoreId, sendBadRequest, sendServerError } from '../utils/response.js';

const router = express.Router();

// OAuth認証開始
router.get('/auth', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const authUrl = getAuthUrl(req.storeId);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    sendServerError(res, '認証URLの生成に失敗しました', error);
  }
});

// OAuth認証コールバック
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      sendBadRequest(res, '認証コードまたはstateが不足しています');
      return;
    }

    const storeId = parseInt(state as string, 10);
    if (isNaN(storeId)) {
      sendBadRequest(res, '無効なstoreIdです');
      return;
    }

    await saveTokens(storeId, code as string);

    // フロントエンドにリダイレクト
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/settings?google_calendar=connected`);
  } catch (error) {
    console.error('Error in callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/settings?google_calendar=error`);
  }
});

// 連携状態を取得
router.get('/status', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const integration = await getGoogleCalendarIntegration(req.storeId);
    
    res.json({
      connected: !!integration,
      calendarId: integration?.calendar_id || null,
      enabled: integration?.enabled || false,
    });
  } catch (error) {
    console.error('Error getting status:', error);
    sendServerError(res, '連携状態の取得に失敗しました', error);
  }
});

// 連携を無効化
router.post('/disconnect', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { Pool } = await import('pg');
    const pool = (await import('../db/connection.js')).default;

    await pool.query(
      `UPDATE google_calendar_integrations SET enabled = FALSE WHERE store_id = $1`,
      [req.storeId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting:', error);
    sendServerError(res, '連携の無効化に失敗しました', error);
  }
});

export default router;
