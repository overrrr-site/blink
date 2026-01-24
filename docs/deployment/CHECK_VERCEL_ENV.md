# Vercel環境変数の確認方法

500エラーが続く場合、Vercelの環境変数が正しく設定されているか確認してください。

## 確認手順

### 1. Vercel Dashboardで環境変数を確認

1. [Vercel Dashboard](https://vercel.com) にアクセス
2. プロジェクト **blink** を選択
3. **Settings** → **Environment Variables** を開く
4. 以下の環境変数が設定されているか確認：

**必須環境変数**:
```
SUPABASE_URL=https://fqepwzwkztjnpfeyxnke.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
SUPABASE_ANON_KEY=[your-anon-key]
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.fqepwzwkztjnpfeyxnke.supabase.co:5432/postgres
FRONTEND_URL=https://blink-overrrr.vercel.app
VITE_FRONTEND_URL=https://blink-overrrr.vercel.app
```

### 2. Vercelのログを確認

1. Vercel Dashboard → プロジェクト → **Deployments**
2. 最新のデプロイメントをクリック
3. **Functions** タブを開く
4. `/api/auth/me` のログを確認
5. エラーメッセージを確認

### 3. ブラウザのNetworkタブで確認

1. ブラウザの開発者ツール（F12）を開く
2. **Network** タブを開く
3. `/api/auth/me` のリクエストをクリック
4. **Response** タブでエラーメッセージを確認

## よくある原因

### 1. SUPABASE_SERVICE_ROLE_KEYが設定されていない

エラーメッセージ: `認証システムが設定されていません`

**解決方法**: Vercel環境変数に `SUPABASE_SERVICE_ROLE_KEY` を追加

### 2. データベース接続エラー

エラーメッセージ: `connection refused` または `timeout`

**解決方法**: `DATABASE_URL` が正しく設定されているか確認

### 3. スタッフが見つからない（既に解決済み）

エラーメッセージ: `スタッフとして登録されていません`

**解決方法**: `auth_user_id` が正しく設定されているか確認（✅ 完了済み）

## デバッグ用SQL

問題を特定するために、以下を実行：

```sql
-- 1. staffテーブルの確認
SELECT id, email, name, auth_user_id FROM staff WHERE email = 'nakai@overrrr.com';

-- 2. auth.usersテーブルの確認
SELECT id, email FROM auth.users WHERE email = 'nakai@overrrr.com';

-- 3. 紐付けの確認
SELECT 
  s.id,
  s.email,
  s.auth_user_id,
  au.id as auth_id,
  au.email as auth_email
FROM staff s
LEFT JOIN auth.users au ON s.auth_user_id = au.id
WHERE s.email = 'nakai@overrrr.com';

-- 4. staff_storesの確認
SELECT * FROM staff_stores WHERE staff_id = (SELECT id FROM staff WHERE email = 'nakai@overrrr.com');
```
