# Vercelドメインの統一手順

`blink-overrrr.vercel.app`に統一し、`blink-delta-one.vercel.app`を削除する手順です。

## 手順

### 1. Vercel Dashboardでドメイン設定を確認

1. [Vercel Dashboard](https://vercel.com) にアクセス
2. プロジェクト **blink** を選択
3. **Settings** → **Domains** を開く
4. 現在のドメイン一覧を確認

### 2. カスタムドメインエイリアスの削除

1. **Domains** ページで `blink-delta-one.vercel.app` を探す
2. 該当ドメインの **...** メニューをクリック
3. **Remove** または **Delete** を選択
4. 確認ダイアログで **削除** をクリック

**注意**: 
- 削除後、`blink-delta-one.vercel.app` へのアクセスはできなくなります
- 削除前に、すべての設定を `blink-overrrr.vercel.app` に移行してください

### 3. 環境変数の更新

Vercel Dashboard → Settings → Environment Variables で以下を確認・設定：

```
VITE_FRONTEND_URL=https://blink-overrrr.vercel.app
FRONTEND_URL=https://blink-overrrr.vercel.app
```

### 4. Supabase Dashboardの設定更新

1. Supabase Dashboard → Authentication → URL Configuration
2. **Redirect URLs** から以下を削除：
   ```
   https://blink-delta-one.vercel.app/auth/callback
   ```
3. **Redirect URLs** に以下が残っていることを確認：
   ```
   https://blink-overrrr.vercel.app/auth/callback
   ```
4. **Site URL** が以下になっていることを確認：
   ```
   https://blink-overrrr.vercel.app
   ```
5. **保存** をクリック

### 5. Google Cloud Consoleの設定確認（オプション）

Google Cloud Consoleで、リダイレクトURIに `blink-delta-one.vercel.app` が含まれている場合は削除してください（通常はSupabaseのURLのみで問題ありません）。

### 6. 再デプロイ

環境変数の変更後、再デプロイを実行：

```bash
vercel --prod
```

または、Vercel Dashboardから **Redeploy** を実行

## 確認

### 削除後の確認

1. `https://blink-delta-one.vercel.app` にアクセス
   - 404エラーまたは「Domain not found」が表示されることを確認
2. `https://blink-overrrr.vercel.app/login` にアクセス
   - 正常に表示されることを確認
3. Googleログインをテスト
   - 正常にリダイレクトされることを確認

## トラブルシューティング

### ドメインが削除できない場合

- Vercelのプロジェクト設定で、`blink-delta-one.vercel.app` がメインドメインとして設定されている可能性があります
- その場合は、まず別のドメインをメインに設定してから削除してください

### 削除後もアクセスできる場合

- DNSキャッシュの影響で、しばらく時間がかかる場合があります
- 数時間待ってから再度確認してください
