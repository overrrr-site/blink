# Google OAuth リダイレクトURI設定ガイド

Google OAuthのリダイレクトURIは、用途によって異なります。

## 2つの異なる用途

### 1. Supabase Auth用のGoogleログイン

**リダイレクトURI**: SupabaseのURL

```
https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback
```

**例**:
```
https://fqepwzwkztjnpfeyxnke.supabase.co/auth/v1/callback
```

**設定場所**:
- Google Cloud Console → OAuth 2.0クライアントID → 承認済みのリダイレクトURI
- このURIを追加する必要があります

**なぜSupabaseのURL？**
- Supabase AuthがGoogle OAuthの認証フローを処理するため
- 認証後、Supabaseがアプリケーションにリダイレクトします

### 2. Google Calendar連携用

**リダイレクトURI**: VercelのAPIエンドポイント

```
https://your-domain.vercel.app/api/google-calendar/callback
```

**例**:
```
https://blink-pet-carte.vercel.app/api/google-calendar/callback
```

**設定場所**:
- Google Cloud Console → OAuth 2.0クライアントID → 承認済みのリダイレクトURI
- 環境変数 `GOOGLE_REDIRECT_URI` にも設定

**なぜVercelのURL？**
- Google Calendar API連携は、アプリケーション側でOAuthフローを処理するため
- 認証後、VercelのAPIエンドポイントにリダイレクトされます

## Google Cloud Consoleでの設定

### 方法1: 1つのOAuthクライアントで両方設定（推奨）

1. Google Cloud Console → **APIとサービス** → **認証情報**
2. OAuth 2.0クライアントIDを選択（または作成）
3. **承認済みのリダイレクトURI** に以下を**両方**追加：

```
https://fqepwzwkztjnpfeyxnke.supabase.co/auth/v1/callback
https://your-domain.vercel.app/api/google-calendar/callback
```

4. **保存** をクリック

### 方法2: 別々のOAuthクライアントを作成

用途ごとに別のOAuthクライアントを作成することもできます：

- **Supabase Auth用**: クライアントID 1
  - リダイレクトURI: `https://fqepwzwkztjnpfeyxnke.supabase.co/auth/v1/callback`
  - Supabase Dashboardで設定

- **Google Calendar連携用**: クライアントID 2
  - リダイレクトURI: `https://your-domain.vercel.app/api/google-calendar/callback`
  - Vercel環境変数で設定

## 現在のプロジェクトでの設定

あなたのSupabaseプロジェクトIDが `fqepwzwkztjnpfeyxnke` の場合：

### Google Cloud Consoleで設定するリダイレクトURI

```
https://fqepwzwkztjnpfeyxnke.supabase.co/auth/v1/callback
```

このURIをGoogle Cloud ConsoleのOAuth 2.0クライアントIDの「承認済みのリダイレクトURI」に追加してください。

### Supabase Dashboardでの設定

1. Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Google Cloud Consoleで取得した**クライアントID**と**クライアントシークレット**を入力
3. **保存**

これで、Supabase AuthがGoogle OAuthの認証フローを処理し、認証後にアプリケーションにリダイレクトします。

## まとめ

| 用途 | リダイレクトURI | 設定場所 |
|------|----------------|----------|
| Supabase Auth用 | `https://[PROJECT].supabase.co/auth/v1/callback` | Google Cloud Console + Supabase Dashboard |
| Google Calendar連携用 | `https://your-domain.vercel.app/api/google-calendar/callback` | Google Cloud Console + Vercel環境変数 |

**重要**: Supabase Auth用のGoogleログインでは、リダイレクトURIは**SupabaseのURL**を使用します。VercelのURLではありません。
