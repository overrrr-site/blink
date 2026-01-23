# Vercel本番環境デプロイガイド

## 前提条件

- Vercelアカウント
- Supabaseアカウント（データベース用）
- GitHubアカウント（推奨）

## デプロイ手順

### 1. Supabaseプロジェクトのセットアップ

1. [Supabase](https://supabase.com)にアクセスしてアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクト設定から以下を取得：
   - **Project URL** (`SUPABASE_URL`)
   - **Database Password**（プロジェクト作成時に設定）
   - **Connection String**（接続文字列）

#### データベース接続文字列の取得

**方法1: 接続文字列を直接取得（推奨）**

1. Supabaseダッシュボードにログイン
2. 左サイドバーから **「Settings」**（設定）をクリック
3. **「Database」** タブを選択
4. 下にスクロールして **「Connection string」** セクションを探す
5. **「URI」** タブを選択
6. 接続文字列をコピー（パスワードが `[YOUR-PASSWORD]` と表示されている場合は、実際のパスワードに置き換える）

**方法2: 接続情報から手動構築**

接続文字列が見つからない場合は、以下の情報から手動で構築できます：

1. Supabaseダッシュボード → Settings → Database
2. 以下の情報を確認：
   - **Host**: `db.[PROJECT-REF].supabase.co`
   - **Database name**: `postgres`
   - **Port**: `5432`
   - **User**: `postgres`
   - **Password**: プロジェクト作成時に設定したパスワード

3. 以下の形式で接続文字列を構築：

```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**方法3: Connection Poolingを使用（本番環境推奨）**

1. Settings → Database → Connection pooling
2. **「Session mode」** または **「Transaction mode」** を選択
3. 接続文字列をコピー（ポート番号が異なる場合があります）

**注意**: パスワードに特殊文字が含まれている場合は、URLエンコードが必要な場合があります。

### 2. データベースマイグレーションの実行

Supabaseダッシュボードの「SQL Editor」を使用：

1. SQL Editorを開く
2. `server/src/db/migrations/` 配下のすべてのSQLファイルを順番に実行：
   - `001_initial_schema.sql`
   - `002_google_calendar.sql`
   - `003_contracts_and_makeup_tickets.sql`
   - `004_multi_dog_discount_and_settings.sql`
   - `005_store_info.sql`
   - `006_audit_log_and_soft_delete.sql`
   - `007_notifications.sql`
   - `008_billing.sql`

または、ローカルから実行：

```bash
cd server
npm install
# .envファイルにDATABASE_URLを設定
npm run db:migrate
```

### 3. Vercelプロジェクトの作成

#### 方法1: Vercel CLIを使用（推奨）

```bash
# Vercel CLIのインストール
npm i -g vercel

# プロジェクトにログイン
vercel login

# プロジェクトをリンク
vercel link

# 環境変数を設定（後述）
# 本番環境にデプロイ
vercel --prod
```

#### 方法2: Vercelダッシュボードを使用

1. [Vercel](https://vercel.com)にアクセス
2. 「Add New Project」をクリック
3. GitHubリポジトリを接続（推奨）
4. プロジェクト設定：
   - **Framework Preset**: Vite
   - **Root Directory**: `/` (ルート)
   - **Build Command**: `npm run build`
   - **Output Directory**: `client/dist`
   - **Install Command**: `npm run install:all`

### 4. 環境変数の設定

Vercelダッシュボードの「Settings」→「Environment Variables」で以下を設定：

**重要**: Supabase接続文字列の取得方法がわからない場合は、`SUPABASE_CONNECTION.md` を参照してください。

#### 必須環境変数

```env
# データベース
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
# または Supabase接続情報
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_DB_PASSWORD=[DATABASE-PASSWORD]
SUPABASE_DB_HOST=db.[PROJECT-REF].supabase.co

# Supabase Auth（バックエンド用）
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
SUPABASE_ANON_KEY=[YOUR_ANON_KEY]

# フロントエンドURL（招待メールのリダイレクト用）
FRONTEND_URL=https://your-domain.vercel.app

# JWT認証（既存システム用、Supabase Auth使用時は不要）
JWT_SECRET=[ランダムな文字列（32文字以上推奨）]

# 環境
NODE_ENV=production
VERCEL=1
```

#### Supabase Service Role Keyの取得方法

1. Supabase Dashboard → **Settings** → **API** を開く
2. **service_role** キーをコピー → `SUPABASE_SERVICE_ROLE_KEY` に設定
   - ⚠️ **重要**: このキーは機密情報です。絶対に公開しないでください
   - サーバー側のみで使用し、クライアント側では使用しないでください

#### PAY.JP決済（本番環境）

```env
PAYJP_SECRET_KEY=sk_live_xxxxxxxxxxxxx
PAYJP_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
```

#### LINE Messaging API

```env
LINE_CHANNEL_ACCESS_TOKEN=[LINEチャネルアクセストークン]
LINE_CHANNEL_SECRET=[LINEチャネルシークレット]
```

#### メール送信（SMTP）

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=[送信元メールアドレス]
SMTP_PASSWORD=[アプリパスワード]
SMTP_FROM=noreply@blink.example.com
```

#### Google Calendar連携

```env
GOOGLE_CLIENT_ID=[Google OAuth Client ID]
GOOGLE_CLIENT_SECRET=[Google OAuth Client Secret]
GOOGLE_REDIRECT_URI=https://your-domain.vercel.app/api/google-calendar/callback
```

**注意**: これらの環境変数はGoogle Calendar連携用です。Supabase AuthのGoogleログイン用の設定は、Supabase Dashboardで行います（Vercelの環境変数には設定不要）。

#### Google Gemini API

```env
GEMINI_API_KEY=[Gemini API Key]
```

### 5. クライアント側環境変数

Vercelダッシュボードで、**クライアント側の環境変数**も設定：

```env
# API URL（本番環境のURL）
VITE_API_URL=https://your-domain.vercel.app

# Supabase Auth（必須）
VITE_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_SUPABASE_ANON_KEY]

# LINE LIFF
VITE_LIFF_ID=[LINE LIFF ID]
```

**重要**: クライアント側の環境変数は `VITE_` プレフィックスが必要です。

#### Supabase ANON KEYの取得方法

1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. プロジェクトを選択
3. **Settings** → **API** を開く
4. **Project URL** をコピー → `VITE_SUPABASE_URL` に設定
5. **anon public** キーをコピー → `VITE_SUPABASE_ANON_KEY` に設定
   - このキーは公開しても安全です（クライアント側で使用）
   - Row Level Security (RLS) で保護されています

### 6. ビルド設定の確認

プロジェクトルートの `vercel.json` で以下が設定されています：

- **Build Command**: `npm run build`
- **Output Directory**: `client/dist`
- **API Routes**: `/api/*` → `api/index.ts`

### 7. デプロイ

#### GitHub連携時

GitHubにプッシュすると自動的にデプロイされます：

```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

#### Vercel CLI使用時

```bash
# プレビュー環境にデプロイ
vercel

# 本番環境にデプロイ
vercel --prod
```

### 8. デプロイ後の確認

1. **フロントエンド**: `https://your-domain.vercel.app` にアクセス
2. **API**: `https://your-domain.vercel.app/api/health` にアクセスして確認
3. **ログ**: Vercelダッシュボードの「Functions」タブでログを確認

## アーキテクチャ

### フロントエンド（Vercel Edge Network）
- **ディレクトリ**: `client/`
- **フレームワーク**: Vite + React + TypeScript
- **ビルド出力**: `client/dist/`
- **デプロイ先**: Vercel Edge Network（CDN）

### バックエンド（Vercel Serverless Functions）
- **ディレクトリ**: `server/`
- **エントリーポイント**: `api/index.ts`
- **フレームワーク**: Express + TypeScript
- **APIエンドポイント**: `/api/*`
- **デプロイ先**: Vercel Serverless Functions（AWS Lambda）

### データベース（Supabase）
- **タイプ**: PostgreSQL
- **接続**: 接続文字列（`DATABASE_URL`）
- **認証**: JWT（アプリケーション側で実装）

## トラブルシューティング

### ビルドエラー

1. **依存関係のインストールエラー**
   - `package.json` の `install:all` スクリプトを確認
   - 各ディレクトリ（`server/`, `client/`）の `package.json` を確認

2. **TypeScriptコンパイルエラー**
   - ローカルで `npm run build` を実行してエラーを確認
   - `tsconfig.json` の設定を確認

3. **ビルドタイムアウト**
   - Vercelの無料プランでは25分の制限あり
   - ビルド時間を短縮する（不要な依存関係の削除など）

### データベース接続エラー

1. **接続文字列の確認**
   - `DATABASE_URL` が正しく設定されているか確認
   - Supabaseの接続情報が最新か確認

2. **IPアドレスの許可**
   - Supabaseダッシュボード → Settings → Database → Connection pooling
   - VercelのIPアドレスを許可（通常は不要）

3. **SSL接続**
   - SupabaseはSSL接続が必須
   - 接続文字列に `?sslmode=require` を追加

### APIエンドポイントが見つからない

1. **ルーティング設定**
   - `vercel.json` の `rewrites` 設定を確認
   - `api/index.ts` が正しくエクスポートされているか確認

2. **ビルド出力**
   - `server/dist/` ディレクトリが生成されているか確認
   - Vercelのビルドログを確認

### 環境変数が読み込まれない

1. **クライアント側の環境変数**
   - `VITE_` プレフィックスが必要
   - ビルド後に反映される（再デプロイが必要）

2. **サーバー側の環境変数**
   - Vercelダッシュボードで正しく設定されているか確認
   - 環境（Production, Preview, Development）ごとに設定が必要な場合あり

### ファイルアップロードエラー

1. **静的ファイル配信**
   - Vercelでは `/public/uploads` は永続化されない
   - 本番環境では、Supabase StorageやAWS S3などの外部ストレージを使用推奨

2. **一時的な解決策**
   - アップロードファイルをBase64エンコードしてデータベースに保存
   - または、Supabase Storageを使用

## 本番環境での注意事項

### セキュリティ

1. **環境変数の管理**
   - 機密情報は環境変数で管理
   - `.env` ファイルをGitにコミットしない

2. **CORS設定**
   - 本番環境のドメインを許可リストに追加
   - `server/src/index.ts` のCORS設定を確認

3. **JWT Secret**
   - 強力なランダム文字列を使用（32文字以上推奨）
   - 定期的にローテーション

### パフォーマンス

1. **コールドスタート対策**
   - Serverless Functionsのコールドスタートを考慮
   - 必要に応じて、Vercel Proプランでより長いタイムアウトを設定

2. **データベース接続プール**
   - Supabaseの接続プーリングを使用
   - 接続文字列に `?pgbouncer=true` を追加

### モニタリング

1. **Vercel Analytics**
   - Vercelダッシュボードでパフォーマンスを監視
   - エラーログを確認

2. **Supabase Dashboard**
   - データベースのパフォーマンスを監視
   - クエリの実行時間を確認

## 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Supabase Documentation](https://supabase.com/docs)
- [PAY.JP Documentation](https://pay.jp/docs)
- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)
