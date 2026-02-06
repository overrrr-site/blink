# 環境変数設定ガイド

## サーバー側（server/.env）

### 必須設定

```env
# データベース（ローカル開発）
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pet_carte

# データベース（Supabase本番環境）
# 取得方法: Supabaseダッシュボード → Settings → Database → Connection string → URI
# 詳細は SUPABASE_CONNECTION.md を参照
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase接続情報
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_PASSWORD=your-db-password
SUPABASE_DB_HOST=db.your-project.supabase.co

# JWT認証
JWT_SECRET=your-secret-key-here

# 暗号化キー（LINE認証情報などの機密データ用）
# 32文字以上のランダムな文字列を設定してください
# 生成方法: openssl rand -base64 32 または Node.js: require('crypto').randomBytes(32).toString('base64')
ENCRYPTION_KEY=your-32-character-or-longer-encryption-key-here

# サーバーポート
PORT=3001

# フロントエンドURL（本番環境用）
FRONTEND_URL=https://your-app.vercel.app
```

### Supabase Storage（ファイルアップロード）

```env
# Supabase Storage設定
# バケット名（デフォルト: uploads）
SUPABASE_STORAGE_BUCKET=uploads
```

**設定手順:**
1. Supabaseダッシュボード → Storage → New Bucket
2. バケット名: `uploads`
3. Public bucket: ON（公開アクセス許可）
4. File size limit: 10MB
5. Allowed MIME types: `image/jpeg, image/png, image/gif, image/webp, application/pdf`

### PAY.JP決済（SaaS利用料）

```env
# PAY.JP APIキー
# 取得方法: https://pay.jp/d/settings → APIキー
PAYJP_SECRET_KEY=sk_test_xxxxxxxxxxxxx
PAYJP_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
```

### LINE Messaging API（通知送信）

**注意**: LINE Messaging APIは店舗ごとにマルチテナント対応しています。
環境変数ではなく、データベースの `stores` テーブルに設定します。

```sql
-- 店舗ごとのLINE設定をデータベースに保存
UPDATE stores SET
  line_channel_id = 'your-channel-id',
  line_channel_secret = 'your-channel-secret',
  line_channel_access_token = 'your-channel-access-token'
WHERE id = 1;
```

### メール送信（SMTP）

```env
# SMTP設定
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@your-domain.com
```

### Google Calendar連携

```env
# Google Calendar API
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/google-calendar/callback
```

### Google Gemini API（AI機能）

```env
# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key
```

### Sentry（エラー監視）

```env
# Sentry DSN（サーバー側）
SENTRY_DSN=https://xxx@o0.ingest.sentry.io/000000

# フロントエンドのソースマップアップロード用（ビルド時に参照）
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SENTRY_ORG=blink-pet
SENTRY_PROJECT=blink-frontend
```

## クライアント側（client/.env）

```env
# API URL
VITE_API_URL=http://localhost:3001

# Supabase設定
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# LINE LIFF（飼い主向けミニアプリ）
VITE_LIFF_ID=your-liff-id

# フロントエンドURL
VITE_FRONTEND_URL=https://your-app.vercel.app

# Sentry DSN（フロントエンド）
VITE_SENTRY_DSN=https://xxx@o0.ingest.sentry.io/000000
```

## 設定手順

### 1. Supabase設定

1. [Supabase](https://supabase.com/) でプロジェクトを作成
2. Settings → API からキーを取得:
   - `SUPABASE_URL`: Project URL
   - `SUPABASE_ANON_KEY`: anon public key
   - `SUPABASE_SERVICE_ROLE_KEY`: service_role key（秘密にする）
3. Settings → Database → Connection string からDATABASE_URLを取得
4. Storage → New Bucket で `uploads` バケットを作成（Public: ON）

### 2. PAY.JP設定

1. [PAY.JP](https://pay.jp/) にアカウントを作成
2. ダッシュボード → 設定 → APIキー を取得
3. `PAYJP_SECRET_KEY` と `PAYJP_PUBLIC_KEY` を設定

### 3. LINE Messaging API設定（店舗ごと）

1. [LINE Developers](https://developers.line.biz/) にログイン
2. プロバイダーとMessaging APIチャネルを作成
3. 以下の情報を取得:
   - Channel ID
   - Channel Secret
   - Channel Access Token
4. **データベースに保存**（各店舗ごとに設定）:
   ```sql
   UPDATE stores SET
     line_channel_id = 'your-channel-id',
     line_channel_secret = 'your-channel-secret',
     line_channel_access_token = 'your-channel-access-token'
   WHERE id = 1;
   ```

### 4. メール送信設定（Gmail例）

1. Gmailアカウントで2段階認証を有効化
2. Googleアカウント → セキュリティ → アプリパスワード で16桁のパスワードを生成
3. 環境変数を設定:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=your-email@gmail.com`
   - `SMTP_PASSWORD=生成したアプリパスワード`
   - `SMTP_FROM=noreply@your-domain.com`

### 5. LINE LIFF設定（飼い主向けアプリ）

1. LINE Developers → LIFFアプリを作成
2. エンドポイントURL: `https://your-app.vercel.app/liff.html`
3. `VITE_LIFF_ID` にLIFF IDを設定

### 6. Google Calendar連携

詳細は `GOOGLE_CALENDAR_SETUP.md` を参照してください。

### 7. Google Gemini API（AI機能）

1. [Google AI Studio](https://aistudio.google.com/) でAPIキーを作成
2. `GEMINI_API_KEY` を設定

## Vercel環境変数の設定

Vercelダッシュボード → Settings → Environment Variables で設定:

| 変数名 | 必須 | 説明 |
|--------|:----:|------|
| DATABASE_URL | ○ | Supabase接続文字列 |
| SUPABASE_URL | ○ | Supabase Project URL |
| SUPABASE_ANON_KEY | ○ | Supabase Anon Key |
| SUPABASE_SERVICE_ROLE_KEY | ○ | Supabase Service Role Key |
| JWT_SECRET | ○ | JWT署名用シークレット |
| FRONTEND_URL | ○ | フロントエンドURL |
| PAYJP_SECRET_KEY | △ | PAY.JP決済（オプション） |
| PAYJP_PUBLIC_KEY | △ | PAY.JP決済（オプション） |
| SMTP_HOST | △ | メール送信（オプション） |
| SMTP_PORT | △ | メール送信（オプション） |
| SMTP_USER | △ | メール送信（オプション） |
| SMTP_PASSWORD | △ | メール送信（オプション） |
| SMTP_FROM | △ | メール送信（オプション） |
| GEMINI_API_KEY | △ | AI機能（オプション） |
| SENTRY_DSN | △ | Sentry（サーバー側エラー監視） |
| SENTRY_AUTH_TOKEN | △ | Sentryソースマップアップロード |
| SENTRY_ORG | △ | Sentry org（既定: blink-pet） |
| SENTRY_PROJECT | △ | Sentry project（既定: blink-frontend） |
| VITE_SENTRY_DSN | △ | Sentry（フロントエンド） |
| GOOGLE_CLIENT_ID | △ | カレンダー連携（オプション） |
| GOOGLE_CLIENT_SECRET | △ | カレンダー連携（オプション） |
| GOOGLE_REDIRECT_URI | △ | カレンダー連携（オプション） |

○: 必須、△: 機能を使用する場合に必要
