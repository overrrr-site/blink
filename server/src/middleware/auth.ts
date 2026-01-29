import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabase.js';
import pool from '../db/connection.js';

interface StaffData {
  id: number;
  email: string;
  name: string;
  is_owner: boolean;
  store_id: number;
}

export interface AuthRequest extends Request {
  userId?: number;
  storeId?: number;
  supabaseUserId?: string;
  isOwner?: boolean;
  staffData?: StaffData;
}

// スタッフ情報のインメモリキャッシュ（Vercel環境では再利用される可能性あり）
const staffCache = new Map<string, { data: StaffData; expiry: number }>();
const STAFF_CACHE_TTL = 5 * 60 * 1000; // 5分
const STAFF_CACHE_MAX_SIZE = 100;

function getStaffFromCache(authUserId: string): StaffData | null {
  const entry = staffCache.get(authUserId);
  if (entry && entry.expiry > Date.now()) {
    return entry.data;
  }
  if (entry) {
    staffCache.delete(authUserId); // 期限切れを削除
  }
  return null;
}

function setStaffCache(authUserId: string, data: StaffData) {
  // キャッシュサイズ制限
  if (staffCache.size >= STAFF_CACHE_MAX_SIZE) {
    const firstKey = staffCache.keys().next().value as string | undefined;
    if (firstKey) {
      staffCache.delete(firstKey);
    }
  }
  staffCache.set(authUserId, { data, expiry: Date.now() + STAFF_CACHE_TTL });
}

export function invalidateStaffCache(authUserId?: string) {
  if (authUserId) {
    staffCache.delete(authUserId);
  } else {
    staffCache.clear();
  }
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

    const cachedStaff = getStaffFromCache(user.id);
    if (cachedStaff) {
      req.userId = cachedStaff.id;
      req.storeId = cachedStaff.store_id;
      req.supabaseUserId = user.id;
      req.isOwner = cachedStaff.is_owner;
      req.staffData = cachedStaff;
      return next();
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

    const staff = result.rows[0] as StaffData;
    req.userId = staff.id;
    req.storeId = staff.store_id;
    req.supabaseUserId = user.id;
    req.isOwner = staff.is_owner || false;
    const staffData: StaffData = {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      is_owner: staff.is_owner || false,
      store_id: staff.store_id
    };
    req.staffData = staffData;
    setStaffCache(user.id, staffData);
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

// 管理者専用ミドルウェア（authenticateの後に使用）
export const requireOwner = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.isOwner) {
    return res.status(403).json({ error: 'この操作は管理者のみ実行できます' });
  }
  next();
};
