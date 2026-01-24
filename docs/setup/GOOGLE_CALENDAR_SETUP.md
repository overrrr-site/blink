# Googleカレンダー連携セットアップガイド

## 概要

Blinkでは、予約データをGoogleカレンダーに自動同期できます。予約の作成・更新・削除が自動的にGoogleカレンダーに反映されます。

## セットアップ手順

### 1. Google Cloud Consoleでプロジェクトを作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. プロジェクト名を入力して「作成」をクリック

### 2. Google Calendar APIを有効化

1. 「APIとサービス」→「ライブラリ」を開く
2. 「Google Calendar API」を検索
3. 「有効にする」をクリック

### 3. OAuth認証情報を作成

1. 「APIとサービス」→「認証情報」を開く
2. 「認証情報を作成」→「OAuth クライアント ID」を選択
3. 同意画面を設定（初回のみ）：
   - ユーザータイプ：外部
   - アプリ名、ユーザーサポートメール、デベロッパーの連絡先情報を入力
   - スコープ：`.../auth/calendar` と `.../auth/calendar.events` を追加
   - テストユーザー：使用するGoogleアカウントを追加
4. OAuth クライアント IDを作成：
   - アプリケーションの種類：ウェブアプリケーション
   - 名前：任意（例：Blink Calendar Integration）
   - 承認済みのリダイレクト URI：
     - ローカル開発: `http://localhost:3001/api/google-calendar/callback`
     - 本番環境: `https://your-domain.com/api/google-calendar/callback`

### 4. 環境変数を設定

`server/.env` ファイルに以下を追加：

```env
# Google Calendar API
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/google-calendar/callback

# フロントエンドURL（本番環境では本番URLに変更）
FRONTEND_URL=http://localhost:5173
```

### 5. データベースマイグレーションの実行

```bash
cd server
# マイグレーションファイルを手動で実行するか、init.tsに追加
psql -d pet_carte -f src/db/migrations/002_google_calendar.sql
```

または、Supabaseを使用している場合は、SupabaseダッシュボードのSQL Editorで実行：

```sql
-- Googleカレンダー連携テーブル
CREATE TABLE IF NOT EXISTS google_calendar_integrations (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
  calendar_id VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMP,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 予約とGoogleカレンダーイベントの関連テーブル
CREATE TABLE IF NOT EXISTS reservation_calendar_events (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE CASCADE UNIQUE,
  calendar_event_id VARCHAR(255) NOT NULL,
  calendar_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_google_calendar_integrations_store_id ON google_calendar_integrations(store_id);
CREATE INDEX IF NOT EXISTS idx_reservation_calendar_events_reservation_id ON reservation_calendar_events(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_calendar_events_calendar_event_id ON reservation_calendar_events(calendar_event_id);
```

## 使用方法

### 1. 設定画面から連携

1. アプリにログイン
2. 「設定」画面を開く
3. 「Googleカレンダー連携」セクションで「Googleカレンダーと連携」をクリック
4. Googleアカウントでログイン
5. 権限を承認
6. 連携完了

### 2. 自動同期（アプリ → Googleカレンダー）

連携後、以下の操作が自動的にGoogleカレンダーに反映されます：

- **予約作成**: 新しい予約がGoogleカレンダーにイベントとして追加
- **予約更新**: 予約情報の変更がGoogleカレンダーのイベントに反映
- **予約キャンセル**: キャンセルされた予約がGoogleカレンダーから削除

### 3. イベントの形式

Googleカレンダーに作成されるイベント：

- **タイトル**: `🐾 犬名（飼い主名様）`
- **説明**: `予約ID: 123\nメモ内容`
- **開始時刻**: 予約日時
- **終了時刻**: 開始時刻から8時間後（デフォルト）

## トラブルシューティング

### 連携が失敗する場合

1. 環境変数が正しく設定されているか確認
2. Google Cloud ConsoleでOAuth認証情報が正しく設定されているか確認
3. リダイレクトURIが正確に一致しているか確認
4. サーバーログでエラーを確認

### 同期が動作しない場合

1. 設定画面で連携状態を確認
2. トークンの有効期限を確認（自動リフレッシュされます）
3. サーバーログでエラーを確認
4. Googleカレンダーの権限を確認

### トークンのリフレッシュ

アクセストークンは自動的にリフレッシュされます。リフレッシュに失敗した場合は、設定画面から連携を解除して再度連携してください。

## セキュリティ

- アクセストークンとリフレッシュトークンはデータベースに暗号化して保存することを推奨
- 本番環境ではHTTPSを使用してください
- OAuth認証情報は環境変数で管理し、コードに直接記述しないでください

## 参考リンク

- [Google Calendar API ドキュメント](https://developers.google.com/calendar/api)
- [Google OAuth 2.0 ドキュメント](https://developers.google.com/identity/protocols/oauth2)
