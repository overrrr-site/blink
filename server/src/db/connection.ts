// ローカル開発用: PostgreSQL直接接続
// 本番環境: Supabase接続（オプション）
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// 接続文字列の取得（優先順位）
// 1. DATABASE_URL（ローカル開発用）
// 2. SUPABASE_DB_URL（Supabase直接接続）
// 3. SUPABASE_DB_PASSWORD + SUPABASE_DB_HOST（Supabase接続情報から構築）
const getConnectionString = () => {
  // ローカル開発用（最優先）
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Supabase直接接続
  if (process.env.SUPABASE_DB_URL) {
    return process.env.SUPABASE_DB_URL;
  }
  
  // Supabase接続情報から構築
  if (process.env.SUPABASE_DB_PASSWORD && process.env.SUPABASE_DB_HOST) {
    return `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@${process.env.SUPABASE_DB_HOST}:5432/postgres`;
  }
  
  // デフォルト（ローカル開発用）
  return process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pet_carte';
};

const connectionString = getConnectionString();

if (!connectionString) {
  console.warn('⚠️  データベース接続文字列が設定されていません');
}

// Vercelサーバーレス環境用に接続プール設定を最適化
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.NODE_ENV === 'production' && process.env.SUPABASE_URL
    ? { rejectUnauthorized: false }
    : false,
  // サーバーレス環境では接続数を最小限に、通常環境では常時接続を維持
  max: isVercel ? 3 : 20,
  min: isVercel ? 0 : 2,
  idleTimeoutMillis: isVercel ? 5000 : 60000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: isVercel,
});

pool.on('error', (err) => {
  console.error('❌ データベース接続エラー:', err);
  process.exit(-1);
});

export default pool;
