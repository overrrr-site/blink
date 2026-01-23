import express from 'express';
import pool from '../db/connection.js';
import { supabase } from '../db/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireStoreId, sendBadRequest, sendServerError } from '../utils/response.js';

const router = express.Router();

// 現在のログインユーザーのスタッフ情報を取得
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(400).json({ error: 'ユーザーIDが設定されていません' });
    }

    const result = await pool.query(
      `SELECT s.id, s.email, s.name, ss.store_id
       FROM staff s
       LEFT JOIN staff_stores ss ON s.id = ss.staff_id
       WHERE s.id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      console.error(`スタッフ情報が見つかりません (userId: ${req.userId})`);
      return res.status(404).json({ error: 'スタッフ情報が見つかりません' });
    }

    const staff = result.rows[0];
    res.json({
      id: staff.id,
      email: staff.email,
      name: staff.name,
      storeId: staff.store_id,
    });
  } catch (error: any) {
    console.error('Error fetching staff info:', error);
    console.error('エラー詳細:', {
      message: error?.message,
      stack: error?.stack,
      userId: req.userId
    });
    sendServerError(res, 'スタッフ情報の取得に失敗しました', error);
  }
});

// 同じ店舗のスタッフ一覧取得
router.get('/staff', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const result = await pool.query(
      `SELECT s.id, s.name, s.email
       FROM staff s
       JOIN staff_stores ss ON s.id = ss.staff_id
       WHERE ss.store_id = $1
       ORDER BY s.name`,
      [req.storeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching staff:', error);
    sendServerError(res, 'スタッフ一覧の取得に失敗しました', error);
  }
});

// スタッフ招待（管理者のみ）
router.post('/invite', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { email, name } = req.body;

    if (!email || !name) {
      sendBadRequest(res, 'メールアドレスと名前が必要です');
      return;
    }

    // Supabaseが設定されていない場合はエラー
    if (!supabase) {
      return res.status(500).json({ error: '認証システムが設定されていません' });
    }

    // 既存のスタッフをチェック
    const existingStaff = await pool.query(
      'SELECT id FROM staff WHERE email = $1',
      [email]
    );

    if (existingStaff.rows.length > 0) {
      return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
    }

    // Supabase Admin APIで招待メールを送信
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`,
    });

    if (error) {
      console.error('Supabase invite error:', error);
      return res.status(500).json({ error: '招待メールの送信に失敗しました' });
    }

    // スタッフレコードを作成（auth_user_idは招待受諾後に設定される）
    const result = await pool.query(
      `INSERT INTO staff (email, name, auth_user_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [email, name, data.user?.id]
    );

    const staffId = result.rows[0].id;

    // スタッフと店舗の関連付け
    await pool.query(
      `INSERT INTO staff_stores (staff_id, store_id)
       VALUES ($1, $2)`,
      [staffId, req.storeId]
    );

    res.json({
      success: true,
      message: `${email} に招待メールを送信しました`,
      staffId,
    });
  } catch (error) {
    console.error('Error inviting staff:', error);
    sendServerError(res, 'スタッフの招待に失敗しました', error);
  }
});

// 招待の再送信
router.post('/resend-invite', authenticate, async (req: AuthRequest, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      sendBadRequest(res, 'メールアドレスが必要です');
      return;
    }

    if (!supabase) {
      return res.status(500).json({ error: '認証システムが設定されていません' });
    }

    // スタッフが存在するか確認
    const staffResult = await pool.query(
      'SELECT id FROM staff WHERE email = $1',
      [email]
    );

    if (staffResult.rows.length === 0) {
      return res.status(404).json({ error: 'スタッフが見つかりません' });
    }

    // 招待メールを再送信
    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`,
    });

    if (error) {
      console.error('Supabase resend invite error:', error);
      return res.status(500).json({ error: '招待メールの再送信に失敗しました' });
    }

    res.json({
      success: true,
      message: `${email} に招待メールを再送信しました`,
    });
  } catch (error) {
    console.error('Error resending invite:', error);
    sendServerError(res, '招待メールの再送信に失敗しました', error);
  }
});

export default router;
