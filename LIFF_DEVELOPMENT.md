# LINEミニアプリ開発環境でのテスト方法

## 概要

LINEミニアプリ（LIFF）の開発環境でのテスト方法を説明します。開発環境では、LIFF IDがなくてもダミーデータを使用してテストできます。

## 前提条件

- Node.js 18以上
- PostgreSQL 14以上
- データベースが初期化済み
- シードデータが投入済み

## テスト手順

### 1. バックエンドサーバーの起動

```bash
cd server
npm run dev
```

バックエンドAPIが `http://localhost:3001` で起動します。

### 2. フロントエンドサーバーの起動

別のターミナルで：

```bash
cd client
npm run dev
```

フロントエンドが `http://localhost:5173` で起動します。

### 3. LINEミニアプリにアクセス

ブラウザで以下のURLにアクセス：

```
http://localhost:5173/liff.html
```

または、Viteの開発サーバーが自動的に開く場合は、`/liff.html` にアクセスしてください。

### 4. テスト用の飼い主データにLINE IDを設定

開発環境では、LIFF IDが設定されていない場合、ダミーのLINEユーザーIDが使用されます。実際のデータベースの飼い主にLINE IDを設定するには：

#### 方法1: データベースに直接設定

```bash
# PostgreSQLに接続
psql -U postgres -d pet_carte

# 飼い主のLINE IDを設定（例：ID=1の飼い主に設定）
UPDATE owners SET line_id = 'dev-user-12345' WHERE id = 1;
```

#### 方法2: スタッフ向けWebアプリから設定

1. スタッフ向けWebアプリ（http://localhost:5173）にログイン
2. 飼い主詳細ページでLINE IDを設定

### 5. テストフロー

1. **ログイン画面**
   - `http://localhost:5173/liff.html` にアクセス
   - LIFF IDが設定されていない場合、自動的にダミーデータでログインを試みます
   - データベースに該当するLINE IDの飼い主がいない場合はエラーが表示されます

2. **ホーム画面**
   - 次回登園予定が表示されます
   - 各種機能へのショートカットが表示されます

3. **予約カレンダー**
   - 予約一覧とカレンダー表示
   - 新規予約の作成

4. **マイページ**
   - 飼い主情報、登録犬、契約情報の確認

5. **日誌閲覧**
   - 日誌一覧と詳細表示

6. **登園前入力**
   - 予約IDを指定してアクセス: `/liff/pre-visit/:reservationId`

## 開発環境での注意事項

### LIFF IDが設定されていない場合

`VITE_LIFF_ID` 環境変数が設定されていない場合、以下の動作になります：

- LIFF SDKの初期化はスキップされます
- ダミーのLINEユーザーID（`dev-user-{timestamp}`）が使用されます
- データベースに該当するLINE IDの飼い主が必要です

### 環境変数の設定（オプション）

`.env` ファイルを作成（`client/.env`）：

```env
VITE_LIFF_ID=your-liff-id-here
VITE_API_URL=http://localhost:3001
```

**注意**: 開発環境では `VITE_LIFF_ID` は必須ではありません。

## 実際のLINEアプリでテストする場合

### 1. ngrokでトンネルを作成

```bash
# ngrokをインストール（未インストールの場合）
brew install ngrok  # macOS
# または https://ngrok.com/download からダウンロード

# トンネルを作成
ngrok http 5173
```

ngrokが以下のようなURLを生成します：
```
https://xxxx-xxxx-xxxx.ngrok-free.app
```

### 2. LINE Developers Consoleで設定

1. [LINE Developers Console](https://developers.line.biz/console/) にログイン
2. プロバイダーを選択（または作成）
3. チャネルを作成（Messaging API）
4. LIFFアプリを追加
   - **LIFF app name**: 任意の名前（例：Blink開発環境）
   - **Size**: Full
   - **Endpoint URL**: `https://xxxx-xxxx-xxxx.ngrok-free.app/liff.html`
   - **Scope**: `profile`, `openid`
5. LIFF IDを取得して `client/.env` に設定

### 3. データベースにLINE IDを設定

```sql
-- テスト用の飼い主にLINE IDを設定
UPDATE owners SET line_id = '実際のLINEユーザーID' WHERE id = 1;
```

### 4. LINEアプリでテスト

1. LINEアプリを開く
2. 友だち追加（Messaging APIチャネルのQRコードをスキャン）
3. チャットで「LIFF」と送信
4. LIFFアプリが開きます

## トラブルシューティング

### エラー: "LINEアカウントが登録されていません"

**原因**: データベースの飼い主にLINE IDが設定されていない

**解決方法**:
```sql
-- 飼い主のLINE IDを確認
SELECT id, name, line_id FROM owners;

-- LINE IDを設定
UPDATE owners SET line_id = 'dev-user-12345' WHERE id = 1;
```

### エラー: "認証トークンが提供されていません"

**原因**: ログインが失敗している

**解決方法**:
1. ブラウザの開発者ツールでコンソールを確認
2. ネットワークタブでAPIリクエストを確認
3. バックエンドサーバーが起動しているか確認

### エラー: "LIFF SDK is not loaded"

**原因**: `liff.html` が正しく読み込まれていない

**解決方法**:
1. `client/liff.html` が存在するか確認
2. LIFF SDKのスクリプトタグが正しく記述されているか確認
3. ブラウザのコンソールでエラーを確認

## テスト用データの準備

### シードデータにLINE IDを追加

`server/src/db/seed.ts` を編集して、飼い主にLINE IDを設定：

```typescript
// 飼い主作成時にLINE IDを追加
const ownerResult = await pool.query(
  `INSERT INTO owners (..., line_id) VALUES (..., 'dev-user-12345') RETURNING *`
);
```

または、シード実行後に手動で設定：

```bash
psql -U postgres -d pet_carte -c "UPDATE owners SET line_id = 'dev-user-12345' WHERE id = 1;"
```

## まとめ

開発環境でのテストは以下の手順で行えます：

1. バックエンドとフロントエンドを起動
2. `http://localhost:5173/liff.html` にアクセス
3. データベースの飼い主にLINE IDを設定
4. 各機能をテスト

LIFF IDがなくても、ダミーデータを使用して基本的な機能をテストできます。
