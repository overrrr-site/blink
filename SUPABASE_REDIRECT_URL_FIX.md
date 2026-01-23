# Supabase リダイレクトURL設定の修正

Googleログイン後に `localhost:3000` にリダイレクトされる問題を修正します。

## 問題

Googleログイン後に `http://localhost:3000/#access_token=...` にリダイレクトされている。

## 原因

Supabase Dashboardの **Redirect URLs** 設定に、本番環境のURLが追加されていない可能性があります。

## 修正手順

### 1. Supabase Dashboardで設定を確認・修正

1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. プロジェクトを選択
3. **Authentication** → **URL Configuration** を開く
4. **Redirect URLs** セクションを確認

### 2. 本番環境のURLを追加

以下のURLを **Redirect URLs** に追加してください：

```
https://blink-overrrr.vercel.app/auth/callback
https://blink-pj2bqdr4f-overrrr.vercel.app/auth/callback
```

**注意**: 複数のURLを追加する場合は、改行で区切ってください。

### 3. Site URLも確認

**Site URL** が本番環境のURLになっているか確認：

```
https://blink-overrrr.vercel.app
```

または

```
https://blink-pj2bqdr4f-overrrr.vercel.app
```

### 4. 保存

設定を保存すると、すぐに反映されます。

## 設定例

### Redirect URLs

```
http://localhost:5173/auth/callback
https://blink-overrrr.vercel.app/auth/callback
https://blink-pj2bqdr4f-overrrr.vercel.app/auth/callback
```

### Site URL

```
https://blink-overrrr.vercel.app
```

## 確認事項

- [ ] Redirect URLsに本番環境のURLが追加されている
- [ ] Site URLが本番環境のURLになっている
- [ ] 設定を保存した

## テスト

1. 本番環境（`https://blink-overrrr.vercel.app/login`）にアクセス
2. 「Googleでログイン」をクリック
3. Google認証を完了
4. 本番環境の `/auth/callback` にリダイレクトされることを確認
5. ダッシュボード（`/`）にリダイレクトされることを確認

## トラブルシューティング

### まだ `localhost` にリダイレクトされる場合

1. ブラウザのキャッシュをクリア
2. シークレットモードでテスト
3. Supabase Dashboardの設定を再確認

### エラーが表示される場合

1. ブラウザのコンソールでエラーを確認
2. Vercelのログを確認
3. Supabase Dashboardのログを確認
