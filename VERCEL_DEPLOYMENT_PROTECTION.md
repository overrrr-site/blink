# Vercel Deployment Protection（アクセス制限）の設定

`https://blink-overrrr.vercel.app` に、Vercelアカウントでログインしているユーザーだけがアクセスできるようにする手順です。

## 設定手順

### 1. Vercel Dashboard を開く

1. [Vercel Dashboard](https://vercel.com) にログイン
2. プロジェクト **blink** を選択
3. **Settings** タブを開く

### 2. Deployment Protection を有効化

1. 左サイドバーで **Deployment Protection** をクリック
2. **Vercel Authentication** の項目を探す
3. **Production** で「Vercel Authentication」を有効にする
   - トグルを ON にする
   - 必要なら **Preview** も同様に ON にする

### 3. 保存

設定を保存すると、すぐに反映されます。

## 動作イメージ

- 未ログインで `https://blink-overrrr.vercel.app/login` にアクセス  
  → Vercel のログイン画面にリダイレクト
- Vercel にログイン済み  
  → そのまま Blink のログインページ（/login）などにアクセス可能

## アクセスできるユーザー

Vercel Authentication が有効な場合、以下のいずれかに該当するユーザーのみアクセスできます。

- ログイン済みの **チームメンバー**（Viewer 以上）
- ログイン済みの **プロジェクトメンバー**（Viewer 以上）
- アクセス権限を与えられた **Vercel ユーザー**
- **Shareable Link** を持つユーザー（共有リンクを発行した場合）

## 注意点

- **対象範囲**: サイト全体（`/login` だけでなく、すべてのパス）が保護されます。
- **Blink のログイン**: Vercel ログイン通過後、`/login` で Supabase Auth（メール / Google）による Blink のログインが必要です。
- **プラン**: Vercel Authentication は全プランで利用可能です。

## 参考

- [Vercel Authentication](https://vercel.com/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication)
- [Deployment Protection](https://vercel.com/docs/deployment-protection)
