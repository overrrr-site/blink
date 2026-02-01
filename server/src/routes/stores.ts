import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { cacheControl } from '../middleware/cache.js';
import {
  requireStoreId,
  sendBadRequest,
  sendNotFound,
  sendServerError,
} from '../utils/response.js';
import { clearStoreLineClientCache } from '../services/lineMessagingService.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const router = express.Router();
router.use(authenticate);

// 店舗情報取得
router.get('/', cacheControl(30, 60), async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const result = await pool.query(
      `SELECT id, name, address, phone, business_hours, closed_days, 
              line_channel_id, line_channel_secret, line_channel_access_token,
              created_at, updated_at
       FROM stores WHERE id = $1`,
      [req.storeId]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, '店舗が見つかりません');
      return;
    }

    const store = result.rows[0];
    
    // LINE設定をマスク表示（セキュリティのため）
    const response = {
      ...store,
      line_channel_id: store.line_channel_id ? `${store.line_channel_id.substring(0, 4)}...` : null,
      line_channel_secret: store.line_channel_secret ? `${store.line_channel_secret.substring(0, 4)}...` : null,
      line_channel_access_token: store.line_channel_access_token ? `${store.line_channel_access_token.substring(0, 8)}...` : null,
      line_connected: !!(store.line_channel_id && store.line_channel_secret && store.line_channel_access_token),
    };

    res.json(response);
  } catch (error) {
    sendServerError(res, '店舗情報の取得に失敗しました', error);
  }
});

// 店舗情報更新
router.put('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { name, address, phone, business_hours, closed_days, 
            line_channel_id, line_channel_secret, line_channel_access_token } = req.body;

    // 更新するフィールドを動的に構築
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;
    let lineSettingsUpdated = false;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(address);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (business_hours !== undefined) {
      updates.push(`business_hours = $${paramIndex++}::jsonb`);
      values.push(business_hours ? JSON.stringify(business_hours) : null);
    }
    if (closed_days !== undefined) {
      updates.push(`closed_days = $${paramIndex++}::jsonb`);
      values.push(closed_days && Array.isArray(closed_days) ? JSON.stringify(closed_days) : null);
    }
    if (line_channel_id !== undefined) {
      updates.push(`line_channel_id = $${paramIndex++}`);
      values.push(line_channel_id || null);
      lineSettingsUpdated = true;
    }
    if (line_channel_secret !== undefined) {
      // シークレットは暗号化して保存
      updates.push(`line_channel_secret = $${paramIndex++}`);
      values.push(line_channel_secret ? encrypt(line_channel_secret) : null);
      lineSettingsUpdated = true;
    }
    if (line_channel_access_token !== undefined) {
      // アクセストークンは暗号化して保存
      updates.push(`line_channel_access_token = $${paramIndex++}`);
      values.push(line_channel_access_token ? encrypt(line_channel_access_token) : null);
      lineSettingsUpdated = true;
    }

    if (updates.length === 0) {
      sendBadRequest(res, '更新する項目がありません');
      return;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.storeId);

    const result = await pool.query(
      `UPDATE stores SET ${updates.join(', ')} WHERE id = $${paramIndex} 
       RETURNING id, name, address, phone, business_hours, closed_days, 
                 line_channel_id, line_channel_secret, line_channel_access_token,
                 created_at, updated_at`,
      values
    );

    // LINE設定が更新された場合はキャッシュをクリア
    if (lineSettingsUpdated) {
      clearStoreLineClientCache(req.storeId);
    }

    if (result.rows.length === 0) {
      sendNotFound(res, '店舗が見つかりません');
      return;
    }

    const store = result.rows[0];
    
    // LINE設定をマスク表示（セキュリティのため）
    const response = {
      ...store,
      line_channel_id: store.line_channel_id ? `${store.line_channel_id.substring(0, 4)}...` : null,
      line_channel_secret: store.line_channel_secret ? `${store.line_channel_secret.substring(0, 4)}...` : null,
      line_channel_access_token: store.line_channel_access_token ? `${store.line_channel_access_token.substring(0, 8)}...` : null,
      line_connected: !!(store.line_channel_id && store.line_channel_secret && store.line_channel_access_token),
    };

    res.json(response);
  } catch (error) {
    sendServerError(res, '店舗情報の更新に失敗しました', error);
  }
});

export default router;
