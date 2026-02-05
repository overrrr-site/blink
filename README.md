# Blink - ペットサロン向け顧客管理システム

## 概要

ペットサロン向けのシンプルで使いやすい顧客管理システムです。**幼稚園・トリミング・ホテル**の3業種に対応し、飼い主と店舗の情報連携、AIを活用した日誌作成の効率化を実現します。

## 主な機能

- **業種切り替え** — 幼稚園/トリミング/ホテルの業種別UI・ワークフロー、業種ごとのステータス管理
- **ランディングページ** — CSS Scroll Snapによるスクロール型ティザーLP、スマホ最適化対応、認証済みユーザーは自動でダッシュボードへリダイレクト
- **顧客・ワンちゃん情報管理** — 飼い主・ワンちゃんの基本情報、健康情報・ワクチン管理（期限アラート付き）、性格・特性記録、写真アップロード
- **予約管理** — カレンダー形式での予約確認・作成・編集・キャンセル、チェックイン、Googleカレンダー連携
- **日誌・カルテ作成** — AIコメント自動生成（Google Gemini API）、写真解析、メモからの清書、トレーニング・トイレ記録
- **AIサジェスション** — 性格・特性に基づいた記録提案、写真解析機能、店舗別学習データ蓄積
- **LINEミニアプリ（飼い主向け）** — 予約・キャンセル、登園前情報入力、日誌閲覧、回数券残高確認
- **SaaS決済** — PAY.JPによるサブスクリプション決済、プラン管理（フリー/スタンダード/プロ）
- **通知** — LINE Messaging APIによるリマインド・日誌送信・ワクチンアラート
- **データエクスポート** — CSV/PDF形式（日本語フォント対応）

### 業種別ワークフロー

| 業種 | ステータス遷移 | 記録名称 |
|-----|--------------|---------|
| 幼稚園 | 登園前 → 登園中 → 降園済 | 連絡帳 |
| トリミング | 来店前 → 完了 | カルテ |
| ホテル | チェックイン前 → お預かり中 → チェックアウト済 | カルテ |

## 技術スタック

### フロントエンド
- React 18 + TypeScript + Vite
- Tailwind CSS
- React Router, Zustand（状態管理）, SWR（データフェッチ）
- LIFF (LINE Front-end Framework)
- jsPDF（PDF生成）

### バックエンド
- Node.js + Express + TypeScript
- PostgreSQL（Supabase）+ pg
- Supabase Auth・Storage
- JWT認証, Zod（バリデーション）
- Google Gemini API, LINE Messaging API, Google Calendar API
- PAY.JP, Resend/Nodemailer

### インフラ
- Vercel（ホスティング + Serverless Functions）
- Supabase（データベース・ストレージ）

## セットアップ

### 前提条件

- Node.js 18以上
- Supabaseアカウント（本番環境用）
- PostgreSQL（ローカル開発用、オプション）

### クイックスタート

```bash
# 1. クローン
git clone <repository-url>
cd pet-carte

# 2. 依存関係インストール
npm run install:all

# 3. 環境変数設定
cp server/.env.example server/.env
# server/.env を編集（DATABASE_URL, JWT_SECRET, PORT）

# 4. 開発サーバー起動（自動マイグレーション付き）
npm run dev
```

- フロントエンド: http://localhost:5173
- バックエンドAPI: http://localhost:3001

### シードデータ（オプション）

```bash
cd server && npm run db:seed
```

テストアカウント: `admin@example.com` / `password123`

## プロジェクト構造

```
pet-carte/
├── client/                    # フロントエンド
│   ├── src/
│   │   ├── pages/            # ページコンポーネント
│   │   │   └── settings/     # 設定サブページ
│   │   ├── components/       # 共通コンポーネント
│   │   │   ├── dogs/         # ワンちゃん関連
│   │   │   ├── journals/     # 日誌関連
│   │   │   └── reservations/ # 予約関連
│   │   ├── hooks/            # カスタムフック
│   │   ├── lib/              # SWR設定等
│   │   ├── liff/             # LINEミニアプリ
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── store/
│   │   ├── store/            # Zustand状態管理
│   │   ├── icons/            # バンドル埋め込みアイコン
│   │   └── utils/
│   └── package.json
├── server/                    # バックエンド
│   ├── src/
│   │   ├── routes/           # APIルート
│   │   ├── services/         # ビジネスロジック
│   │   ├── db/               # マイグレーション・シード
│   │   ├── middleware/       # 認証等
│   │   └── utils/
│   └── package.json
├── blink_renewal/             # 開発計画・仕様書
├── docs/                      # ドキュメント
│   ├── setup/                # セットアップガイド
│   ├── deployment/           # デプロイメント
│   ├── troubleshooting/      # トラブルシューティング
│   └── security/             # セキュリティ
├── .reference/                # 要件定義書・HTMLモック
└── vercel.json               # Vercelデプロイ設定
```

## スクリプト

```bash
# ルート
npm run dev              # フロント+バックエンド同時起動
npm run build            # 本番ビルド
npm run install:all      # 全パッケージインストール

# サーバー (cd server)
npm run dev              # 開発サーバー（tsx watch）
npm run build            # TypeScriptコンパイル
npm run db:seed          # シードデータ投入
npm run db:migrate       # マイグレーション実行

# クライアント (cd client)
npm run dev              # 開発サーバー
npm run build            # 本番ビルド
```

## ドキュメント

- [環境変数設定](./docs/setup/ENV_SETUP.md)
- [Supabaseセットアップ](./docs/setup/SETUP_SUPABASE.md)
- [Googleカレンダー連携](./docs/setup/GOOGLE_CALENDAR_SETUP.md)
- [LINEミニアプリ開発](./docs/setup/LIFF_DEVELOPMENT.md)
- [Vercelデプロイメント](./docs/deployment/VERCEL_DEPLOYMENT.md)
- [トラブルシューティング](./docs/troubleshooting/TROUBLESHOOTING.md)
- [要件定義書](./.reference/犬の幼稚園_顧客管理システム_要件定義書.md)

## ライセンス

MIT
