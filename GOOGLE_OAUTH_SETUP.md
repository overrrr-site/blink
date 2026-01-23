# Google OAuth設定ガイド

Supabase AuthでGoogleログインを使用するための設定手順です。

## 1. Google Cloud Consoleでプロジェクトを作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（または新規作成）
   - プロジェクト名: 任意（例: "Blink Pet Carte"）

## 2. OAuth同意画面を設定

1. **APIとサービス** → **OAuth同意画面** を開く
2. **ユーザータイプ** を選択:
   - **内部**: 組織内のみ（Google Workspace使用時）
   - **外部**: 一般公開（推奨）
3. **アプリ情報** を入力:
   - **アプリ名**: Blink（任意）
   - **ユーザーサポートメール**: あなたのメールアドレス
   - **アプリのロゴ**: 任意（オプション）
   - **アプリのホームページ**: あなたのサイトURL（例: `https://your-domain.com`）
   - **アプリのプライバシーポリシーリンク**: 任意（オプション）
   - **アプリの利用規約リンク**: 任意（オプション）
   - **承認済みのドメイン**: あなたのドメイン（例: `your-domain.com`）
4. **スコープ** を設定:
   - デフォルトのスコープ（`email`, `profile`, `openid`）でOK
5. **テストユーザー** を追加（外部アプリの場合）:
   - テスト中に使用するGoogleアカウントのメールアドレスを追加
6. **保存して次へ** をクリック

## 3. OAuth 2.0クライアントIDを作成

1. **APIとサービス** → **認証情報** を開く
2. **認証情報を作成** → **OAuth 2.0クライアントID** を選択
3. **アプリケーションの種類** を選択:
   - **ウェブアプリケーション** を選択
4. **名前** を入力（例: "Blink Web Client"）
5. **承認済みのリダイレクトURI** を追加:
   
   **Supabase Auth用のGoogleログインの場合**:
   ```
   https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback
   ```
   - `[YOUR_SUPABASE_PROJECT_REF]` は Supabase プロジェクトの参照ID
   - Supabase Dashboard → Settings → API で確認できます
   - 例: `https://fqepwzwkztjnpfeyxnke.supabase.co/auth/v1/callback`
   
   **Google Calendar連携用の場合**（別途設定が必要）:
   ```
   https://your-domain.vercel.app/api/google-calendar/callback
   ```
   
   **注意**: 1つのOAuthクライアントで両方のリダイレクトURIを設定できます。複数のリダイレクトURIを追加する場合は、改行で区切って追加してください。
6. **作成** をクリック
7. **クライアントID** と **クライアントシークレット** が表示されます
   - これらをコピーして保存してください

## 4. Supabaseに設定を追加

1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. プロジェクトを選択
3. **Authentication** → **Providers** を開く
4. **Google** を探して有効化
5. 以下を入力:
   - **Client ID (for OAuth)**: Google Cloud Consoleで取得したクライアントID
   - **Client Secret (for OAuth)**: Google Cloud Consoleで取得したクライアントシークレット
6. **保存** をクリック

## 5. Redirect URLの設定確認

Supabase Dashboard → **Authentication** → **URL Configuration** で以下が設定されていることを確認:

- **Site URL**: `http://localhost:5173` (開発用) または `https://your-domain.com` (本番用)
- **Redirect URLs**: 
  - `http://localhost:5173/auth/callback` (開発用)
  - `https://your-domain.com/auth/callback` (本番用)

## トラブルシューティング

### エラー: "redirect_uri_mismatch"
- Google Cloud Consoleの承認済みリダイレクトURIが正しいか確認
- SupabaseのリダイレクトURLが正しいか確認
- 両方とも完全一致する必要があります

### エラー: "access_denied"
- OAuth同意画面でテストユーザーを追加しているか確認（外部アプリの場合）
- アプリが本番公開されているか確認

### エラー: "invalid_client"
- クライアントIDとシークレットが正しく入力されているか確認
- コピー&ペースト時に余分なスペースが入っていないか確認

## 本番環境への移行

1. **OAuth同意画面** でアプリを公開:
   - Google Cloud Console → OAuth同意画面 → **公開** をクリック
   - これにより、すべてのGoogleアカウントでログイン可能になります

2. **承認済みのドメイン** を設定:
   - 本番ドメインを追加（例: `your-domain.com`）

3. **リダイレクトURI** を本番URLに更新:
   - Google Cloud Console: `https://your-domain.com/auth/callback`
   - Supabase: `https://your-domain.com/auth/callback`

## 参考リンク

- [Supabase Auth ドキュメント](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 ドキュメント](https://developers.google.com/identity/protocols/oauth2)
