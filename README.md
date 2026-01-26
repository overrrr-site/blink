# Blink - 犬の幼稚園向け顧客管理システム

## 概要

犬の幼稚園・保育園向けのシンプルで使いやすい顧客管理システムです。飼い主と店舗の情報連携、AIを活用した日誌作成の効率化を実現します。

## 主な機能

### ✅ 実装済み機能

- **顧客・犬情報管理**
  - 飼い主・犬の基本情報管理
  - 健康情報・ワクチン管理（期限アラート機能付き）
  - 性格・特性情報の記録
  - 写真アップロード（Supabase Storage対応）

- **予約管理**
  - カレンダー形式での予約確認
  - 予約の作成・編集・キャンセル
  - チェックイン機能
  - Googleカレンダー連携（オプション）

- **日誌作成**
  - AIによるコメント自動生成（Google Gemini API）
  - 写真解析機能（活動内容・トレーニング項目の提案）
  - メモ書きからの清書機能
  - トレーニング記録（カスタマイズ可能な項目）
  - トイレ記録

- **LINEミニアプリ（飼い主向け）**
  - 予約・キャンセル
  - 登園前情報入力
  - 日誌閲覧
  - 回数券残高確認

- **SaaS決済機能**
  - PAY.JPによるサブスクリプション決済
  - プラン管理（フリー/スタンダード/プロ）
  - 請求履歴管理

- **通知機能**
  - LINE Messaging APIによる通知送信
  - 登園前リマインド
  - 日誌送信通知
  - ワクチン期限アラート

- **データエクスポート**
  - CSV/PDF形式でのエクスポート（日本語フォント対応）

- **ヘルプ・ガイド**
  - 機能別マニュアル
  - 初回利用時のオンボーディングガイド

## 技術スタック

### フロントエンド
- **React 18** + **TypeScript**
- **Vite** - ビルドツール
- **Tailwind CSS** - スタイリング
- **React Router** - ルーティング
- **Zustand** - 状態管理
- **LIFF (LINE Front-end Framework)** - LINEミニアプリ
- **jsPDF** + **@pdfme/common** - PDF生成（日本語対応）

### バックエンド
- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** (Supabase)
- **Supabase**
  - データベース
  - 認証（Supabase Auth）
  - ストレージ（ファイルアップロード）
- **JWT** - 認証トークン
- **PAY.JP** - 決済処理
- **Google Gemini API** - AI日誌生成・写真解析
- **LINE Messaging API** - 通知送信（マルチテナント対応）
- **Google Calendar API** - カレンダー連携
- **Nodemailer** - メール送信

### インフラ・デプロイ
- **Vercel** - ホスティング
- **Supabase** - データベース・ストレージ

## セットアップ

### 前提条件

- **Node.js 18以上**
- **Supabaseアカウント**（本番環境用）
- **PostgreSQL**（ローカル開発用、オプション）

### クイックスタート

#### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd pet-carte
```

#### 2. 依存関係のインストール

```bash
npm run install:all
```

#### 3. 環境変数の設定

詳細な環境変数の設定方法は、[環境変数設定ガイド](./docs/setup/ENV_SETUP.md)を参照してください。

**最小限の設定（ローカル開発）:**

`server/.env` ファイルを作成:

```bash
cp server/.env.example server/.env
```

最低限の設定:

```env
# データベース（ローカルPostgreSQL）
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pet_carte

# JWT認証
JWT_SECRET=your-local-development-secret-key

# サーバーポート
PORT=3001
```

**本番環境（Supabase使用）:**

Supabaseの設定方法は [Supabaseセットアップガイド](./docs/setup/SETUP_SUPABASE.md) を参照してください。

#### 4. データベースの初期化

**ローカル開発:**

```bash
# PostgreSQLデータベースを作成
createdb pet_carte

# サーバーを起動すると自動的にマイグレーションが実行されます
cd server
npm run dev
```

**Supabase使用:**

SupabaseダッシュボードからSQL Editorを開き、`server/src/db/migrations/` 配下のSQLファイルを順番に実行してください。

#### 5. シードデータの投入（オプション）

```bash
cd server
npm run db:seed
```

テストアカウントが作成されます:
- メールアドレス: `admin@example.com`
- パスワード: `password123`

#### 6. 開発サーバーの起動

```bash
npm run dev
```

- フロントエンド: http://localhost:5173
- バックエンドAPI: http://localhost:3001

## ドキュメント

### セットアップガイド
- [環境変数設定](./docs/setup/ENV_SETUP.md) - 全環境変数の詳細説明
- [Supabaseセットアップ](./docs/setup/SETUP_SUPABASE.md) - Supabaseの初期設定
- [Googleカレンダー連携](./docs/setup/GOOGLE_CALENDAR_SETUP.md) - GoogleカレンダーAPIの設定
- [LINEミニアプリ開発](./docs/setup/LIFF_DEVELOPMENT.md) - LIFFアプリの開発方法

### デプロイメント
- [Vercelデプロイメント](./docs/deployment/VERCEL_DEPLOYMENT.md) - Vercelへのデプロイ手順
- [Vercelドメイン設定](./docs/deployment/VERCEL_DOMAIN_SETUP.md) - カスタムドメインの設定

### トラブルシューティング
- [トラブルシューティング](./docs/troubleshooting/TROUBLESHOOTING.md) - よくある問題と解決方法
- [500エラーのデバッグ](./docs/troubleshooting/TROUBLESHOOTING_500_ERROR.md) - サーバーエラーの調査方法

### レファレンス
- [要件定義書](./.reference/犬の幼稚園_顧客管理システム_要件定義書.md) - システムの詳細要件
- [HTMLモック](./.reference/) - UIデザインの参考ファイル

## プロジェクト構造

```
pet-carte/
├── client/                    # フロントエンド
│   ├── src/
│   │   ├── pages/            # ページコンポーネント
│   │   ├── components/       # 共通コンポーネント
│   │   ├── liff/             # LINEミニアプリ
│   │   ├── store/            # 状態管理
│   │   └── utils/            # ユーティリティ
│   └── package.json
├── server/                    # バックエンド
│   ├── src/
│   │   ├── routes/           # APIルート
│   │   ├── services/         # ビジネスロジック
│   │   ├── db/               # データベース関連
│   │   │   ├── migrations/   # マイグレーション
│   │   │   └── seed*.sql     # シードデータ
│   │   └── middleware/       # ミドルウェア
│   └── package.json
├── docs/                      # ドキュメント
│   ├── setup/                # セットアップガイド
│   ├── deployment/            # デプロイメント
│   └── troubleshooting/      # トラブルシューティング
├── .reference/                # レファレンスファイル
│   ├── *.html                # HTMLモック
│   └── 要件定義書.md
├── .claude/                   # Claude設定
│   └── skills/               # スキル定義
└── package.json              # ルートパッケージ設定
```

## 主要なスクリプト

### ルートレベル

```bash
npm run dev              # フロントエンド・バックエンドを同時起動
npm run build            # 本番ビルド
npm run install:all      # 全パッケージの依存関係をインストール
```

### サーバー側

```bash
cd server
npm run dev              # 開発サーバー起動（tsx watch）
npm run build            # TypeScriptコンパイル
npm run db:seed          # シードデータ投入
npm run db:migrate       # マイグレーション実行
```

### クライアント側

```bash
cd client
npm run dev              # 開発サーバー起動
npm run build            # 本番ビルド
npm run preview          # ビルド結果のプレビュー
```

## 本番環境へのデプロイ

本番環境へのデプロイ手順は [Vercelデプロイメントガイド](./docs/deployment/VERCEL_DEPLOYMENT.md) を参照してください。

主な手順:
1. Supabaseプロジェクトの作成・設定
2. Vercelプロジェクトの作成
3. 環境変数の設定
4. デプロイ

## ライセンス

MIT

## サポート

問題が発生した場合は、[トラブルシューティングガイド](./docs/troubleshooting/TROUBLESHOOTING.md)を参照するか、GitHubのIssuesで報告してください。
