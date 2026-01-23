# Blink - Vercel + Supabase デプロイガイド

## 前提条件

- Vercelアカウント
- Supabaseアカウント
- GitHubアカウント（推奨）

## セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセスしてアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクト設定から以下を取得：
   - Project URL (`SUPABASE_URL`)
   - Anon Key (`SUPABASE_ANON_KEY`)
   - Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`)
   - Database Password（プロジェクト作成時に設定）

### 2. Supabaseデータベースのセットアップ

詳細な手順は [SETUP_SUPABASE.md](./SETUP_SUPABASE.md) を参照してください。

簡単な手順：
1. Supabaseダッシュボードの「SQL Editor」を開く
2. `server/src/db/migrations/supabase_migration.sql` の内容をコピー
3. SQL Editorに貼り付けて実行
4. テーブルが正常に作成されたことを確認

### 3. シードデータの投入（オプション）

```bash
cd server
npm install
npm run db:seed
```

または、Supabaseダッシュボードの「Table Editor」から手動でデータを追加

### 4. Vercelプロジェクトの作成

#### 方法1: Vercel CLIを使用（推奨）

```bash
# Vercel CLIのインストール
npm i -g vercel

# プロジェクトにログイン
vercel login

# プロジェクトをデプロイ
vercel

# 環境変数を設定
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add JWT_SECRET
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
5. 環境変数を設定（Settings → Environment Variables）

### 5. 環境変数の設定

Vercelダッシュボードの「Settings」→「Environment Variables」で以下を設定：

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-random-secret-key
NODE_ENV=production
```

### 6. ビルド設定の確認

Vercelは自動的に以下を検出します：
- フロントエンド: `client/` ディレクトリ（Vite）
- バックエンド: `server/` ディレクトリ（Node.js）

カスタムビルド設定が必要な場合は、`vercel.json` を参照してください。

### 7. デプロイ

```bash
# 本番環境にデプロイ
vercel --prod
```

または、GitHubにプッシュすると自動デプロイされます（GitHub連携時）。

## アーキテクチャ

### フロントエンド（Vercel）
- **ディレクトリ**: `client/`
- **フレームワーク**: Vite + React + TypeScript
- **ビルド出力**: `client/dist/`
- **デプロイ先**: Vercel Edge Network

### バックエンド（Vercel Serverless Functions）
- **ディレクトリ**: `server/`
- **フレームワーク**: Express + TypeScript
- **APIエンドポイント**: `/api/*`
- **デプロイ先**: Vercel Serverless Functions

### データベース（Supabase）
- **タイプ**: PostgreSQL
- **接続**: SupabaseクライアントまたはPostgreSQL接続文字列
- **認証**: Supabase Auth（将来の拡張用）

## 環境変数

### 必須
- `SUPABASE_URL`: SupabaseプロジェクトURL
- `SUPABASE_SERVICE_ROLE_KEY`: サーバーサイド用のService Role Key
- `JWT_SECRET`: JWTトークンの署名用シークレット

### オプション
- `SUPABASE_ANON_KEY`: クライアントサイド用のAnon Key
- `SUPABASE_DB_URL`: 直接PostgreSQL接続文字列
- `PORT`: サーバーポート（Vercelでは自動設定）

## トラブルシューティング

### データベース接続エラー

1. Supabaseの接続情報を確認
2. IPアドレスの許可設定を確認（Supabaseダッシュボード）
3. 環境変数が正しく設定されているか確認

### ビルドエラー

1. `npm run install:all` が正常に完了しているか確認
2. TypeScriptのコンパイルエラーを確認
3. Vercelのビルドログを確認

### APIエンドポイントが見つからない

1. `vercel.json` のルーティング設定を確認
2. バックエンドのビルドが成功しているか確認
3. APIルートのパスが正しいか確認

## ローカル開発

```bash
# 依存関係のインストール
npm run install:all

# 環境変数を設定
cp .env.example .env
# .envファイルを編集

# 開発サーバー起動
npm run dev
```

## 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
