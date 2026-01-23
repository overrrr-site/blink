# 500エラー: スタッフ情報の取得に失敗

## エラー内容

```
Request failed with status code 500
スタッフ情報の取得に失敗しました
```

## 考えられる原因

### 1. staffテーブルのauth_user_idが設定されていない（最も可能性が高い）

GoogleログインでSupabase Authユーザーは作成されますが、`staff`テーブルの`auth_user_id`カラムが更新されていない可能性があります。

**確認方法**:
```sql
SELECT s.id, s.email, s.name, s.auth_user_id, au.email as auth_email
FROM staff s
LEFT JOIN auth.users au ON s.auth_user_id = au.id
WHERE s.email = 'nakai@overrrr.com';
```

**解決方法**:
1. Supabase Dashboard → Authentication → Users で、`nakai@overrrr.com`のユーザーUUIDを確認
2. 以下のSQLで`auth_user_id`を更新：

```sql
UPDATE staff
SET auth_user_id = '取得したUUID'
WHERE email = 'nakai@overrrr.com';
```

### 2. Supabase環境変数が設定されていない

Vercel環境変数に以下が設定されているか確認：

```
SUPABASE_URL=https://fqepwzwkztjnpfeyxnke.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. データベース接続エラー

`DATABASE_URL`が正しく設定されているか確認。

### 4. スタッフと店舗の関連付けがない

`staff_stores`テーブルにレコードが存在するか確認：

```sql
SELECT * FROM staff_stores WHERE staff_id = (SELECT id FROM staff WHERE email = 'nakai@overrrr.com');
```

## デバッグ手順

### 1. Vercelのログを確認

1. Vercel Dashboard → プロジェクト → Functions
2. 最新のデプロイメントのログを確認
3. エラーメッセージを確認

### 2. ブラウザのコンソールで確認

1. ブラウザの開発者ツール（F12）を開く
2. Network タブで `/api/auth/me` のリクエストを確認
3. Response タブでエラーメッセージを確認

### 3. Supabase Dashboardで確認

1. Supabase Dashboard → Authentication → Users
2. `nakai@overrrr.com`のユーザーが存在するか確認
3. ユーザーのUUIDをコピー

## 修正後の確認

修正後、以下を確認：

1. `https://blink-overrrr.vercel.app/login` にアクセス
2. Googleログインを実行
3. ダッシュボードに正常にリダイレクトされることを確認
4. ブラウザのコンソールでエラーがないことを確認
