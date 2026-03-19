# Blink - 犬の幼稚園・保育園 予約管理システム

## コミュニケーション
- 全て日本語で回答
- 技術用語は簡潔に、必要に応じて補足

## テクスタック

### フロントエンド (client/)
- React 18 + TypeScript + Vite
- Tailwind CSS 3（カスタムデザイントークン、shadcn/MUI不使用）
- Zustand (状態管理) + SWR (データ取得)
- React Router DOM 6
- @line/liff (LINE Mini App)
- Sentry (エラー監視)

### バックエンド (server/)
- Express.js + TypeScript
- PostgreSQL (Supabase)
- JWT認証 (Jose)
- LINE Bot SDK + Messaging API
- PAY.JP (決済)
- Resend / Nodemailer (メール)
- Google Gemini API (AI機能)

### インフラ
- Vercel (ホスティング + Serverless)
- Supabase (DB + Auth + Storage)
- GitHub (main ブランチ → Vercel自動デプロイ)

## ディレクトリ構造
```
pet-carte/
├── client/src/
│   ├── pages/          # 39ページコンポーネント（管理者向け）
│   ├── components/     # 機能別コンポーネント
│   │   ├── dashboard/  # ダッシュボード
│   │   ├── dogs/       # 犬プロフィール
│   │   ├── journals/   # 連絡帳
│   │   ├── onboarding/ # 初期セットアップウィザード
│   │   ├── reservations/  # 予約
│   │   └── training/   # トレーニング
│   ├── liff/           # LINE Mini App (飼い主向け)
│   │   ├── pages/      # 15ページコンポーネント
│   │   ├── components/ # LIFF専用コンポーネント
│   │   ├── store/      # LIFF専用Zustandストア
│   │   └── api/        # LIFF専用APIクライアント
│   ├── hooks/          # 14カスタムフック
│   ├── store/          # Zustand ストア（管理者向け）
│   ├── types/          # TypeScript型定義
│   └── utils/          # ユーティリティ (styles.ts にCSS定数)
├── server/src/
│   ├── routes/         # 44 APIルートファイル
│   │   └── liff/       # LIFF専用APIルート (auth, reservations等 11ファイル)
│   ├── db/
│   │   ├── migrations/ # 連番SQL (001_xxx.sql〜047_xxx.sql)
│   │   └── seed_*.ts   # シードデータ
│   ├── middleware/     # 認証ミドルウェア
│   └── services/       # メール送信等のサービス層
├── docs/               # セットアップ・デプロイ・トラブルシューティング文書
```

## アーキテクチャ
- **管理者画面** (`/`): 店舗スタッフ向け。Supabase Auth (email+password) で認証
- **飼い主画面** (`/liff`): LINE Mini App。LINE ID + 電話番号でアカウント紐付け
- 両画面は同一リポジトリ内だが、エントリーポイント・認証・ストアが完全に分離
- LIFF認証フロー: LINE Login → 電話番号入力 → メールに確認コード → LINE ID紐付け

## DB命名規約
- テーブル: snake_case 複数形 (例: `training_item_masters`)
- カラム: snake_case (例: `store_id`, `created_at`)
- 主キー: `id` (serial)
- 外部キー: `{table}_id`
- タイムスタンプ: `created_at`, `updated_at`
- 制約: `owners` テーブルは `(store_id, phone)` の複合一意制約、`line_id` は部分一意インデックス

## マイグレーション
- ファイル: `server/src/db/migrations/{NNN}_{description}.sql`
- 最新: 047番台
- `IF NOT EXISTS` を必ず使用
- Supabase SQL Editorで手動実行が必要な場合あり

## APIルート規約
- パス: `/api/{resource}` (RESTful)
- LIFF用: `/api/liff/{resource}`
- レスポンス: `{ success: boolean, data?: any, error?: string }`
- 認証: JWT Bearer トークン（管理者30日、飼い主30日）
- エラーハンドリング: try-catch統一、`sendBadRequest`/`sendNotFound`/`sendServerError` ユーティリティ使用

## 共通コンポーネント・ユーティリティ
- `ConfirmDialog` + `useConfirmDialog`: Promise-based確認ダイアログ
- `Toast` + `useToast`: アプリ全体のトースト通知
- `LoadingSpinner`: ローディング表示
- `SaveButton`: 保存ボタン（saving状態管理付き）
- `PageHeader`: 戻るボタン付きページヘッダー
- CSS定数: `client/src/utils/styles.ts` (INPUT_CLASS, BTN_PRIMARY/SECONDARY/TERTIARY, TOUCH_TARGET, ICON_BUTTON)

## デザイントークン
- ブランドカラー: primary=#EA580C（オレンジ）、background=#FAFAF9
- 業種別カラー: Daycare=#F97316, Grooming=#8B5CF6, Hotel=#06B6D4
- タップターゲット: 最小48x48px
- スペーシング: 8pxグリッド
- フォント: Noto Sans JP、font-bold(700) と font-medium(500) のみ使用
- 角丸: DEFAULT=0.5rem, lg=0.75rem, xl=1rem, 2xl=1.25rem

## デプロイ
```bash
git add <files>
git commit -m "feat: 変更内容"
git push origin main
# → Vercel自動デプロイ
```

## 注意事項
- LIFFページ (飼い主向け) と管理画面 (店舗向け) は同一リポジトリだがエントリーポイントは分離
- LIFFページは `../../components/` から共通コンポーネントをインポート（2階層上）
- 管理者ページは `../components/` からインポート（1階層上）
- `@media print` スタイル（index.css）は意図的に raw `gray-*` カラーを使用
- Supabase SQL Editorでマイグレーション実行が必要な場合あり
- LINE Webhook URL は Vercel の本番URLに設定済み
- SWRキャッシュ: データ更新後は `mutate()` でキャッシュを無効化すること
