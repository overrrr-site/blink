# Blink — 犬の幼稚園・保育園 予約管理SaaS

モノレポ：`client/`（React＋Vite＋Tailwind）、`server/`（Express＋Supabase の PostgreSQL）。Vercel で動かす。
セットアップ・デプロイ・障害対応の手順は `docs/`。

## 画面と認証（2系統が完全に分かれている）
- **管理画面**（`/`）：店舗スタッフ向け。Supabase Auth（メール＋パスワード）
- **飼い主画面**（`/liff`）：LINE の中で動く画面（LIFF）。LINE Login → 電話番号入力 → メールの確認コード → LINE ID を紐付け
- 入口・認証・ストアは別々。共通部品は `client/src/components/` から import する
- **トライアルモード**：店舗登録後の無料期間。ガイド付きのオンボーディングがある

## DB とマイグレーション
- 命名：テーブルは snake_case の複数形、カラムは snake_case、主キー `id`（serial）、外部キー `{table}_id`、`created_at`／`updated_at`
- `owners` は `(store_id, phone)` の複合一意。`line_id` は部分一意インデックス
- マイグレーションは `server/src/db/migrations/{NNN}_{内容}.sql` の連番。必ず `IF NOT EXISTS` を使う
- Supabase の SQL Editor で手動実行が必要な場合がある。必要なときはユーザーに伝える

## API の決まり
- パスは `/api/{resource}`（REST）、LIFF 用は `/api/liff/{resource}`
- レスポンスは `{ success: boolean, data?: any, error?: string }`
- 認証は JWT Bearer（管理者・飼い主とも30日）
- エラーは try-catch でそろえ、`server/src/utils/response.ts` の `sendBadRequest`／`sendNotFound`／`sendServerError` を使う

## 既にある部品を使う
- 画面部品：`ConfirmDialog`＋`useConfirmDialog`（Promise で待てる確認ダイアログ）、`Toast`＋`useToast`、`LoadingSpinner`、`SaveButton`、`PageHeader`、`ErrorBoundary`、`EmptyState`
- クラス定数：`client/src/utils/styles.ts`（`INPUT_CLASS`、`BTN_PRIMARY` など、`TOUCH_TARGET`、`ICON_BUTTON`、`AI_COLOR`）
- 業種ごとの色・ラベル・状態・権限：`client/src/domain/businessTypeConfig.ts` で一元管理
- APIクライアント：管理画面は `client/src/api/createApiClient.ts`、LIFF は `client/src/liff/api/client.ts`。axios を直接呼ばない

## デザインの決まり
- 色・角丸などの値は `client/tailwind.config.js` が正（shadcn・MUI は使わない）。業種別の色と AI 機能の色（Indigo）は使い分ける
- タップ領域は最小 48×48px、余白は 8px の倍数
- フォントは Noto Sans JP。太さは `font-bold`（700）と `font-medium`（500）だけ

## 注意
- SWR：データを更新したら `mutate()` でキャッシュを無効にする
- 印刷用の `@media print`（`client/src/index.css`）は、わざと素の `gray-*` を使っている。デザイントークンに置き換えない
- LINE の Webhook URL は Vercel の本番URLに設定済み
