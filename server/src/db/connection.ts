import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const LOCAL_CONNECTION_STRING = 'postgresql://postgres:postgres@localhost:5432/pet_carte';

function getConnectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;

  const { SUPABASE_DB_PASSWORD, SUPABASE_DB_HOST } = process.env;
  if (SUPABASE_DB_PASSWORD && SUPABASE_DB_HOST) {
    return `postgresql://postgres:${SUPABASE_DB_PASSWORD}@${SUPABASE_DB_HOST}:5432/postgres`;
  }

  return LOCAL_CONNECTION_STRING;
}

function createPoolConfig(): pg.PoolConfig {
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
  const isProduction = process.env.NODE_ENV === 'production' && !!process.env.SUPABASE_URL;

  return {
    connectionString: getConnectionString(),
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
    ...(isVercel
      ? { max: 3, min: 1, idleTimeoutMillis: 30000, allowExitOnIdle: true }
      : { max: 20, min: 2, idleTimeoutMillis: 60000 }),
  };
}

const pool = new Pool(createPoolConfig());

pool.on('error', (err) => {
  console.error('❌ データベース接続エラー:', err);
  process.exit(-1);
});

export default pool;
