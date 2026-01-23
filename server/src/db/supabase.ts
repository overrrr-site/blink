// Supabaseクライアント（本番環境用、オプション）
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Supabase設定が存在する場合のみクライアントを作成
let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log('✅ Supabaseクライアントが初期化されました');
  } catch (error) {
    console.warn('⚠️  Supabaseクライアントの初期化に失敗しました:', error);
  }
} else {
  console.log('ℹ️  Supabase設定がありません。ローカルPostgreSQLを使用します。');
}

// クライアント用のSupabaseクライアント（Anon Keyを使用）
export const createSupabaseClient = (accessToken?: string) => {
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase設定が不足しています');
  }
  
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  })

  if (accessToken) {
    client.auth.setSession({
      access_token: accessToken,
      refresh_token: '',
    } as any)
  }

  return client
}

export { supabase }
export default supabase
