import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabase.js';
import pool from '../db/connection.js';

export interface AuthRequest extends Request {
  userId?: number;
  storeId?: number;
  supabaseUserId?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: '認証トークンが提供されていません' });
    }

    // Supabaseが設定されていない場合はエラー
    if (!supabase) {
      console.error('認証エラー: Supabaseクライアントが初期化されていません');
      return res.status(500).json({ 
        error: '認証システムが設定されていません',
        details: 'SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を確認してください'
      });
    }

    // Supabase Auth でトークンを検証
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError) {
      console.error('Supabase認証エラー:', authError);
      return res.status(401).json({ 
        error: '無効な認証トークンです',
        details: authError.message 
      });
    }

    if (!user) {
      console.error('認証エラー: ユーザーが見つかりません');
      return res.status(401).json({ error: 'ユーザーが見つかりません' });
    }

    // スタッフ情報をデータベースから取得
    const result = await pool.query(
      `SELECT s.*, ss.store_id 
       FROM staff s
       LEFT JOIN staff_stores ss ON s.id = ss.staff_id
       WHERE s.auth_user_id = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      console.error(`認証エラー: スタッフが見つかりません (auth_user_id: ${user.id}, email: ${user.email})`);
      return res.status(403).json({ 
        error: 'スタッフとして登録されていません。管理者に連絡してください。',
        details: `auth_user_id: ${user.id} に対応するスタッフが見つかりません`
      });
    }

    const staff = result.rows[0];
    req.userId = staff.id;
    req.storeId = staff.store_id;
    req.supabaseUserId = user.id;
    next();
  } catch (error: any) {
    console.error('認証エラー:', error);
    console.error('エラー詳細:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    return res.status(500).json({ 
      error: '認証に失敗しました',
      details: error?.message || '不明なエラーが発生しました'
    });
  }
};
