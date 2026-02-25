import express from 'express';
import pool from '../db/connection.js';
import { supabase } from '../db/supabase.js';
import { authenticate, requireOwner, AuthRequest, invalidateStaffCache } from '../middleware/auth.js';
import { requireStoreId, sendBadRequest, sendServerError } from '../utils/response.js';

const router = express.Router();

// 新規店舗・アカウント登録（認証不要）
router.post('/register', async (req, res) => {
  try {
    const { storeName, ownerName, email, password, businessTypes, primaryBusinessType } = req.body;

    // バリデーション
    if (!storeName || !ownerName || !email || !password || !businessTypes) {
      sendBadRequest(res, '全ての項目を入力してください');
      return;
    }

    if (typeof storeName !== 'string' || storeName.trim().length === 0 || storeName.length > 255) {
      sendBadRequest(res, '店舗名は1〜255文字で入力してください');
      return;
    }

    if (typeof ownerName !== 'string' || ownerName.trim().length === 0 || ownerName.length > 100) {
      sendBadRequest(res, '名前は1〜100文字で入力してください');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      sendBadRequest(res, '有効なメールアドレスを入力してください');
      return;
    }

    if (typeof password !== 'string' || password.length < 8) {
      sendBadRequest(res, 'パスワードは8文字以上で入力してください');
      return;
    }

    const validTypes = ['daycare', 'grooming', 'hotel'];
    if (!Array.isArray(businessTypes) || businessTypes.length === 0) {
      sendBadRequest(res, '業態を1つ以上選択してください');
      return;
    }
    const invalidTypes = businessTypes.filter((t: string) => !validTypes.includes(t));
    if (invalidTypes.length > 0) {
      sendBadRequest(res, '無効な業態が含まれています');
      return;
    }

    const primary = primaryBusinessType && businessTypes.includes(primaryBusinessType)
      ? primaryBusinessType
      : businessTypes[0];

    if (!supabase) {
      return res.status(500).json({ error: '認証システムが設定されていません' });
    }

    // 既存メールチェック
    const existingStaff = await pool.query(
      'SELECT id FROM staff WHERE email = $1',
      [email]
    );
    if (existingStaff.rows.length > 0) {
      return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
    }

    // Supabase認証ユーザー作成
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Supabase createUser error:', authError);
      if (authError.message?.includes('already been registered')) {
        return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
      }
      return res.status(500).json({ error: 'アカウントの作成に失敗しました' });
    }

    const authUserId = authData.user.id;

    // トランザクションで店舗・スタッフ・関連を一括作成
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const storeResult = await client.query(
        `INSERT INTO stores (name, business_types, primary_business_type, onboarding_completed)
         VALUES ($1, $2, $3, TRUE)
         RETURNING id`,
        [storeName.trim(), businessTypes, primary]
      );
      const storeId = storeResult.rows[0].id;

      const staffResult = await client.query(
        `INSERT INTO staff (email, name, auth_user_id, is_owner)
         VALUES ($1, $2, $3, TRUE)
         RETURNING id`,
        [email, ownerName.trim(), authUserId]
      );
      const staffId = staffResult.rows[0].id;

      await client.query(
        `INSERT INTO staff_stores (staff_id, store_id)
         VALUES ($1, $2)`,
        [staffId, storeId]
      );

      await client.query('COMMIT');

      // 登録直後にキャッシュを無効化（古いデータが返されるのを防止）
      invalidateStaffCache(authUserId);

      res.status(201).json({ success: true, message: 'アカウントが作成されました' });
    } catch (dbError) {
      await client.query('ROLLBACK');
      // Supabaseユーザーをクリーンアップ
      try {
        await supabase.auth.admin.deleteUser(authUserId);
      } catch (cleanupError) {
        console.error('Failed to cleanup Supabase user after DB error:', cleanupError);
      }
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    sendServerError(res, 'アカウントの作成に失敗しました', error);
  }
});

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
      assignedBusinessTypes: req.staffData.assigned_business_types,
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

    const { email, name, is_owner, assigned_business_types } = req.body;

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
      `INSERT INTO staff (email, name, auth_user_id, is_owner, assigned_business_types)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [email, name, data.user?.id, is_owner || false, assigned_business_types || null]
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
