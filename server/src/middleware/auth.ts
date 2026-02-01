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

function attachStaffToRequest(req: AuthRequest, authUserId: string, staff: StaffData): void {
  req.userId = staff.id;
  req.storeId = staff.store_id;
  req.supabaseUserId = authUserId;
  req.isOwner = staff.is_owner;
  req.staffData = staff;
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
  } catch (err) {
    console.warn('[AUTH] JWKS verify error:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// スタッフ情報のインメモリキャッシュ
const staffCache = new Map<string, { data: StaffData; expiry: number }>();
const STAFF_CACHE_TTL = 5 * 60 * 1000; // 5分
const STAFF_CACHE_MAX_SIZE = 500;

function getStaffFromCache(authUserId: string): StaffData | null {
  const entry = staffCache.get(authUserId);
  if (!entry) return null;

  if (entry.expiry > Date.now()) return entry.data;

  staffCache.delete(authUserId);
  return null;
}

function setStaffCache(authUserId: string, data: StaffData): void {
  if (staffCache.size >= STAFF_CACHE_MAX_SIZE) {
    const oldestKey = staffCache.keys().next().value;
    if (oldestKey) staffCache.delete(oldestKey);
  }
  staffCache.set(authUserId, { data, expiry: Date.now() + STAFF_CACHE_TTL });
}

export function invalidateStaffCache(authUserId?: string): void {
  if (authUserId) {
    staffCache.delete(authUserId);
  } else {
    staffCache.clear();
  }
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: '認証トークンが提供されていません' });
      return;
    }

    // 1. JWKS公開鍵でローカル検証（Supabase APIコール不要で高速）
    const authUserId = await resolveAuthUserId(token, res);
    if (!authUserId) return;

    // 2. キャッシュからスタッフ情報を取得（ヒットすればDB不要）
    const cachedStaff = getStaffFromCache(authUserId);
    if (cachedStaff) {
      attachStaffToRequest(req, authUserId, cachedStaff);
      next();
      return;
    }

    // 3. スタッフ情報をデータベースから取得
    const result = await pool.query(
      `SELECT s.*, ss.store_id
       FROM staff s
       LEFT JOIN staff_stores ss ON s.id = ss.staff_id
       WHERE s.auth_user_id = $1`,
      [authUserId]
    );

    if (result.rows.length === 0) {
      console.error(`認証エラー: スタッフが見つかりません (auth_user_id: ${authUserId})`);
      res.status(403).json({
        error: 'スタッフとして登録されていません。管理者に連絡してください。',
        details: `auth_user_id: ${authUserId} に対応するスタッフが見つかりません`
      });
      return;
    }

    const row = result.rows[0];
    const staffData: StaffData = {
      id: row.id,
      email: row.email,
      name: row.name,
      is_owner: row.is_owner ?? false,
      store_id: row.store_id
    };
    attachStaffToRequest(req, authUserId, staffData);
    setStaffCache(authUserId, staffData);
    next();
  } catch (error) {
    console.error('認証エラー:', error);
    res.status(500).json({
      error: '認証に失敗しました',
      details: error instanceof Error ? error.message : '不明なエラーが発生しました',
    });
  }
}

/**
 * トークンからauth user IDを解決する。
 * JWKS検証を試み、失敗時はSupabase Auth APIにフォールバックする。
 * 認証失敗時はレスポンスを送信してnullを返す。
 */
async function resolveAuthUserId(token: string, res: Response): Promise<string | null> {
  const localPayload = await verifyTokenLocally(token);
  if (localPayload) {
    return localPayload.sub;
  }

  // フォールバック: Supabase Auth APIで検証
  if (!supabase) {
    console.error('認証エラー: Supabaseクライアントが初期化されていません');
    res.status(500).json({
      error: '認証システムが設定されていません',
      details: 'SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を確認してください'
    });
    return null;
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError) {
    console.error('Supabase認証エラー:', authError);
    res.status(401).json({
      error: '無効な認証トークンです',
      details: authError.message
    });
    return null;
  }

  if (!user) {
    console.error('認証エラー: ユーザーが見つかりません');
    res.status(401).json({ error: 'ユーザーが見つかりません' });
    return null;
  }

  return user.id;
}

// 管理者専用ミドルウェア（authenticateの後に使用）
export function requireOwner(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.isOwner) {
    res.status(403).json({ error: 'この操作は管理者のみ実行できます' });
    return;
  }
  next();
}
