import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  requireStoreId,
  sendBadRequest,
  sendNotFound,
  sendServerError,
} from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

// 店舗情報取得
router.get('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const result = await pool.query(
      `SELECT id, name, address, phone, business_hours, closed_days, created_at, updated_at
       FROM stores WHERE id = $1`,
      [req.storeId]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, '店舗が見つかりません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching store:', error);
    sendServerError(res, '店舗情報の取得に失敗しました', error);
  }
});

// 店舗情報更新
router.put('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { name, address, phone, business_hours, closed_days } = req.body;

    // 更新するフィールドを動的に構築
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(name)
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`)
      values.push(address)
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`)
      values.push(phone)
    }
    if (business_hours !== undefined) {
      updates.push(`business_hours = $${paramIndex++}::jsonb`)
      values.push(business_hours ? JSON.stringify(business_hours) : null)
    }
    if (closed_days !== undefined) {
      updates.push(`closed_days = $${paramIndex++}::jsonb`)
      values.push(closed_days && Array.isArray(closed_days) ? JSON.stringify(closed_days) : null)
    }

    if (updates.length === 0) {
      sendBadRequest(res, '更新する項目がありません')
      return
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(req.storeId)

    const result = await pool.query(
      `UPDATE stores SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, address, phone, business_hours, closed_days, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      sendNotFound(res, '店舗が見つかりません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating store:', error);
    sendServerError(res, '店舗情報の更新に失敗しました', error);
  }
});

export default router;
