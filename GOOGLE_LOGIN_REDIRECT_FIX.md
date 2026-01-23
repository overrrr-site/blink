# Googleログインのリダイレクト問題の修正

Googleログイン時に`localhost`にリダイレクトされる問題を修正します。

## 問題

Googleログイン後に `http://localhost:3000/#access_token=...` にリダイレクトされる。

## 原因

1. **Supabase DashboardのRedirect URLs設定**に本番環境のURLが追加されていない
2. フロントエンドコードで`window.location.origin`を使用しているが、本番環境で正しく動作していない可能性

## 修正手順

### 1. コードの修正（完了）

- `client/src/store/authStore.ts` を修正
- 環境変数 `VITE_FRONTEND_URL` を優先的に使用するように変更

### 2. Vercel環境変数の設定

Vercel Dashboard → Settings → Environment Variables で以下を追加：

```
VITE_FRONTEND_URL=https://blink-delta-one.vercel.app
```

### 3. Supabase Dashboardの設定（重要）

1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. プロジェクトを選択
3. **Authentication** → **URL Configuration** を開く
4. **Redirect URLs** セクションを確認・追加

以下のURLを **Redirect URLs** に追加してください：

```
https://blink-delta-one.vercel.app/auth/callback
```

**注意**: 
- 複数のURLを追加する場合は、改行で区切ってください
- `localhost` のURLは開発用として残しておいても問題ありません

### 4. Site URLの設定

**Site URL** を本番環境のURLに設定：

```
https://blink-delta-one.vercel.app
```

### 5. Google Cloud Consoleの設定確認

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択
3. **APIとサービス** → **認証情報** を開く
4. OAuth 2.0クライアントIDを選択
5. **承認済みのリダイレクトURI** を確認

以下のURIが追加されていることを確認：

```
https://fqepwzwkztjnpfeyxnke.supabase.co/auth/v1/callback
```

**重要**: Google Cloud ConsoleのリダイレクトURIは **SupabaseのURL** です（VercelのURLではありません）。

## 設定の確認

### Supabase Dashboard

- [ ] Redirect URLsに本番環境のURLが追加されている
- [ ] Site URLが本番環境のURLになっている

### Vercel Dashboard

- [ ] `VITE_FRONTEND_URL` 環境変数が設定されている
- [ ] 環境変数が本番環境（Production）に適用されている

### Google Cloud Console

- [ ] 承認済みのリダイレクトURIにSupabaseのURLが追加されている

## テスト

1. 本番環境（`https://blink-delta-one.vercel.app/login`）にアクセス
2. 「Googleでログイン」をクリック
3. Google認証を完了
4. 本番環境の `/auth/callback` にリダイレクトされることを確認
5. ダッシュボード（`/`）にリダイレクトされることを確認

## トラブルシューティング

### まだ `localhost` にリダイレクトされる場合

1. **ブラウザのキャッシュをクリア**
2. **シークレットモードでテスト**
3. **Supabase Dashboardの設定を再確認**
   - Redirect URLsに本番URLが追加されているか
   - Site URLが本番URLになっているか
4. **Vercel環境変数を確認**
   - `VITE_FRONTEND_URL` が設定されているか
   - 再デプロイが必要な場合があります

### エラーが表示される場合

1. ブラウザのコンソールでエラーを確認
2. Vercelのログを確認
3. Supabase Dashboardのログを確認

## 参考

- [Supabase Auth Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
