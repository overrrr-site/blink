import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireStoreId, sendServerError, sendBadRequest } from '../utils/response.js';
import { sendLineMessage } from '../services/lineMessagingService.js';

const router = express.Router();
router.use(authenticate);

// 通知設定取得
router.get('/settings', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const result = await pool.query(
      `SELECT * FROM notification_settings WHERE store_id = $1`,
      [req.storeId]
    );

    if (result.rows.length === 0) {
      // デフォルト設定を作成
      const defaultSettings = await pool.query(
        `INSERT INTO notification_settings (store_id) VALUES ($1) RETURNING *`,
        [req.storeId]
      );
      return res.json(defaultSettings.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '通知設定の取得に失敗しました', error);
  }
});

// 通知設定更新
router.put('/settings', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const {
      reminder_before_visit,
      reminder_before_visit_days,
      record_notification,
      vaccine_alert,
      vaccine_alert_days,
      line_notification_enabled,
      email_notification_enabled,
      line_bot_enabled,
      auto_share_record,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO notification_settings (
        store_id, reminder_before_visit, reminder_before_visit_days,
        record_notification, vaccine_alert, vaccine_alert_days,
        line_notification_enabled, email_notification_enabled, line_bot_enabled,
        auto_share_record
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (store_id) DO UPDATE SET
        reminder_before_visit = COALESCE(EXCLUDED.reminder_before_visit, notification_settings.reminder_before_visit),
        reminder_before_visit_days = COALESCE(EXCLUDED.reminder_before_visit_days, notification_settings.reminder_before_visit_days),
        record_notification = COALESCE(EXCLUDED.record_notification, notification_settings.record_notification),
        vaccine_alert = COALESCE(EXCLUDED.vaccine_alert, notification_settings.vaccine_alert),
        vaccine_alert_days = COALESCE(EXCLUDED.vaccine_alert_days, notification_settings.vaccine_alert_days),
        line_notification_enabled = COALESCE(EXCLUDED.line_notification_enabled, notification_settings.line_notification_enabled),
        email_notification_enabled = COALESCE(EXCLUDED.email_notification_enabled, notification_settings.email_notification_enabled),
        line_bot_enabled = COALESCE(EXCLUDED.line_bot_enabled, notification_settings.line_bot_enabled),
        auto_share_record = COALESCE(EXCLUDED.auto_share_record, notification_settings.auto_share_record),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        req.storeId,
        reminder_before_visit ?? true,
        reminder_before_visit_days ?? 1,
        record_notification ?? true,
        vaccine_alert ?? true,
        vaccine_alert_days ?? 14,
        line_notification_enabled ?? false,
        email_notification_enabled ?? false,
        line_bot_enabled ?? false,
        auto_share_record ?? null,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '通知設定の更新に失敗しました', error);
  }
});

// 通知送信ログ取得
router.get('/logs', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { page = '1', limit = '50', notification_type, status } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT nl.*, o.name as owner_name
      FROM notification_logs nl
      JOIN owners o ON nl.owner_id = o.id
      WHERE nl.store_id = $1
    `;
    const params: (string | number)[] = [req.storeId];
    let paramIndex = 2;

    if (notification_type) {
      query += ` AND nl.notification_type = $${paramIndex}`;
      params.push(String(notification_type));
      paramIndex++;
    }

    if (status) {
      query += ` AND nl.status = $${paramIndex}`;
      params.push(String(status));
      paramIndex++;
    }

    // 総件数取得（JOIN不要）
    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM notification_logs nl
       WHERE nl.store_id = $1
       ${notification_type ? 'AND nl.notification_type = $2' : ''}
       ${status ? `AND nl.status = $${notification_type ? 3 : 2}` : ''}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || '0');

    // ページネーション付きで取得
    query += ` ORDER BY nl.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    res.json({
      logs: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    sendServerError(res, '通知ログの取得に失敗しました', error);
  }
});

// LINE通知テスト送信
router.post('/test-line', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { owner_id } = req.body;

    // 店舗のLINE設定確認
    const storeResult = await pool.query(
      `SELECT line_channel_id, line_channel_secret, line_channel_access_token 
       FROM stores WHERE id = $1`,
      [req.storeId]
    );

    if (storeResult.rows.length === 0) {
      return sendBadRequest(res, '店舗情報が見つかりません');
    }

    const store = storeResult.rows[0];
    const missingCredentials: string[] = [];
    if (!store.line_channel_id) missingCredentials.push('Channel ID');
    if (!store.line_channel_secret) missingCredentials.push('Channel Secret');
    if (!store.line_channel_access_token) missingCredentials.push('Channel Access Token');

    if (missingCredentials.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'LINE認証情報が不足しています',
        missing: missingCredentials,
        message: `以下の設定が必要です: ${missingCredentials.join(', ')}`,
      });
    }

    // 通知設定確認
    const settingsResult = await pool.query(
      `SELECT line_notification_enabled FROM notification_settings WHERE store_id = $1`,
      [req.storeId]
    );

    const lineEnabled = settingsResult.rows[0]?.line_notification_enabled ?? false;

    // 飼い主情報取得（owner_idが指定されていれば）
    let targetLineId: string | null = null;
    let ownerName = 'テストユーザー';

    if (owner_id) {
      const ownerResult = await pool.query(
        `SELECT name, line_id FROM owners WHERE id = $1 AND store_id = $2`,
        [owner_id, req.storeId]
      );

      if (ownerResult.rows.length === 0) {
        return sendBadRequest(res, '飼い主が見つかりません');
      }

      targetLineId = ownerResult.rows[0].line_id;
      ownerName = ownerResult.rows[0].name;

      if (!targetLineId) {
        return res.status(400).json({
          success: false,
          error: 'LINE未連携',
          message: `${ownerName}さんはLINEアカウントを連携していません`,
        });
      }
    } else {
      // owner_idが指定されていない場合、有効なLINE ID（Uで始まる）を持つ飼い主を探す
      const linkedOwnerResult = await pool.query(
        `SELECT id, name, line_id FROM owners 
         WHERE store_id = $1 AND line_id IS NOT NULL AND line_id LIKE 'U%' AND deleted_at IS NULL
         ORDER BY id ASC
         LIMIT 1`,
        [req.storeId]
      );

      if (linkedOwnerResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'LINE連携済みの飼い主がいません',
          message: 'テスト送信するには、飼い主がLINEアカウントを連携している必要があります',
        });
      }

      targetLineId = linkedOwnerResult.rows[0].line_id;
      ownerName = linkedOwnerResult.rows[0].name;
    }

    // テストメッセージ送信
    const testMessage = `🐕 LINE通知テスト\n\nこれはBLINKからのテストメッセージです。\n送信日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`;

    const sent = await sendLineMessage(req.storeId!, targetLineId!, testMessage);

    if (sent) {
      res.json({
        success: true,
        message: `${ownerName}さんにテストメッセージを送信しました`,
        lineEnabled,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'メッセージ送信に失敗しました',
        message: 'LINE APIエラーが発生しました。Vercelログを確認してください。',
        lineEnabled,
      });
    }
  } catch (error) {
    sendServerError(res, 'テストメッセージの送信に失敗しました', error);
  }
});

// LINE通知設定状態を確認
router.get('/line-status', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    // 店舗のLINE認証情報確認
    const storeResult = await pool.query(
      `SELECT line_channel_id, line_channel_secret, line_channel_access_token 
       FROM stores WHERE id = $1`,
      [req.storeId]
    );

    const store = storeResult.rows[0];
    const hasCredentials = !!(
      store?.line_channel_id &&
      store?.line_channel_secret &&
      store?.line_channel_access_token
    );

    // 通知設定確認
    const settingsResult = await pool.query(
      `SELECT line_notification_enabled, record_notification 
       FROM notification_settings WHERE store_id = $1`,
      [req.storeId]
    );

    const settings = settingsResult.rows[0];

    // LINE連携済み飼い主数
    const linkedOwnersResult = await pool.query(
      `SELECT COUNT(*) as count FROM owners 
       WHERE store_id = $1 AND line_id IS NOT NULL AND line_id != '' AND deleted_at IS NULL`,
      [req.storeId]
    );

    res.json({
      hasLineCredentials: hasCredentials,
      lineNotificationEnabled: settings?.line_notification_enabled ?? false,
      recordNotificationEnabled: settings?.record_notification ?? true,
      linkedOwnersCount: parseInt(linkedOwnersResult.rows[0]?.count || '0'),
    });
  } catch (error) {
    sendServerError(res, 'LINE設定状態の確認に失敗しました', error);
  }
});

export default router;
