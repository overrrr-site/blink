# Vercel環境変数設定ガイド

Vercelに設定する環境変数の一覧と命名規則です。

## 命名規則

Supabaseの命名規則に合わせて、以下の形式を使用します：

- **大文字とアンダースコア** を使用
- **サービス名_用途_種類** の形式
- 例: `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_OAUTH_CLIENT_ID`

## 必須環境変数

### Supabase（データベース・認証）

```env
# Supabase接続情報
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service_role キー]
SUPABASE_ANON_KEY=[anon public キー]

# フロントエンドURL（招待メールのリダイレクト用）
FRONTEND_URL=https://your-domain.vercel.app
```

### クライアント側（フロントエンド）

```env
# Supabase Auth（クライアント側）
VITE_SUPABASE_URL=https://[PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=[anon public キー]

# API URL
VITE_API_URL=https://your-domain.vercel.app
```

## Google OAuth設定

### 重要: 2つの異なる用途があります

#### 1. Supabase Auth用のGoogleログイン（Vercel環境変数不要）

Supabase Dashboardで直接設定します：
- Supabase Dashboard → Authentication → Providers → Google
- クライアントIDとシークレットを入力
- **Vercelの環境変数には設定不要**

#### 2. Google Calendar連携用（Vercel環境変数必要）

```env
# Google Calendar API連携用
GOOGLE_CLIENT_ID=[Google OAuth Client ID]
GOOGLE_CLIENT_SECRET=[Google OAuth Client Secret]
GOOGLE_REDIRECT_URI=https://your-domain.vercel.app/api/google-calendar/callback
```

**取得方法**:
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択
3. **APIとサービス** → **認証情報** を開く
4. OAuth 2.0クライアントIDを作成
5. クライアントIDとシークレットをコピー

## その他の環境変数

### データベース

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### JWT認証（既存システム用、Supabase Auth使用時は不要）

```env
JWT_SECRET=[ランダムな文字列（32文字以上推奨）]
```

### PAY.JP決済

```env
PAYJP_SECRET_KEY=sk_live_xxxxxxxxxxxxx
PAYJP_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
```

### LINE Messaging API

```env
LINE_CHANNEL_ACCESS_TOKEN=[LINEチャネルアクセストークン]
LINE_CHANNEL_SECRET=[LINEチャネルシークレット]
```

### メール送信（SMTP）

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=[送信元メールアドレス]
SMTP_PASSWORD=[アプリパスワード]
SMTP_FROM=noreply@blink.example.com
```

### Google Gemini API

```env
GEMINI_API_KEY=[Gemini API Key]
```

### 環境設定

```env
NODE_ENV=production
VERCEL=1
```

## Vercelでの設定方法

1. Vercel Dashboard → プロジェクトを選択
2. **Settings** → **Environment Variables** を開く
3. 各環境変数を追加：
   - **Name**: 環境変数名（例: `SUPABASE_URL`）
   - **Value**: 値
   - **Environment**: Production, Preview, Development を選択
4. **Save** をクリック
5. 再デプロイ（環境変数の変更は再デプロイ後に反映）

## 注意事項

### クライアント側の環境変数

- `VITE_` プレフィックスが必要
- ビルド時に埋め込まれるため、再デプロイが必要
- 公開されても問題ない情報のみ設定（例: `VITE_SUPABASE_ANON_KEY`）

### サーバー側の環境変数

- 機密情報を含む（例: `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`）
- 絶対に公開しない
- `.env` ファイルをGitにコミットしない

### Google OAuthの混同に注意

- **Supabase Auth用**: Supabase Dashboardで設定（Vercel環境変数不要）
- **Google Calendar連携用**: Vercel環境変数で設定（`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`）

## 環境変数の確認

デプロイ後、以下で確認できます：

```bash
# Vercel CLIで確認
vercel env ls

# 特定の環境変数を確認
vercel env pull .env.local
```
