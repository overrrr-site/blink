# 500エラーのデバッグ手順

`/api/auth/me` で500エラーが発生している場合のデバッグ手順です。

## 1. Vercelのログを確認（最重要）

1. [Vercel Dashboard](https://vercel.com) にアクセス
2. プロジェクト **blink** を選択
3. **Deployments** タブを開く
4. 最新のデプロイメントをクリック
5. **Functions** タブを開く
6. `/api/auth/me` のログを確認
7. エラーメッセージとスタックトレースを確認

**改善したエラーハンドリングにより、詳細なエラーメッセージが表示されるはずです。**

## 2. ブラウザのNetworkタブで確認

1. ブラウザの開発者ツール（F12）を開く
2. **Network** タブを開く
3. `/api/auth/me` のリクエストをクリック
4. **Response** タブでエラーメッセージを確認
5. **Headers** タブでリクエストヘッダーを確認（Authorizationヘッダーが正しく送信されているか）

## 3. 環境変数の確認

Vercel Dashboard → Settings → Environment Variables で以下を確認：

### 必須環境変数

```
SUPABASE_URL=https://fqepwzwkztjnpfeyxnke.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
SUPABASE_ANON_KEY=[your-anon-key]
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.fqepwzwkztjnpfeyxnke.supabase.co:5432/postgres
```

### 確認方法

環境変数が正しく設定されているか、Vercel CLIで確認：

```bash
vercel env ls
```

## 4. よくある原因と解決方法

### 原因1: SUPABASE_SERVICE_ROLE_KEYが設定されていない

**エラーメッセージ**: `認証システムが設定されていません`

**解決方法**: Vercel環境変数に `SUPABASE_SERVICE_ROLE_KEY` を追加

### 原因2: データベース接続エラー

**エラーメッセージ**: `connection refused` または `timeout`

**解決方法**: 
- `DATABASE_URL` が正しい形式か確認
- パスワードが正しいか確認
- 接続プーリングURLの形式を確認

### 原因3: staffテーブルにauth_user_idが設定されていない

**エラーメッセージ**: `スタッフとして登録されていません`

**解決方法**: 
```sql
-- メールアドレスで自動マッチング
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
```

### 原因4: データベース接続プールのエラー

**エラーメッセージ**: `too many clients` または `connection pool exhausted`

**解決方法**: 
- 接続プーリングURLを使用している場合、通常の接続URLに変更
- または、接続プーリングの設定を確認

## 5. テスト用エンドポイント

認証をバイパスして、データベース接続をテスト：

```sql
-- Supabase SQL Editorで実行
SELECT 
  s.id,
  s.email,
  s.name,
  s.auth_user_id,
  au.email as auth_email
FROM staff s
LEFT JOIN auth.users au ON s.auth_user_id = au.id
WHERE s.email = 'nakai@overrrr.com';
```

## 6. ログの確認方法

### Vercel CLIでログを確認

```bash
vercel logs --follow
```

### リアルタイムでログを確認

```bash
vercel logs [deployment-url] --follow
```

## 次のステップ

1. **Vercelのログを確認**して、具体的なエラーメッセージを取得
2. エラーメッセージに基づいて原因を特定
3. 必要に応じて環境変数を修正
4. 再デプロイ

**重要**: Vercelのログに表示されるエラーメッセージを共有してください。それに基づいて原因を特定できます。
