# LINEミニアプリ クイックスタートガイド

## 最短でテストする方法

### 1. サーバーを起動

**ターミナル1（バックエンド）:**
```bash
cd server
npm run dev
```

**ターミナル2（フロントエンド）:**
```bash
cd client
npm run dev
```

### 2. ブラウザでアクセス

```
http://localhost:5173/liff.html
```

### 3. 自動ログイン

開発環境では、LIFF IDが設定されていない場合、自動的にダミーのLINEユーザーIDでログインを試みます。

**重要**: シードデータには既に `tanaka_line_id` というLINE IDが設定されていますが、開発環境のダミーID（`dev-user-{timestamp}`）とは異なります。

### 4. テスト用LINE IDを設定（推奨）

データベースの飼い主に開発用のLINE IDを設定します：

```bash
# PostgreSQLに接続
psql -U postgres -d pet_carte

# 開発用のLINE IDを設定（シードデータの飼い主に）
UPDATE owners SET line_id = 'dev-user-12345' WHERE name = '田中 花子';
```

または、シードデータを再実行する前に `server/src/db/seed.ts` の `line_id` を `'dev-user-12345'` に変更してください。

## テストフロー

1. **ログイン画面** (`/liff/login`)
   - 自動的にログインを試みます
   - 成功するとホーム画面に遷移

2. **ホーム画面** (`/liff`)
   - 次回登園予定
   - 各種機能へのショートカット

3. **予約カレンダー** (`/liff/reservations`)
   - 予約一覧とカレンダー表示
   - 新規予約作成ボタン

4. **マイページ** (`/liff/mypage`)
   - 飼い主情報
   - 登録犬一覧
   - 契約情報

5. **日誌一覧** (`/liff/journals`)
   - 日誌一覧表示
   - 日誌詳細へのリンク

## トラブルシューティング

### エラー: "LINEアカウントが登録されていません"

**解決方法:**
```sql
-- データベースに接続
psql -U postgres -d pet_carte

-- 飼い主のLINE IDを確認
SELECT id, name, line_id FROM owners;

-- 開発用のLINE IDを設定（例：ID=1の飼い主）
UPDATE owners SET line_id = 'dev-user-12345' WHERE id = 1;
```

### エラー: "認証トークンが提供されていません"

1. ブラウザの開発者ツール（F12）を開く
2. コンソールタブでエラーを確認
3. ネットワークタブでAPIリクエストを確認
4. バックエンドサーバーが `http://localhost:3001` で起動しているか確認

### データが表示されない

1. シードデータが投入されているか確認:
   ```bash
   cd server
   npm run db:seed
   ```

2. ブラウザの開発者ツールでAPIレスポンスを確認

## 開発環境での注意点

- **LIFF IDは不要**: 開発環境では `VITE_LIFF_ID` を設定する必要はありません
- **ダミーデータ使用**: LIFF IDが設定されていない場合、ダミーのLINEユーザーIDが使用されます
- **データベースのLINE ID**: ダミーIDと一致するLINE IDをデータベースに設定する必要があります

## 次のステップ

実際のLINEアプリでテストする場合は、[LIFF_DEVELOPMENT.md](./LIFF_DEVELOPMENT.md) を参照してください。
