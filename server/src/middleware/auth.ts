import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
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

// JWKS（公開鍵セット）によるローカル検証（ES256対応）
const SUPABASE_URL = process.env.SUPABASE_URL || '';

// JWKS clientは起動時に1回だけ作成（公開鍵は自動キャッシュ・ローテーション対応）
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
if (SUPABASE_URL) {
  const jwksUrl = new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
  jwks = createRemoteJWKSet(jwksUrl);
  console.log('[AUTH] JWKS endpoint configured:', jwksUrl.toString());
}

interface SupabaseJwtPayload {
  sub: string; // auth user id
  email?: string;
  exp?: number;
}

async function verifyTokenLocally(token: string): Promise<SupabaseJwtPayload | null> {
  if (!jwks) return null;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${SUPABASE_URL}/auth/v1`,
    });
    return payload as unknown as SupabaseJwtPayload;
  } catch (err: any) {
    console.warn('[AUTH] JWKS verify error:', err?.message);
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

    // 1. JWKS公開鍵でローカル検証（Supabase APIコール不要で高速）
    let authUserId: string | null = null;

    const localPayload = await verifyTokenLocally(token);
    if (localPayload) {
      authUserId = localPayload.sub;
    } else {
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
