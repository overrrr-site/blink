import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function createServiceClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('ℹ️  Supabase設定がありません。ローカルPostgreSQLを使用します。');
    return null;
  }

  console.log('✅ Supabaseクライアントが初期化されました');
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const supabase = createServiceClient();

export function createSupabaseClient(accessToken?: string): SupabaseClient {
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase設定が不足しています');
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: true, persistSession: false },
  });

  if (accessToken) {
    client.auth.setSession({
      access_token: accessToken,
      refresh_token: '',
    } as Parameters<typeof client.auth.setSession>[0]);
  }

  return client;
}

export default supabase;
