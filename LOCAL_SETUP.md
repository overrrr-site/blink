# ローカル開発環境セットアップガイド

## 前提条件

- Node.js 18以上
- PostgreSQL 14以上
- npm または yarn

## セットアップ手順

### 1. PostgreSQLのインストールとセットアップ

#### macOS (Homebrew)

```bash
brew install postgresql@14
brew services start postgresql@14

# PostgreSQLに接続
psql postgres

# データベースを作成
CREATE DATABASE pet_carte;
CREATE USER pet_carte_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE pet_carte TO pet_carte_user;
\q
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# PostgreSQLに接続
sudo -u postgres psql

# データベースを作成
CREATE DATABASE pet_carte;
CREATE USER pet_carte_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE pet_carte TO pet_carte_user;
\q
```

#### Windows

1. [PostgreSQL公式サイト](https://www.postgresql.org/download/windows/)からインストーラーをダウンロード
2. インストール時にパスワードを設定
3. pgAdminまたはコマンドプロンプトからデータベースを作成

### 2. リポジトリのクローンと依存関係のインストール

```bash
# リポジトリをクローン（既にクローン済みの場合はスキップ）
# git clone <repository-url>
# cd pet-carte

# 依存関係をインストール
npm run install:all
```

### 3. 環境変数の設定

```bash
# server/.envファイルを作成
cd server
cp .env.example .env
```

`server/.env` を編集:

```env
# PostgreSQL接続文字列
# 形式: postgresql://[ユーザー名]:[パスワード]@[ホスト]:[ポート]/[データベース名]
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pet_carte

# アプリケーション設定
PORT=3001
JWT_SECRET=your-local-development-secret-key-change-this
NODE_ENV=development
```

**重要**: 
- `postgres:postgres` の部分を実際のPostgreSQLのユーザー名とパスワードに変更してください
- `JWT_SECRET` はランダムな文字列に変更してください

### 4. データベーススキーマの初期化

サーバーを起動すると自動的にスキーマが初期化されます:

```bash
# サーバーを起動（別ターミナルで実行）
cd server
npm run dev
```

初回起動時に以下のメッセージが表示されます:
```
✅ データベース接続に成功しました
ℹ️  ローカルPostgreSQLを使用しています。スキーマを初期化します...
✅ データベーススキーマの初期化が完了しました
```

### 5. シードデータの投入（オプション）

テスト用のデータを投入します:

```bash
# 別のターミナルで実行
cd server
npm run db:seed
```

これで以下のテストアカウントが作成されます:
- **メールアドレス**: `admin@example.com`
- **パスワード**: `password123`

### 6. 開発サーバーの起動

```bash
# ルートディレクトリで実行
npm run dev
```

これで以下が起動します:
- **フロントエンド**: http://localhost:5173
- **バックエンドAPI**: http://localhost:3001

### 7. 動作確認

1. ブラウザで http://localhost:5173 にアクセス
2. ログイン画面が表示されることを確認
3. テストアカウントでログイン:
   - メール: `admin@example.com`
   - パスワード: `password123`
4. ダッシュボードが表示されることを確認

## トラブルシューティング

### データベース接続エラー

**エラー**: `Connection refused` または `password authentication failed`

**解決方法**:
1. PostgreSQLが起動しているか確認:
   ```bash
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   ```

2. 接続情報を確認:
   - `DATABASE_URL` のユーザー名、パスワード、データベース名が正しいか
   - PostgreSQLのポート（デフォルト: 5432）が正しいか

3. PostgreSQLの認証設定を確認:
   ```bash
   # pg_hba.conf を確認（必要に応じて編集）
   # macOS: /usr/local/var/postgresql@14/pg_hba.conf
   # Linux: /etc/postgresql/14/main/pg_hba.conf
   ```

### テーブルが作成されない

**エラー**: `relation "staff" does not exist`

**解決方法**:
1. データベースが正しく作成されているか確認:
   ```bash
   psql -U postgres -d pet_carte -c "\dt"
   ```

2. 手動でスキーマを実行:
   ```bash
   psql -U postgres -d pet_carte -f server/src/db/migrations/001_initial_schema.sql
   ```

### ポートが既に使用されている

**エラー**: `EADDRINUSE: address already in use :::3001`

**解決方法**:
1. 使用中のプロセスを確認:
   ```bash
   lsof -i :3001
   ```

2. プロセスを終了:
   ```bash
   kill -9 <PID>
   ```

3. または、`PORT` 環境変数を変更:
   ```env
   PORT=3002
   ```

### 依存関係のインストールエラー

**エラー**: `npm ERR!` または `node-gyp` エラー

**解決方法**:
1. Node.jsのバージョンを確認（18以上が必要）:
   ```bash
   node --version
   ```

2. キャッシュをクリア:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

3. 各ディレクトリで個別にインストール:
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

## 開発のヒント

### データベースのリセット

```bash
# データベースを削除して再作成
psql -U postgres -c "DROP DATABASE pet_carte;"
psql -U postgres -c "CREATE DATABASE pet_carte;"

# サーバーを再起動（スキーマが自動初期化される）
cd server
npm run dev
```

### ログの確認

- サーバーログ: ターミナルに直接表示
- データベースログ: PostgreSQLのログファイルを確認

### ホットリロード

- フロントエンド: Viteが自動的にリロード
- バックエンド: `tsx watch` が自動的に再起動

## 次のステップ

ローカル環境で動作確認が完了したら:
1. [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してVercel + Supabaseにデプロイ
2. [SETUP_SUPABASE.md](./SETUP_SUPABASE.md) を参照してSupabaseをセットアップ
