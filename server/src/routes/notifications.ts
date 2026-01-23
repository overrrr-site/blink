import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireStoreId, sendServerError } from '../utils/response.js';

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
    console.error('Error fetching notification settings:', error);
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
      journal_notification,
      vaccine_alert,
      vaccine_alert_days,
      line_notification_enabled,
      email_notification_enabled,
    } = req.body;

    // 既存の設定を確認
    const existing = await pool.query(
      `SELECT id FROM notification_settings WHERE store_id = $1`,
      [req.storeId]
    );

    let result;
    if (existing.rows.length === 0) {
      // 新規作成
      result = await pool.query(
        `INSERT INTO notification_settings (
          store_id, reminder_before_visit, reminder_before_visit_days,
          journal_notification, vaccine_alert, vaccine_alert_days,
          line_notification_enabled, email_notification_enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          req.storeId,
          reminder_before_visit ?? true,
          reminder_before_visit_days ?? 1,
          journal_notification ?? true,
          vaccine_alert ?? true,
          vaccine_alert_days ?? 14,
          line_notification_enabled ?? false,
          email_notification_enabled ?? false,
        ]
      );
    } else {
      // 更新
      result = await pool.query(
        `UPDATE notification_settings SET
          reminder_before_visit = COALESCE($1, reminder_before_visit),
          reminder_before_visit_days = COALESCE($2, reminder_before_visit_days),
          journal_notification = COALESCE($3, journal_notification),
          vaccine_alert = COALESCE($4, vaccine_alert),
          vaccine_alert_days = COALESCE($5, vaccine_alert_days),
          line_notification_enabled = COALESCE($6, line_notification_enabled),
          email_notification_enabled = COALESCE($7, email_notification_enabled),
          updated_at = CURRENT_TIMESTAMP
        WHERE store_id = $8
        RETURNING *`,
        [
          reminder_before_visit,
          reminder_before_visit_days,
          journal_notification,
          vaccine_alert,
          vaccine_alert_days,
          line_notification_enabled,
          email_notification_enabled,
          req.storeId,
        ]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating notification settings:', error);
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
    const params: any[] = [req.storeId];
    let paramIndex = 2;

    if (notification_type) {
      query += ` AND nl.notification_type = $${paramIndex}`;
      params.push(notification_type);
      paramIndex++;
    }

    if (status) {
      query += ` AND nl.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // 総件数取得
    const countResult = await pool.query(
      query.replace('SELECT nl.*, o.name as owner_name', 'SELECT COUNT(*) as total'),
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
    console.error('Error fetching notification logs:', error);
    sendServerError(res, '通知ログの取得に失敗しました', error);
  }
});

export default router;
