-- Supabase Authユーザー作成とstaffテーブルへの紐付け
-- このスクリプトは、Supabase Admin APIを使用するか、Supabase Dashboardから手動でユーザーを作成した後に実行してください

-- ============================================
-- 手順1: Supabase Authユーザーを作成
-- ============================================
-- 方法A: Supabase Dashboardから作成（推奨）
-- 1. Supabase Dashboard → Authentication → Users
-- 2. "Add user" をクリック
-- 3. Email: nakai@overrrr.com
-- 4. Password: （自動生成または設定）
-- 5. Email confirmed: ON
-- 6. "Create user" をクリック
-- 7. 作成されたユーザーのUUIDをコピー

-- 方法B: Supabase Admin APIを使用（Node.jsスクリプト）
-- 以下のスクリプトを実行:
/*
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fqepwzwkztjnpfeyxnke.supabase.co'
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createUser() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'nakai@overrrr.com',
    email_confirm: true,
    // passwordは設定しない（Googleログインのみ）
  })

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('User created:', data.user.id)
  console.log('Update staff table with this UUID:', data.user.id)
}

createUser()
*/

-- ============================================
-- 手順2: staffテーブルのauth_user_idを更新
-- ============================================
-- 上記で取得したUUIDを [AUTH_USER_UUID] に置き換えて実行

-- UPDATE staff
-- SET auth_user_id = '[AUTH_USER_UUID]'
-- WHERE email = 'nakai@overrrr.com';

-- 例:
-- UPDATE staff
-- SET auth_user_id = '24a4aa9a-b081-4042-848c-ef004cd1ef51'
-- WHERE email = 'nakai@overrrr.com';

-- ============================================
-- 確認クエリ
-- ============================================

-- staffテーブルとauth.usersテーブルの紐付けを確認
-- SELECT 
--   s.id,
--   s.email,
--   s.name,
--   s.auth_user_id,
--   au.email as auth_email,
--   au.created_at as auth_created_at
-- FROM staff s
-- LEFT JOIN auth.users au ON s.auth_user_id = au.id
-- WHERE s.email = 'nakai@overrrr.com';
