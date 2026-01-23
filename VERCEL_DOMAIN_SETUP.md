# Vercelドメイン設定の確認と統一

## 現在の状況

- **Vercelドメイン設定**: `blink-delta-one.vercel.app`
- **GitHub Webサイト設定**: `https://blink-overrrr.vercel.app`
- **実際にアクセス可能**: 両方のURLが動作

## VercelのURLについて

Vercelプロジェクトには複数のURLが割り当てられることがあります：

1. **プロジェクト名ベース**: `blink-overrrr.vercel.app`（GitHubリポジトリ名から生成）
2. **カスタムエイリアス**: `blink-delta-one.vercel.app`（Vercel Dashboardで設定）

両方のURLが動作する場合、どちらを使用しても問題ありませんが、設定を統一する必要があります。

## 推奨設定

### 1. 環境変数の設定

GitHubのWebサイト設定に合わせて、以下を設定：

**Vercel Dashboard → Settings → Environment Variables**:

```
VITE_FRONTEND_URL=https://blink-overrrr.vercel.app
FRONTEND_URL=https://blink-overrrr.vercel.app
```

### 2. Supabase Dashboardの設定

**両方のURL**をRedirect URLsに追加（安全のため）：

1. Supabase Dashboard → Authentication → URL Configuration
2. **Redirect URLs** に以下を追加：

```
https://blink-overrrr.vercel.app/auth/callback
https://blink-delta-one.vercel.app/auth/callback
```

3. **Site URL** を以下に設定（メインのURL）：

```
https://blink-overrrr.vercel.app
```

### 3. GitHub Pages設定の確認（オプション）

GitHubリポジトリ → Settings → Pages で、VercelのURLが正しく設定されているか確認してください。

## 確認方法

### Vercel Dashboardで確認

1. Vercel Dashboard → プロジェクト → Settings → Domains
2. 割り当てられているすべてのドメインを確認
3. メインドメインを確認

### 動作確認

1. `https://blink-overrrr.vercel.app/login` にアクセス
2. Googleログインをテスト
3. リダイレクトが正しく動作するか確認

## トラブルシューティング

### どちらのURLを使うべきか

- **GitHubのWebサイト設定に合わせる**: `blink-overrrr.vercel.app`（推奨）
- **Vercelのドメイン設定に合わせる**: `blink-delta-one.vercel.app`

両方のURLをSupabaseのRedirect URLsに追加すれば、どちらからアクセスしても動作します。
