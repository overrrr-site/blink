import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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

// JWT secretによるローカル検証（Supabase APIコール不要で高速）
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';

interface SupabaseJwtPayload {
  sub: string; // auth user id
  email?: string;
  exp?: number;
}

function verifyTokenLocally(token: string): SupabaseJwtPayload | null {
  if (!SUPABASE_JWT_SECRET) return null;
  try {
    const payload = jwt.verify(token, SUPABASE_JWT_SECRET, {
      algorithms: ['HS256', 'HS384', 'HS512'],
    }) as SupabaseJwtPayload;
    return payload;
  } catch (err: any) {
    // トークンヘッダーのアルゴリズムを確認
    try {
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
      console.warn('[AUTH] JWT local verify error:', err?.message, '| token alg:', header.alg);
    } catch {
      console.warn('[AUTH] JWT local verify error:', err?.message);
    }
    return null;
  }
}

// スタッフ情報のインメモリキャッシュ
const staffCache = new Map<string, { data: StaffData; expiry: number }>();
const STAFF_CACHE_TTL = 5 * 60 * 1000; // 5分
const STAFF_CACHE_MAX_SIZE = 500;

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

    // 1. JWTをローカル検証（SUPABASE_JWT_SECRETがある場合、API不要で高速）
    let authUserId: string | null = null;

    const localPayload = verifyTokenLocally(token);
    if (localPayload) {
      authUserId = localPayload.sub;
      console.log('[AUTH] JWT local verify OK');
    } else {
      console.log('[AUTH] JWT local verify failed, falling back to Supabase API', SUPABASE_JWT_SECRET ? '(secret set)' : '(no secret)');
      // 2. フォールバック: Supabase Auth APIで検証
      if (!supabase) {
        console.error('認証エラー: Supabaseクライアントが初期化されていません');
        return res.status(500).json({
          error: '認証システムが設定されていません',
          details: 'SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を確認してください'
        });
      }

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

      authUserId = user.id;
    }

    // 3. キャッシュからスタッフ情報を取得（ヒットすればDB不要）
    const cachedStaff = getStaffFromCache(authUserId);
    if (cachedStaff) {
      console.log('[AUTH] Staff cache HIT');
      req.userId = cachedStaff.id;
      req.storeId = cachedStaff.store_id;
      req.supabaseUserId = authUserId;
      req.isOwner = cachedStaff.is_owner;
      req.staffData = cachedStaff;
      return next();
    }

    // 4. スタッフ情報をデータベースから取得
    const result = await pool.query(
      `SELECT s.*, ss.store_id
       FROM staff s
       LEFT JOIN staff_stores ss ON s.id = ss.staff_id
       WHERE s.auth_user_id = $1`,
      [authUserId]
    );

    if (result.rows.length === 0) {
      console.error(`認証エラー: スタッフが見つかりません (auth_user_id: ${authUserId})`);
      return res.status(403).json({
        error: 'スタッフとして登録されていません。管理者に連絡してください。',
        details: `auth_user_id: ${authUserId} に対応するスタッフが見つかりません`
      });
    }

    const staff = result.rows[0] as StaffData;
    req.userId = staff.id;
    req.storeId = staff.store_id;
    req.supabaseUserId = authUserId;
    req.isOwner = staff.is_owner || false;
    const staffData: StaffData = {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      is_owner: staff.is_owner || false,
      store_id: staff.store_id
    };
    req.staffData = staffData;
    setStaffCache(authUserId, staffData);
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
