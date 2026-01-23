# Vercel環境変数: FRONTEND_URL と VITE_FRONTEND_URL

## 既存の環境変数

Vercel環境変数に既に `FRONTEND_URL` が存在する場合の対応方法です。

## 2つの環境変数の違い

### `FRONTEND_URL`（サーバー側用）
- **用途**: バックエンド（サーバーサイド）で使用
- **例**: スタッフ招待メールのリダイレクトURL生成など
- **設定場所**: Vercel環境変数（`FRONTEND_URL`）

### `VITE_FRONTEND_URL`（クライアント側用）
- **用途**: フロントエンド（ブラウザ）で使用
- **例**: GoogleログインのリダイレクトURL生成など
- **設定場所**: Vercel環境変数（`VITE_FRONTEND_URL`）
- **重要**: Viteでは、クライアント側で使用する環境変数は `VITE_` プレフィックスが必要

## 設定方法

### 方法1: 既存のFRONTEND_URLの値をコピー（推奨）

1. Vercel Dashboard → Settings → Environment Variables
2. 既存の `FRONTEND_URL` の値を確認（例: `https://blink-overrrr.vercel.app`）
3. 新しい環境変数を追加:
   - **Key**: `VITE_FRONTEND_URL`
   - **Value**: `FRONTEND_URL` と同じ値（例: `https://blink-delta-one.vercel.app`）
   - **Environment**: Production, Preview, Development を選択
4. **Save** をクリック

### 方法2: 既存のFRONTEND_URLを確認して設定

既存の `FRONTEND_URL` が以下の場合:
```
FRONTEND_URL=https://blink-delta-one.vercel.app
```

以下の環境変数を追加:
```
VITE_FRONTEND_URL=https://blink-delta-one.vercel.app
```

## 確認

### 既存の環境変数を確認

Vercel CLIで確認:
```bash
vercel env ls
```

または、Vercel Dashboard → Settings → Environment Variables で確認

### コードでの使用

**サーバー側**（`server/src/routes/auth.ts`など）:
```typescript
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
```

**クライアント側**（`client/src/store/authStore.ts`など）:
```typescript
const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin
```

## 注意事項

- `VITE_` プレフィックスがない環境変数は、クライアント側では使用できません
- 環境変数を追加した後は、**再デプロイ**が必要です
- ビルド時に環境変数が埋め込まれるため、変更後は再ビルドが必要です

## トラブルシューティング

### 環境変数が反映されない

1. 再デプロイを実行
2. ビルドログで環境変数が読み込まれているか確認
3. ブラウザのコンソールで `import.meta.env.VITE_FRONTEND_URL` を確認

### まだlocalhostにリダイレクトされる

1. Supabase DashboardのRedirect URLs設定を確認
2. ブラウザのコンソールで `window.location.origin` を確認
3. デプロイ後のビルドで環境変数が正しく埋め込まれているか確認
