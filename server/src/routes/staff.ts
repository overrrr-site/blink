import express from 'express';
import pool from '../db/connection.js';
import { authenticate, requireOwner, AuthRequest } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import {
  requireStoreId,
  sendBadRequest,
  sendNotFound,
  sendServerError,
} from '../utils/response.js';

const router = express.Router();
router.use(authenticate);
router.use(requireOwner); // スタッフ管理は管理者のみ

// スタッフ一覧取得
router.get('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const result = await pool.query(
      `SELECT s.*, 
              CASE WHEN ss.staff_id IS NOT NULL THEN TRUE ELSE FALSE END as is_owner
       FROM staff s
       LEFT JOIN staff_stores ss ON s.id = ss.staff_id AND ss.store_id = $1
       WHERE ss.store_id = $1 OR s.id IN (
         SELECT staff_id FROM staff_stores WHERE store_id = $1
       )
       ORDER BY s.created_at DESC`,
      [req.storeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching staff:', error);
    sendServerError(res, 'スタッフ一覧の取得に失敗しました', error);
  }
});

// スタッフ詳細取得
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT s.* FROM staff s
       JOIN staff_stores ss ON s.id = ss.staff_id
       WHERE s.id = $1 AND ss.store_id = $2`,
      [id, req.storeId]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, 'スタッフが見つかりません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching staff:', error);
    sendServerError(res, 'スタッフ情報の取得に失敗しました', error);
  }
});

// スタッフ作成
router.post('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { name, email, password, is_owner } = req.body;

    if (!name || !email || !password) {
      sendBadRequest(res, '必須項目が不足しています');
      return;
    }

    // メールアドレスの重複チェック
    const existingStaff = await pool.query(
      `SELECT id FROM staff WHERE email = $1`,
      [email]
    );

    if (existingStaff.rows.length > 0) {
      sendBadRequest(res, 'このメールアドレスは既に登録されています');
      return;
    }

    // パスワードをハッシュ化
    const passwordHash = await bcrypt.hash(password, 10);

    // スタッフを作成
    const staffResult = await pool.query(
      `INSERT INTO staff (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, email, passwordHash]
    );

    const staff = staffResult.rows[0];

    // 店舗との関連を作成
    await pool.query(
      `INSERT INTO staff_stores (staff_id, store_id)
       VALUES ($1, $2)`,
      [staff.id, req.storeId]
    );

    // オーナーの場合は既存のオーナーを削除（1店舗1オーナー）
    if (is_owner) {
      await pool.query(
        `DELETE FROM staff_stores 
         WHERE store_id = $1 
         AND staff_id IN (
           SELECT staff_id FROM staff_stores 
           WHERE store_id = $1 
           AND staff_id != $2
         )`,
        [req.storeId, staff.id]
      );
    }

    res.status(201).json({
      ...staff,
      password_hash: undefined, // パスワードハッシュは返さない
    });
  } catch (error) {
    console.error('Error creating staff:', error);
    sendServerError(res, 'スタッフの作成に失敗しました', error);
  }
});

// スタッフ更新
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, is_owner } = req.body;

    if (!requireStoreId(req, res)) {
      return;
    }

    // スタッフのstore_idを確認
    const staffCheck = await pool.query(
      `SELECT s.id FROM staff s
       JOIN staff_stores ss ON s.id = ss.staff_id
       WHERE s.id = $1 AND ss.store_id = $2`,
      [id, req.storeId]
    );

    if (staffCheck.rows.length === 0) {
      sendNotFound(res, 'スタッフが見つかりません');
      return;
    }

    // メールアドレスの重複チェック（自分以外）
    if (email) {
      const existingStaff = await pool.query(
        `SELECT id FROM staff WHERE email = $1 AND id != $2`,
        [email, id]
      );

      if (existingStaff.rows.length > 0) {
        sendBadRequest(res, 'このメールアドレスは既に登録されています');
        return;
      }
    }

    // 更新データを構築
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(passwordHash);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE staff SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({
      ...result.rows[0],
      password_hash: undefined,
    });
  } catch (error) {
    console.error('Error updating staff:', error);
    sendServerError(res, 'スタッフ情報の更新に失敗しました', error);
  }
});

// スタッフ削除
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (!requireStoreId(req, res)) {
      return;
    }

    // スタッフのstore_idを確認
    const staffCheck = await pool.query(
      `SELECT s.id FROM staff s
       JOIN staff_stores ss ON s.id = ss.staff_id
       WHERE s.id = $1 AND ss.store_id = $2`,
      [id, req.storeId]
    );

    if (staffCheck.rows.length === 0) {
      sendNotFound(res, 'スタッフが見つかりません');
      return;
    }

    // 自分自身は削除できない
    if (parseInt(id, 10) === req.userId) {
      sendBadRequest(res, '自分自身を削除することはできません');
      return;
    }

    // 店舗との関連を削除
    await pool.query(
      `DELETE FROM staff_stores WHERE staff_id = $1 AND store_id = $2`,
      [id, req.storeId]
    );

    // 他の店舗との関連がない場合はスタッフも削除
    const otherStores = await pool.query(
      `SELECT COUNT(*) as count FROM staff_stores WHERE staff_id = $1`,
      [id]
    );

    if (parseInt(otherStores.rows[0].count, 10) === 0) {
      await pool.query(`DELETE FROM staff WHERE id = $1`, [id]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting staff:', error);
    sendServerError(res, 'スタッフの削除に失敗しました', error);
  }
});

export default router;
