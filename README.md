# Blink - 犬の幼稚園向け顧客管理システム

## 概要

犬の幼稚園・保育園向けのシンプルで使いやすい顧客管理システムです。飼い主と店舗の情報連携、AIを活用した日誌作成の効率化を実現します。

## 機能

### MVP (Phase 1)
- 顧客・犬情報管理
- 予約管理（基本機能）
- 連絡帳（飼い主入力 → 店舗確認）

### 将来的な機能
- 回数券・コース管理
- AI文章生成による日誌作成効率化
- LINEミニアプリ連携

## 技術スタック

### フロントエンド
- React 18
- TypeScript
- Vite
- Tailwind CSS

### バックエンド
- Node.js
- Express
- TypeScript
- PostgreSQL
- JWT認証

## セットアップ

### 前提条件

- Node.js 18以上
- PostgreSQL 14以上（ローカル開発用）

### ローカル開発

#### 1. PostgreSQLデータベースの作成

```bash
# PostgreSQLがインストールされていることを確認
psql --version

# データベースを作成
createdb pet_carte

# または、psqlで作成
psql -U postgres
CREATE DATABASE pet_carte;
\q
```

#### 2. 依存関係のインストール

```bash
npm run install:all
```

#### 3. 環境変数の設定

`server/.env` ファイルを作成:

```bash
cp server/.env.example server/.env
```

`server/.env` を編集して、PostgreSQLの接続情報を設定:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pet_carte
PORT=3001
JWT_SECRET=your-local-development-secret-key
NODE_ENV=development
```

**注意**: `postgres:postgres` の部分を実際のPostgreSQLのユーザー名とパスワードに変更してください。

#### 4. データベーススキーマの初期化

サーバーを起動すると自動的にスキーマが初期化されます。手動で実行する場合:

```bash
cd server
npm run dev
```

初回起動時にテーブルが自動作成されます。

#### 5. シードデータの投入（オプション）

別のターミナルで:

```bash
cd server
npm run db:seed
```

これでテストアカウントが作成されます。

#### 6. 開発サーバーの起動

```bash
npm run dev
```

- フロントエンド: http://localhost:5173
- バックエンドAPI: http://localhost:3001

### テストアカウント

ログイン情報:
- メールアドレス: `admin@example.com`
- パスワード: `password123`

### 本番環境（Vercel + Supabase）

ローカル環境で動作確認が完了したら、[DEPLOYMENT.md](./DEPLOYMENT.md) を参照してVercel + Supabaseにデプロイしてください。

### テストアカウント

ログイン情報:
- メールアドレス: `admin@example.com`
- パスワード: `password123`

## プロジェクト構造

```
pet-carte/
├── client/          # フロントエンド (React + TypeScript)
├── server/          # バックエンド (Node.js + Express)
├── docs/            # ドキュメント
└── package.json     # ルートパッケージ設定
```

## ライセンス

MIT
