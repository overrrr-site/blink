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

# または、Supabase接続情報を個別に設定する場合
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_DB_PASSWORD=your-db-password
SUPABASE_DB_HOST=db.your-project.supabase.co

# JWT認証
JWT_SECRET=your-secret-key-here

# サーバーポート
PORT=3001
```

### PAY.JP決済

```env
# PAY.JP APIキー
PAYJP_SECRET_KEY=sk_test_xxxxxxxxxxxxx
PAYJP_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
```

### LINE Messaging API

```env
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token
LINE_CHANNEL_SECRET=your-channel-secret
```

### メール送信（SMTP）

```env
# SMTP設定
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@blink.example.com
```

### Google Calendar連携

```env
# Google Calendar API
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/google-calendar/callback
```

### Google Gemini API

```env
# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key
```

## クライアント側（client/.env）

```env
# API URL
VITE_API_URL=http://localhost:3001

# LINE LIFF
VITE_LIFF_ID=your-liff-id
```

## 設定手順

### 1. PAY.JP設定

1. [PAY.JP](https://pay.jp/) にアカウントを作成
2. ダッシュボードからAPIキーを取得
3. `PAYJP_SECRET_KEY` と `PAYJP_PUBLIC_KEY` を設定

### 2. LINE Messaging API設定

1. [LINE Developers](https://developers.line.biz/) にログイン
2. プロバイダーとチャネルを作成
3. Messaging APIチャネルの設定から `Channel Access Token` と `Channel Secret` を取得
4. `LINE_CHANNEL_ACCESS_TOKEN` と `LINE_CHANNEL_SECRET` を設定

### 3. メール送信設定（Gmail例）

1. Gmailアカウントで「アプリパスワード」を生成
2. 2段階認証を有効にする必要があります
3. `SMTP_USER` にGmailアドレス、`SMTP_PASSWORD` にアプリパスワードを設定

### 4. LINE LIFF設定

1. LINE DevelopersでLIFFアプリを作成
2. `VITE_LIFF_ID` にLIFF IDを設定
