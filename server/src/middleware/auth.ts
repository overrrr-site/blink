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
      return res.status(500).json({ error: '認証システムが設定されていません' });
    }

    // Supabase Auth でトークンを検証
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: '無効な認証トークンです' });
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
      return res.status(403).json({ 
        error: 'スタッフとして登録されていません。管理者に連絡してください。' 
      });
    }

    const staff = result.rows[0];
    req.userId = staff.id;
    req.storeId = staff.store_id;
    req.supabaseUserId = user.id;
    next();
  } catch (error) {
    console.error('認証エラー:', error);
    return res.status(401).json({ error: '認証に失敗しました' });
  }
};
