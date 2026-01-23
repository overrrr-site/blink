# Supabase セットアップガイド

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセス
2. アカウントを作成（GitHubアカウントでログイン推奨）
3. 「New Project」をクリック
4. プロジェクト情報を入力：
   - **Name**: Blink（任意）
   - **Database Password**: 強力なパスワードを設定（後で使用します）
   - **Region**: 最寄りのリージョンを選択（例: Northeast Asia (Tokyo)）
5. 「Create new project」をクリック

## 2. 環境変数の取得

プロジェクトが作成されたら、以下を取得します：

1. **Settings** → **API** を開く
2. 以下の値をコピー：
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`（⚠️ 機密情報）

## 3. データベーススキーマの作成

1. Supabaseダッシュボードの **SQL Editor** を開く
2. **New query** をクリック
3. `server/src/db/migrations/supabase_migration.sql` の内容をコピー
4. SQL Editorに貼り付けて実行（▶️ ボタンをクリック）
5. エラーなく完了したことを確認

## 4. テーブルの確認

1. **Table Editor** を開く
2. 以下のテーブルが作成されていることを確認：
   - `staff`
   - `stores`
   - `staff_stores`
   - `owners`
   - `dogs`
   - `dog_health`
   - `dog_personality`
   - `contracts`
   - `reservations`
   - `pre_visit_inputs`
   - `journals`

## 5. シードデータの投入（オプション）

### 方法1: SQLで直接投入

SQL Editorで以下を実行：

```sql
-- デフォルトスタッフの作成（パスワード: password123）
INSERT INTO staff (email, password_hash, name) 
VALUES (
  'admin@example.com',
  '$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq',
  '中井 翔太'
) ON CONFLICT (email) DO NOTHING;

-- デフォルト店舗の作成
INSERT INTO stores (name, address, phone) 
VALUES ('Blink 渋谷店', '東京都渋谷区渋谷1-1-1', '03-1234-5678')
RETURNING id;

-- スタッフと店舗の関連付け（上記のstore_idを使用）
INSERT INTO staff_stores (staff_id, store_id) 
VALUES (
  (SELECT id FROM staff WHERE email = 'admin@example.com'),
  (SELECT id FROM stores WHERE name = 'Blink 渋谷店')
) ON CONFLICT DO NOTHING;
```

### 方法2: ローカルから実行

```bash
# 環境変数を設定
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
export SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres

# シードデータを投入
cd server
npm run db:seed
```

## 6. Row Level Security (RLS) の確認

1. **Authentication** → **Policies** を開く
2. 各テーブルにRLSポリシーが設定されていることを確認
3. 本番環境では、適切なRLSポリシーを設定してください（現在は全アクセス許可）

## 7. 接続情報の確認

### PostgreSQL接続文字列

**Settings** → **Database** → **Connection string** から取得：

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

この接続文字列を `SUPABASE_DB_URL` として使用できます。

## トラブルシューティング

### マイグレーションエラー

- エラーメッセージを確認
- テーブルが既に存在する場合は、`IF NOT EXISTS` が含まれているので問題ありません
- 権限エラーの場合は、Service Role Keyが正しく設定されているか確認

### 接続エラー

- `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` が正しいか確認
- IPアドレスの許可設定を確認（Settings → Database → Connection pooling）

### RLSポリシーエラー

- Service Role Keyを使用している場合、RLSはバイパスされます
- クライアントサイドからアクセスする場合は、適切なRLSポリシーが必要です

## 参考リンク

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
