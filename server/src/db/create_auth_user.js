/**
 * Supabase Authユーザー作成スクリプト
 * 
 * 使用方法:
 * 1. 環境変数を設定:
 *    export SUPABASE_URL=https://fqepwzwkztjnpfeyxnke.supabase.co
 *    export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 * 
 * 2. スクリプトを実行:
 *    node create_auth_user.js
 * 
 * 3. 出力されたUUIDを使って、staffテーブルのauth_user_idを更新
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createAuthUser() {
  console.log('🚀 Supabase Authユーザーを作成します...\n')

  const email = 'nakai@overrrr.com'

  try {
    // 既存ユーザーをチェック
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (existingUser) {
      console.log('✅ 既存のユーザーが見つかりました:')
      console.log(`   UUID: ${existingUser.id}`)
      console.log(`   Email: ${existingUser.email}`)
      console.log(`   作成日: ${existingUser.created_at}`)
      console.log('\n📝 以下のSQLでstaffテーブルを更新してください:')
      console.log(`\nUPDATE staff`)
      console.log(`SET auth_user_id = '${existingUser.id}'`)
      console.log(`WHERE email = '${email}';`)
      return
    }

    // 新規ユーザーを作成
    console.log(`📧 ${email} でユーザーを作成します...`)
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true,
      // passwordは設定しない（Googleログインのみ）
    })

    if (error) {
      console.error('❌ エラー:', error.message)
      process.exit(1)
    }

    console.log('✅ ユーザーが作成されました:')
    console.log(`   UUID: ${data.user.id}`)
    console.log(`   Email: ${data.user.email}`)
    console.log(`   作成日: ${data.user.created_at}`)
    
    console.log('\n📝 以下のSQLでstaffテーブルを更新してください:')
    console.log(`\nUPDATE staff`)
    console.log(`SET auth_user_id = '${data.user.id}'`)
    console.log(`WHERE email = '${email}';`)

    console.log('\nまたは、以下のSQLをSupabase SQL Editorで実行してください:')
    console.log(`\n-- staffテーブルのauth_user_idを更新`)
    console.log(`UPDATE staff`)
    console.log(`SET auth_user_id = '${data.user.id}'`)
    console.log(`WHERE email = '${email}';`)
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  }
}

createAuthUser()
