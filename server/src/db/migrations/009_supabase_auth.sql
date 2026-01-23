-- Supabase Auth対応のマイグレーション
-- staffテーブルにauth_user_idカラムを追加

-- auth_user_idカラムを追加（Supabase auth.usersテーブルとの連携用）
ALTER TABLE staff ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id ON staff(auth_user_id);

-- password_hashをNULL許容に変更（Supabase Authを使う場合は不要になるため）
ALTER TABLE staff ALTER COLUMN password_hash DROP NOT NULL;

-- コメント追加
COMMENT ON COLUMN staff.auth_user_id IS 'Supabase auth.usersテーブルのID';
