import express from 'express';
import pool from '../db/connection.js';
import { supabase } from '../db/supabase.js';
import { authenticate, requireOwner, AuthRequest } from '../middleware/auth.js';
import { requireStoreId, sendBadRequest, sendServerError } from '../utils/response.js';

const router = express.Router();

// 現在のログインユーザーのスタッフ情報を取得
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    // ミドルウェアで取得済みのデータを再利用（二重クエリ解消）
    if (!req.staffData) {
      return res.status(400).json({ error: 'スタッフデータが設定されていません' });
    }

    // 店舗の業態情報とオンボーディング状態を取得
    let storeInfo = null;
    if (req.storeId) {
      const storeResult = await pool.query(
        `SELECT business_types, primary_business_type, onboarding_completed FROM stores WHERE id = $1`,
        [req.storeId]
      );
      if (storeResult.rows.length > 0) {
        storeInfo = {
          businessTypes: storeResult.rows[0].business_types || ['daycare'],
          primaryBusinessType: storeResult.rows[0].primary_business_type || 'daycare',
          onboardingCompleted: storeResult.rows[0].onboarding_completed ?? true,
        };
      }
    }

    res.json({
      id: req.staffData.id,
      email: req.staffData.email,
      name: req.staffData.name,
      storeId: req.staffData.store_id,
      isOwner: req.staffData.is_owner,
      ...storeInfo,
    });
  } catch (error: any) {
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
    sendServerError(res, 'スタッフ一覧の取得に失敗しました', error);
  }
});

// スタッフ招待（管理者のみ）
router.post('/invite', authenticate, requireOwner, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { email, name, is_owner } = req.body;

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
      `INSERT INTO staff (email, name, auth_user_id, is_owner)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [email, name, data.user?.id, is_owner || false]
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
    sendServerError(res, 'スタッフの招待に失敗しました', error);
  }
});

// オンボーディング完了（業態設定）
router.post('/complete-onboarding', authenticate, requireOwner, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { businessTypes, primaryBusinessType } = req.body;

    if (!businessTypes || !Array.isArray(businessTypes) || businessTypes.length === 0) {
      sendBadRequest(res, '業態を1つ以上選択してください');
      return;
    }

    const validTypes = ['daycare', 'grooming', 'hotel'];
    const invalidTypes = businessTypes.filter((t: string) => !validTypes.includes(t));
    if (invalidTypes.length > 0) {
      sendBadRequest(res, '無効な業態が含まれています');
      return;
    }

    // primaryBusinessTypeが指定されていなければ最初の選択を使用
    const primary = primaryBusinessType && businessTypes.includes(primaryBusinessType)
      ? primaryBusinessType
      : businessTypes[0];

    await pool.query(
      `UPDATE stores SET
         business_types = $2,
         primary_business_type = $3,
         onboarding_completed = TRUE
       WHERE id = $1`,
      [req.storeId, businessTypes, primary]
    );

    res.json({
      success: true,
      businessTypes,
      primaryBusinessType: primary,
    });
  } catch (error) {
    sendServerError(res, 'オンボーディングの完了に失敗しました', error);
  }
});

// 招待の再送信（管理者のみ）
router.post('/resend-invite', authenticate, requireOwner, async (req: AuthRequest, res) => {
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
    sendServerError(res, '招待メールの再送信に失敗しました', error);
  }
});

export default router;
