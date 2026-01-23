-- staffテーブルのauth_user_idを更新するSQL
-- Supabase SQL Editorで実行してください

-- ============================================
-- 手順1: Supabase AuthユーザーのUUIDを確認
-- ============================================

-- nakai@overrrr.comのSupabase Authユーザーを検索
SELECT 
  id as auth_user_id,
  email,
  created_at
FROM auth.users 
WHERE email = 'nakai@overrrr.com';

-- ============================================
-- 手順2: staffテーブルのauth_user_idを更新
-- ============================================
-- 上記で取得したUUIDを [AUTH_USER_UUID] に置き換えて実行

-- UPDATE staff
-- SET auth_user_id = '[AUTH_USER_UUID]'
-- WHERE email = 'nakai@overrrr.com';

-- 例（実際のUUIDに置き換えてください）:
-- UPDATE staff
-- SET auth_user_id = '24a4aa9a-b081-4042-848c-ef004cd1ef51'
-- WHERE email = 'nakai@overrrr.com';

-- ============================================
-- 手順3: 確認
-- ============================================

-- staffテーブルとauth.usersテーブルの紐付けを確認
SELECT 
  s.id as staff_id,
  s.email as staff_email,
  s.name as staff_name,
  s.auth_user_id,
  au.email as auth_email,
  au.id as auth_id,
  au.created_at as auth_created_at
FROM staff s
LEFT JOIN auth.users au ON s.auth_user_id = au.id
WHERE s.email = 'nakai@overrrr.com';

-- ============================================
-- 自動更新スクリプト（メールアドレスで自動マッチング）
-- ============================================
-- 以下のSQLを実行すると、メールアドレスが一致するauth.usersとstaffを自動で紐付けます

UPDATE staff s
SET auth_user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = s.email 
  LIMIT 1
)
WHERE s.auth_user_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE email = s.email
  );

-- 更新結果を確認
SELECT 
  s.id,
  s.email,
  s.name,
  s.auth_user_id,
  CASE 
    WHEN s.auth_user_id IS NOT NULL THEN '✅ 紐付け済み'
    ELSE '❌ 未紐付け'
  END as status
FROM staff s
ORDER BY s.id;
