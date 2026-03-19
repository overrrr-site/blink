# Blink トライアルモード 実装プラン v2

## このドキュメントの目的

**解決したい問い：** ITリテラシーが低い犬の幼稚園・保育園の運営者が、本番LINE公式アカウントを接続せずにBlinkの全機能を体感し、導入を判断できる状態をつくる。

**読み手：** 開発者（Shota）。設計意図を理解し、実装に着手できるレベルの具体性で記述する。

**前版からの変更点：**
- 本契約移行時、顧客情報を含む全トライアルデータを削除（クリーンスタート）
- LINE設定は移行時に店舗が新規設定（引き継ぎなし）
- 「次にやること」を常に1つだけ提示するProgressive Disclosure型のガイド体験
- 店舗オーナー自身がテストユーザーとして体験する前提に簡素化
- マイグレーション番号を048〜に修正（最新マイグレーションは047）

---

## 1. 全体設計

### 1.1 設計思想：「一度に1つだけ」

子ども向けアプリ（Duolingoなど）のオンボーディングから着想を得た設計思想：

**Progressive Disclosure（段階的開示）：** 全機能を一気に見せず、「今やること」を常に1つだけ提示する。ステップを完了すると次のステップが解放される。ITリテラシーが低いユーザーは選択肢が多いと固まる。1つだけなら迷わない。

**Gradual Engagement（段階的参加）：** 登録時の入力項目を最小限にし、まず体験させる。詳細な設定は後から。Duolingoがアカウント作成前にレッスンを体験させるのと同じ発想。

**小さな達成感の積み重ね：** 各ステップ完了時に視覚的なフィードバック（チェックマーク、プログレスバーの進行、お祝い演出）を与える。「できた」の実感が次のステップへの動機になる。

### 1.2 トライアルモードの定義

| 項目 | トライアルモード | 本契約モード |
|------|-----------------|-------------|
| LINE公式アカウント | Blink社の共有アカウント | 店舗自身のアカウント |
| LINE Messaging API | Blink社のチャネル経由 | 店舗自身のチャネル |
| LIFF（飼い主向けMini App） | Blink社のLIFF ID | 店舗自身のLIFF ID |
| 全データ（顧客・予約・連絡帳等） | テスト用・移行対象外 | 本番データ |
| 決済（PAY.JP） | 無効（UIのみ表示） | 有効 |
| AI機能（Gemini） | 有効（回数制限あり） | 有効 |
| 利用期間 | 30日間（延長可） | 無制限 |
| 体験者 | 店舗オーナー・スタッフ自身 | 実際の飼い主 |

**ポイント：** トライアルでは店舗オーナーやスタッフ自身が「飼い主役」としてLINE友だち追加・予約・連絡帳の受け取りなどを体験する。実際の飼い主は本契約後から利用開始。

### 1.3 ユーザーフロー

```
[新規登録]（入力: メールアドレス + パスワード + 店舗名 + オーナー名。業態は任意）
  → トライアルモードで自動開始（既存の Supabase Auth + staff / stores 作成と同様）
  → Blink社LINE公式アカウントが自動紐付け（trial_line_config を参照）
  → ガイド画面が表示（Step 1のみ解放）

[ガイド体験]（Progressive Disclosure）
  → Step 1: ダッシュボードを見てみよう  ← 唯一表示
  → Step 2: 犬と飼い主を登録しよう     ← Step 1完了後に解放
  → Step 3: 予約を入れてみよう         ← Step 2完了後に解放
  → Step 4: 連絡帳を書いてみよう       ← Step 3完了後に解放
  → Step 5: LINEで通知を送ってみよう   ← Step 4完了後に解放
  → 全完了 → 🎉 お祝い演出 + 自由利用モードへ

[自由利用]
  → 全機能を自由に使える（ガイドなし）
  → 上部バナーに「本契約に切り替える →」を常時表示
  → 残り7日以下で赤色警告

[本契約移行]
  → Step 1: LINE公式アカウントの準備ガイド
  → Step 2: LINE設定の入力 + 接続テスト
  → Step 3: 「トライアルデータは全て削除されます」の確認
  → Step 4: 切り替え実行 → 全データ削除 + LINE設定更新
  → Step 5: 完了 + Webhook URL設定案内
```

---

## 2. DB設計

### 2.1 `stores` テーブルの変更

```sql
-- 048_add_trial_mode_to_stores.sql
-- 既存: stores には line_channel_id, line_channel_secret, line_channel_access_token が存在（010で追加、暗号化保存）

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_store_code VARCHAR(20) UNIQUE;

COMMENT ON COLUMN stores.is_trial IS 'トライアルモードかどうか';
COMMENT ON COLUMN stores.trial_started_at IS 'トライアル開始日時';
COMMENT ON COLUMN stores.trial_expires_at IS 'トライアル期限（デフォルト30日）';
COMMENT ON COLUMN stores.converted_at IS '本契約に切り替えた日時（NULLならまだ）';
COMMENT ON COLUMN stores.trial_store_code IS 'トライアル中の店舗識別コード（LINE友だち追加時の紐付けに使用）';
```

### 2.2 `trial_line_config` テーブル（新規）

Blink社のLINE設定を管理する。トライアル中の店舗はこの設定を参照する。

```sql
-- 049_create_trial_line_config.sql

CREATE TABLE IF NOT EXISTS trial_line_config (
  id SERIAL PRIMARY KEY,
  channel_id VARCHAR(255) NOT NULL,
  channel_secret VARCHAR(255) NOT NULL,
  channel_access_token TEXT NOT NULL,
  liff_id VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE trial_line_config IS 'Blink社のLINE公式アカウント設定（トライアル用共有）';
```

### 2.3 `trial_guide_progress` テーブル（新規）

ガイドの進捗管理。Progressive Disclosureの制御に使う。

```sql
-- 050_create_trial_guide_progress.sql

CREATE TABLE IF NOT EXISTS trial_guide_progress (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_key VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_trial_guide_store_id ON trial_guide_progress(store_id);

COMMENT ON TABLE trial_guide_progress IS 'トライアルガイドの進捗（Progressive Disclosure制御）';
COMMENT ON COLUMN trial_guide_progress.step_number IS 'ステップ順序（1〜5）';
COMMENT ON COLUMN trial_guide_progress.unlocked_at IS 'このステップが解放された日時（NULLなら未解放）';
COMMENT ON COLUMN trial_guide_progress.completed_at IS 'このステップが完了した日時（NULLなら未完了）';
```

ステップの定義：

| step_number | step_key | ステップ名 | 解放条件 |
|-------------|----------|-----------|---------|
| 1 | `view_dashboard` | ダッシュボードを見てみよう | 初期状態で解放 |
| 2 | `register_customer` | 犬と飼い主を登録しよう | Step 1完了後 |
| 3 | `create_reservation` | 予約を入れてみよう | Step 2完了後 |
| 4 | `write_journal` | 連絡帳を書いてみよう | Step 3完了後 |
| 5 | `send_line_notification` | LINEで通知を送ってみよう | Step 4完了後 |

### 2.4 本契約移行時のデータ操作

移行時は全トライアルデータを削除する。トランザクションで一括実行。外部キー制約の依存順序に従い、子テーブルから削除する。

```sql
-- 移行APIから呼び出すSQL（store_id = $1）
-- 本プロジェクトのスキーマ: owners（飼い主）, dogs（犬）, reservations, records（カルテ）, pre_visit_inputs, contracts, training_profile_* 等

BEGIN;

-- 1. 予約・カルテに依存する子テーブル
DELETE FROM pre_visit_inputs WHERE reservation_id IN (SELECT id FROM reservations WHERE store_id = $1);

-- 2. 犬に依存するテーブル（contracts, dog_health, dog_personality, training_profile_*）
DELETE FROM contracts WHERE dog_id IN (SELECT id FROM dogs WHERE owner_id IN (SELECT id FROM owners WHERE store_id = $1));
DELETE FROM dog_health WHERE dog_id IN (SELECT id FROM dogs WHERE owner_id IN (SELECT id FROM owners WHERE store_id = $1));
DELETE FROM dog_personality WHERE dog_id IN (SELECT id FROM dogs WHERE owner_id IN (SELECT id FROM owners WHERE store_id = $1));
DELETE FROM training_profile_grid_entries WHERE store_id = $1;
DELETE FROM training_profile_log_entries WHERE store_id = $1;
DELETE FROM training_profile_concerns WHERE store_id = $1;

-- 3. 予約・カルテ（records がメイン、journals は残存する場合は必要に応じて削除）
DELETE FROM records WHERE store_id = $1;
DELETE FROM reservations WHERE store_id = $1;
-- journals テーブルが存在する場合: DELETE FROM journals WHERE store_id = $1;

-- 4. 飼い主・犬（dogs → owners の順）
DELETE FROM dogs WHERE owner_id IN (SELECT id FROM owners WHERE store_id = $1);
DELETE FROM owners WHERE store_id = $1;

-- 5. LINE紐付けの解除（line_users テーブルは存在しない。owners.line_id は上記で owners 削除時に消える）
-- トライアル用の「店舗コード→LINE user」の紐付けを保持する別テーブルを導入している場合はここで削除する。

-- 6. ガイド進捗
DELETE FROM trial_guide_progress WHERE store_id = $1;

-- 7. 店舗のモード切り替え
UPDATE stores SET
  is_trial = false,
  converted_at = NOW(),
  trial_store_code = NULL
WHERE id = $1;

COMMIT;
```

---

## 3. API設計

**認証・権限:** 管理画面 API は既存の [server/src/middleware/auth.ts](server/src/middleware/auth.ts) を使用する。`authenticate` で Supabase JWT を検証し `req.userId`, `req.storeId`, `req.isOwner`, `req.staffData` を設定。課金・スタッフ管理などは `requireOwner` でオーナーのみ許可。トライアル用エンドポイント（guide 取得・ステップ完了・convert・extend）も `authenticate` の後に実行し、`req.storeId` で店舗を特定する。既存の `subscription_status === 'past_due'` 時の制限とトライアル制限が両方かかる場合は、トライアルを先に判定する。

### 3.1 新規エンドポイント

#### `POST /api/trial/start`

トライアル開始（新規登録と統合）。既存の `POST /api/auth/register`（[server/src/routes/auth.ts](server/src/routes/auth.ts)）のトライアル版として実装する。

```typescript
// リクエスト — 既存登録フローに合わせつつ最小限（Gradual Engagement）
{
  email: string;
  password: string;
  store_name: string;           // 店舗名
  owner_name: string;           // オーナー名（スタッフ名として staff に保存）
  business_types?: string[];    // 業態（例: ['daycare','grooming']）
  primary_business_type?: string;  // メイン業態（'daycare' | 'grooming' | 'hotel'）
}

// レスポンス
{
  success: true,
  data: {
    store: Store,               // is_trial: true
    token: string,              // Supabase 発行の access_token（既存 authenticate ミドルウェアで検証）
    trial_store_code: string,   // "STORE-A1B2"
    current_step: {             // 今やるべきステップ（常に1つ）
      step_number: 1,
      step_key: "view_dashboard",
      title: "ダッシュボードを見てみよう",
      description: "まずはBlinkの全体像を確認しましょう",
      action_url: "/dashboard"
    }
  }
}
```

処理内容：
1. 既存と同様に Supabase Auth `admin.createUser()` で auth ユーザー作成
2. トランザクションで: `stores` に INSERT（`name`, `business_types`, `primary_business_type`, **`is_trial = true`**, `trial_started_at`, `trial_expires_at`, `trial_store_code`）；`staff` に INSERT（`email`, `name`（owner_name）, `auth_user_id`, `is_owner = true`）；`staff_stores` に INSERT
3. `trial_store_code` を生成（`STORE-` + nanoid(4)）
4. `trial_guide_progress` に Step 1〜5 を作成（Step 1 のみ `unlocked_at = NOW()`）
5. レスポンスの `token` は Supabase が返す `access_token` をそのまま返す（既存の `authenticate` ミドルウェアで JWKS 検証）

#### `GET /api/trial/guide`

ガイド状態の取得。Progressive Disclosureの制御情報を返す。

```typescript
// レスポンス
{
  success: true,
  data: {
    is_trial: boolean,
    days_remaining: number,
    guide_completed: boolean,  // 全5ステップ完了したか
    steps: [
      {
        step_number: 1,
        step_key: "view_dashboard",
        title: "ダッシュボードを見てみよう",
        description: "まずはBlinkの全体像を確認しましょう",
        action_url: "/dashboard",
        unlocked: true,
        completed: true,
        completed_at: "2026-03-18T10:00:00Z"
      },
      {
        step_number: 2,
        step_key: "register_customer",
        title: "犬と飼い主を登録しよう",
        description: "あなた自身を飼い主として登録してみましょう。愛犬の情報も入力します",
        action_url: "/owners/new",
        unlocked: true,      // Step 1が完了しているので解放済み
        completed: false,
        completed_at: null
      },
      {
        step_number: 3,
        step_key: "create_reservation",
        title: "予約を入れてみよう",
        // ...
        unlocked: false,     // Step 2が未完了なのでロック中
        completed: false,
        completed_at: null
      }
      // ...
    ],
    current_step: {  // 今やるべきステップ（解放済み＆未完了の最初のもの）
      step_number: 2,
      step_key: "register_customer",
      title: "犬と飼い主を登録しよう",
      description: "あなた自身を飼い主として登録してみましょう。愛犬の情報も入力します",
      action_url: "/owners/new"
    }
  }
}
```

#### `POST /api/trial/guide/:stepKey/complete`

ガイドステップの完了。次のステップを自動解放する。

```typescript
// レスポンス
{
  success: true,
  data: {
    completed_step: {
      step_number: 2,
      step_key: "register_customer",
      completed_at: "2026-03-18T11:00:00Z"
    },
    next_step: {  // 次に解放されたステップ（nullなら全完了）
      step_number: 3,
      step_key: "create_reservation",
      title: "予約を入れてみよう",
      description: "登録した犬の予約を入れてみましょう",
      action_url: "/reservations/new"
    },
    all_completed: false,
    celebration: false  // trueなら全完了のお祝い演出を表示
  }
}
```

処理内容：
1. `trial_guide_progress` の該当ステップに `completed_at = NOW()` を設定
2. 次のステップ（step_number + 1）に `unlocked_at = NOW()` を設定
3. 全ステップ完了の場合は `celebration: true` を返す

#### `POST /api/trial/convert`

本契約への切り替え。

```typescript
// リクエスト
{
  line_channel_id: string,
  line_channel_secret: string,
  line_channel_access_token: string,
  liff_id: string,
  confirm_delete_all: boolean  // trueでないと拒否
}

// レスポンス
{
  success: true,
  data: {
    store: Store,  // is_trial: false, LINE設定更新済み
    deleted_counts: {
      owners: number,
      dogs: number,
      reservations: number,
      records: number,
      training_profile_entries: number
    }
  }
}
```

処理内容：
1. `confirm_delete_all === true` を検証
2. LINE設定のバリデーション（Channel IDの形式チェック）
3. 可能であればLINE APIへの接続テスト（Bot Info取得）
4. 2.4節のSQLをトランザクションで実行
5. 店舗のLINE設定を新しい値に更新
6. 削除件数をレスポンスで返す

#### `POST /api/trial/extend`

トライアル期間の延長。

```typescript
// リクエスト
{
  days: number  // 延長日数（デフォルト14日）
}
```

### 3.2 既存エンドポイントの変更

#### LINE設定取得の共通化

既存の [server/src/services/lineMessagingService.ts](server/src/services/lineMessagingService.ts) の `getStoreLineCredentials(storeId)` を拡張する。現在は `stores` から `line_channel_id`, `line_channel_secret`, `line_channel_access_token` を取得し、`utils/encryption.js` で復号している。

- **トライアル時:** `store.is_trial === true` なら `trial_line_config` から1件取得し、その値を返す（trial_line_config の credential は暗号化するか環境変数で管理するかは要検討）
- **本契約時:** 従来どおり `stores` のカラムを復号して返す

既存のLINE関連処理（`lineMessagingService` の `getStoreLineClient()`、[lineBotService.ts](server/src/services/lineBotService.ts) の Webhook 署名検証・メッセージ送信）は、いずれも「storeId から credential を取る」層を経由するようにする。その層で `is_trial` を判定し、トライアルなら `trial_line_config` を参照する。

#### 決済のトライアルブロック

認証は既存の `authenticate` ミドルウェア（[server/src/middleware/auth.ts](server/src/middleware/auth.ts)）で行い、`req.storeId`, `req.userId`, `req.isOwner` 等が設定された後にトライアル判定する。

- `req.store` は存在しないため、`req.storeId` で DB から店舗を取得し `is_trial` を確認する。
- 課金関連ルート（[server/src/routes/billing.ts](server/src/routes/billing.ts)）の「契約・支払い」を行うエンドポイントの手前に、トライアル時は決済不可レスポンスを返すミドルウェア（またはルート内分岐）を追加する。

```typescript
// server/src/middleware/trialGuard.ts（例）

export async function blockPaymentInTrial(req: Request, res: Response, next: NextFunction) {
  const store = await getStore(req.storeId);  // 既存の store 取得方法に合わせる
  if (store?.is_trial) {
    return res.status(200).json({
      success: true,
      data: {
        trial_mode: true,
        message: '決済機能は本契約後にご利用いただけます'
      }
    });
  }
  next();
}
```

`subscription_status === 'past_due'` 時の既存制限とトライアル制限が両方かかる場合は、トライアルを先に判定し、トライアルなら上記メッセージで返す。

---

## 4. フロントエンド実装計画

### 4.1 トライアル状態管理（Zustand）

既存の [client/src/store/authStore.ts](client/src/store/authStore.ts)（Supabase 認証・スタッフ情報）と [client/src/store/businessTypeStore.ts](client/src/store/businessTypeStore.ts)（業態選択）と併存させる。データ取得は SWR（例: `GET /api/trial/guide`）で行い、UI 状態（表示中のステップ・完了演出の表示有無など）を trialStore で持つ。

```typescript
// client/src/store/trialStore.ts

interface GuideStep {
  step_number: number;
  step_key: string;
  title: string;
  description: string;
  action_url: string;
  unlocked: boolean;
  completed: boolean;
  completed_at: string | null;
}

interface TrialState {
  isTrial: boolean;
  daysRemaining: number;
  guideCompleted: boolean;
  steps: GuideStep[];
  currentStep: GuideStep | null;

  // actions
  fetchGuide: () => Promise<void>;
  completeStep: (stepKey: string) => Promise<CompleteStepResponse>;
}
```

### 4.2 コンポーネント構成

```
client/src/components/trial/
├── TrialBanner.tsx              // 上部バナー（残日数＋本契約CTA）
├── TrialGuideOverlay.tsx        // ★ Progressive Disclosure のメインUI
├── TrialStepCard.tsx            // 個別ステップのカード（解放/ロック/完了の3状態）
├── TrialStepCelebration.tsx     // ステップ完了時のお祝いアニメーション
├── TrialAllCompleteCelebration.tsx  // 全ステップ完了時のお祝い
├── TrialConvertWizard.tsx       // 本契約切り替えウィザード
├── TrialPaymentBlocker.tsx      // 決済機能のブロック表示
└── TrialExpiredOverlay.tsx      // 期限切れ時のオーバーレイ
```

### 4.3 TrialGuideOverlay — Progressive Disclosure のメインUI

これがトライアル体験の中核コンポーネント。

**表示位置：** 画面右側にサイドパネルとして常時表示（幅280px）。モバイルではボトムシートとして表示。

**表示内容：**
```
┌─────────────────────────────┐
│  🐕 Blinkを体験しよう       │
│  ━━━━━━━━━━━░░░ 3/5        │  ← プログレスバー
│                             │
│  ✅ ダッシュボードを見た      │  ← 完了（グレーアウト）
│  ✅ 犬と飼い主を登録した      │  ← 完了（グレーアウト）
│  ✅ 予約を入れた             │  ← 完了（グレーアウト）
│                             │
│  ┌───────────────────────┐  │
│  │ 📝 連絡帳を書いてみよう  │  │  ← 現在のステップ（ハイライト）
│  │                       │  │
│  │ 今日の様子を連絡帳に    │  │
│  │ 書いてみましょう。      │  │
│  │ 飼い主さんに届きます。  │  │
│  │                       │  │
│  │ [連絡帳を書く →]       │  │  ← 該当ページへのリンク
│  └───────────────────────┘  │
│                             │
│  🔒 LINEで通知を送ろう      │  ← ロック（薄いグレー + 鍵アイコン）
│                             │
└─────────────────────────────┘
```

**3つの状態：**

| 状態 | 視覚表現 | インタラクション |
|------|---------|----------------|
| ロック（未解放） | 薄いグレー + 🔒 アイコン、タイトルのみ表示 | タップ不可 |
| 解放（現在のステップ） | オレンジ枠でハイライト、説明文＋CTAボタン表示 | CTAタップで該当ページへ遷移 |
| 完了 | ✅ + グレーアウト、タイトルのみ | タップで再訪問可（参考用） |

**ステップ完了時の演出：**
1. チェックマークがアニメーション付きで表示（0.5秒）
2. 完了ステップがグレーアウトにスライド
3. 次のステップがロック → 解放にアニメーション（鍵が外れる演出、0.8秒）
4. 次のステップの説明文＋CTAが展開

**全ステップ完了時：**
1. 🎉 紙吹雪アニメーション（3秒）
2. 「おめでとうございます！Blinkの基本操作をマスターしました」メッセージ
3. 「自由に試してみる」と「本契約に切り替える」の2つのCTA
4. 以降、TrialGuideOverlayは非表示になり、TrialBannerのみ表示

### 4.4 TrialBanner

```
┌──────────────────────────────────────────────────────┐
│ 🔶 トライアル中：残り23日   [本契約に切り替える →]     │
└──────────────────────────────────────────────────────┘
```

- 全ページ上部に固定（高さ48px）
- 残り7日以下で背景を赤に変更、テキストを「残りわずか！」に
- ガイド完了前は非表示（TrialGuideOverlayが優先）
- ガイド完了後に表示開始

### 4.5 自動完了トリガー

各ステップの完了は、ユーザーの操作を検知して自動でAPIを呼ぶ。手動で「完了」ボタンを押す必要はない。

```typescript
// client/src/hooks/useTrialStepCompletion.ts

export function useTrialStepCompletion(stepKey: string, condition: boolean) {
  const { isTrial, guideCompleted, currentStep, completeStep } = useTrialStore();
  const [celebrated, setCelebrated] = useState(false);

  useEffect(() => {
    // トライアルでない、ガイド完了済み、該当ステップでない場合はスキップ
    if (!isTrial || guideCompleted) return;
    if (currentStep?.step_key !== stepKey) return;
    if (celebrated) return;

    if (condition) {
      completeStep(stepKey).then((res) => {
        setCelebrated(true);
        // res.celebration === true なら全完了演出を表示
      });
    }
  }, [condition, isTrial, currentStep]);
}
```

各ページでの使用例（実際のパス・コンポーネント名に合わせる）：

```typescript
// ダッシュボードページ client/src/pages/Dashboard.tsx
function Dashboard() {
  useTrialStepCompletion('view_dashboard', true); // マウント時に即完了
  // ...
}

// 飼い主登録ページ client/src/pages/OwnerCreate.tsx（/owners/new）
function OwnerCreate() {
  const [saved, setSaved] = useState(false);
  useTrialStepCompletion('register_customer', saved);

  const handleSave = async () => {
    await saveOwner(data);  // 既存の飼い主登録API
    setSaved(true);  // これがトリガー
  };
  // ...
}

// 予約作成 /reservations/new → ReservationCreate
// カルテ（連絡帳） /records/new または /records/incomplete → RecordCreate, JournalNew
// LINE通知 設定画面または通知テスト → useTrialStepCompletion('send_line_notification', 送信完了)
```

### 4.6 TrialConvertWizard — 本契約切り替え

5ステップのウィザード。Progressive Disclosureと同じ「1つずつ」の体験。

**Step 1: 準備確認**
- 「LINE公式アカウントはお持ちですか？」→ Yes/No
- Noの場合: LINE公式アカウントの作成手順ガイド（外部リンク＋スクショ）
- Yesの場合: Messaging API の有効化確認

**Step 2: LINE設定の入力**
- Channel ID、Channel Secret、Channel Access Token、LIFF IDの入力フォーム
- 各フィールドに「どこで確認できるか」のヘルプリンク
- 入力例をプレースホルダーで表示
- 「接続テスト」ボタン → LINE Bot Info APIで確認 → 成功/失敗を表示

**Step 3: データ削除の確認**
```
┌───────────────────────────────────────────┐
│ ⚠️ トライアルデータの削除                   │
│                                           │
│ 本契約に切り替えると、トライアル中に         │
│ 登録した以下のデータがすべて削除されます。    │
│                                           │
│   • 飼い主: 3名                            │
│   • 犬: 5頭                                │
│   • 予約: 12件                             │
│   • 連絡帳: 8件                            │
│   • トレーニング記録: 4件                   │
│                                           │
│ 本契約後は、実際の飼い主さんの情報を         │
│ 改めて登録していただきます。                 │
│                                           │
│ ☐ 上記を確認し、データ削除に同意します       │
│                                           │
│              [次へ →]                      │
└───────────────────────────────────────────┘
```

**Step 4: 切り替え実行**
- 「切り替える」ボタン → ローディング表示 → 完了

**Step 5: 完了 + 次のアクション**
- 「🎉 本契約への切り替えが完了しました」
- Webhook URLの設定案内（LINE Developers Consoleで必要）
- 「ダッシュボードへ」ボタン

### 4.7 既存オンボーディングとの統合

本プロジェクトには既にオンボーディングが存在する。

- **店舗側:** `stores.onboarding_completed`（業態選択など）
- **スタッフ側:** `staff.onboarding_state`（JSONB）。[SetupWizard](client/src/components/onboarding/SetupWizard.tsx) で LINE 連携・Googleカレンダー連携のセットアップを案内する。API は `GET/PATCH /api/staff/me/onboarding`、`POST /api/staff/me/onboarding/hint-complete`。

**トライアルガイドとの役割分担:**

| 対象 | トライアルガイド（本プラン） | 既存オンボーディング（SetupWizard） |
|------|------------------------------|-------------------------------------|
| 目的 | 機能体験の Progressive Disclosure（ダッシュボード→飼い主登録→予約→カルテ→LINE通知） | LINE / Gcal の「本番用」設定手順 |
| 表示タイミング | トライアル中、常時（ガイド完了まで） | 初回ログイン時など、onboarding_state に応じて |

**統合方針:**

- トライアル中は、既存オンボーディングの **LINE セットアップはスキップ**する（トライアルでは Blink 社の共有 LINE を使うため、店舗自身の LINE 設定は不要）。SetupWizard を開く場合は「LINE連携」を `skipped` 扱いにするか、トライアル時は LINE ステップを表示しない。
- 本契約移行後は、TrialConvertWizard で LINE 設定を入力するため、移行完了後に改めて SetupWizard の LINE ステップを表示する必要はない（任意で「Webhook URL の設定」案内のみ残す）。
- ガイド完了前は TrialGuideOverlay を優先表示し、既存の WelcomeModal / SetupWizard との表示順・重複を避ける（例: トライアルかつガイド未完了のときは SetupWizard を出さない、または「まずガイドを完了してください」に誘導）。

---

## 5. LINE連携のトライアル設計

### 5.1 アーキテクチャ

Blink社のLINE公式アカウント1つを、複数のトライアル店舗で共有する。

```
[LINEユーザー（=店舗オーナー自身）]
  ↓ 友だち追加
[Blink社 LINE公式アカウント]
  ↓ Webhook
[/api/line/webhook/trial]
  ↓ 店舗コードで振り分け
[該当店舗の処理ロジック]
```

### 5.2 友だち追加フロー

店舗オーナーが自分自身を「飼い主」として体験するフロー。本プロジェクトでは LINE ユーザーと飼い主の紐付けは **`owners.line_id`** で管理する（`line_users` テーブルは存在しない）。トライアル用の「店舗コード→LINE user ID」の一時紐付けには、既存の `line_link_codes`（電話番号＋確認コード用）とは別の仕組み、または「トライアル用 owners 1件を店舗に作成し、その owners.line_id を店舗コード入力時に更新する」方式を検討する。

```
1. 管理画面のガイド Step 5 で「LINEで通知を送ってみよう」に到達
2. 画面に「Blink体験用LINEアカウントを友だち追加してください」と表示
   - 友だち追加URL: https://line.me/R/ti/p/@blink-trial
3. 店舗オーナーがスマホでLINE友だち追加
4. 自動メッセージ: 「Blink体験へようこそ！店舗コードを入力してください」
5. オーナーが管理画面に表示されている店舗コード（例: STORE-A1B2）を入力
6. 紐付け: 該当店舗の「体験用飼い主」の owners レコードの line_id を更新（またはトライアル用の紐付けテーブルに store_id + line_user_id を保存）
7. 紐付け完了メッセージ: 「◯◯（店舗名）に接続しました！」
8. 管理画面から通知を送信 → 自分のLINEに届く → Step 5完了
```

### 5.3 Webhook処理

トライアル用 Webhook は別エンドポイント（例: `/api/line/webhook/trial`）とし、Blink社のチャネル用の署名検証には **trial_line_config** の `channel_secret` を使用する（本契約用の [lineBotService.ts](server/src/services/lineBotService.ts) は `stores` の暗号化済み `line_channel_secret` を復号して署名検証している。トライアル用も同様に credential を取得して検証する）。

- **紐付け:** 本プロジェクトでは `line_users` テーブルは存在しない。トライアル時は「店舗コードを入力した LINE user ID」をその店舗の「体験用飼い主」と紐付ける必要がある。実装方針の例:
  - 店舗に「トライアル用 owners」を1件作成しておき、店舗コード入力時にその `owners.line_id` を更新する。
  - または `trial_line_links` のようなテーブル（store_id, line_user_id）を用意し、メッセージ送信時に「この line_user_id は store_id の体験用」と参照する。
- メッセージ送信は既存の lineMessagingService を、トライアル時は trial_line_config の credential（必要なら復号）で行う。

```typescript
// server/src/routes/lineWebhookTrial.ts（方針例）

router.post('/api/line/webhook/trial', async (req, res) => {
  const events = req.body.events;
  const signature = req.headers['x-line-signature'];
  // trial_line_config の channel_secret で署名検証（既存 lineBotService と同様の手順）

  for (const event of events) {
    const lineUserId = event.source.userId;

    if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text.trim().toUpperCase();

      if (text.startsWith('STORE-')) {
        const store = await db.query(
          'SELECT * FROM stores WHERE trial_store_code = $1 AND is_trial = true',
          [text]
        );

        if (store) {
          // 紐付け: 該当店舗の「体験用飼い主」の owners.line_id を更新する、または trial_line_links に INSERT
          // 例: UPDATE owners SET line_id = $2 WHERE store_id = $1 AND id = (店舗の体験用owner id)
          // または: INSERT INTO trial_line_links (store_id, line_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
          await linkTrialLineUser(store.id, lineUserId);

          await sendLineMessage(lineUserId, {
            type: 'text',
            text: `${store.name}に接続しました！管理画面から通知テストを送ってみてください。`
          });
        } else {
          await sendLineMessage(lineUserId, {
            type: 'text',
            text: '店舗コードが見つかりません。管理画面に表示されているコードを確認してください。'
          });
        }
        continue;
      }
    }

    // 店舗コード以外 → 紐付け済み店舗にルーティング（owners.line_id = lineUserId の store_id または trial_line_links で検索）
    const storeId = await getStoreIdByTrialLineUser(lineUserId);
    if (storeId) {
      await handleWebhookEvent(event, storeId);
    } else {
      await sendLineMessage(lineUserId, {
        type: 'text',
        text: '管理画面に表示されている店舗コード（例: STORE-A1B2）を入力してください。'
      });
    }
  }

  res.status(200).end();
});
```

### 5.4 トライアルでのLINEメッセージ送信

既存の [lineMessagingService.ts](server/src/services/lineMessagingService.ts) の「storeId から credential 取得」を、トライアル時は `trial_line_config` を参照するよう拡張する（3.2節）。`channel_secret` と `channel_access_token` は本契約と同様、必要に応じて暗号化して扱う。

トライアル中は Blink社のアクセストークンで送信されるため、メッセージの送信元が「Blink体験用」アカウントになる。店舗オーナーの自分のLINEにメッセージが届くので、「こういう風に飼い主さんに届くんだ」と体感できる。

---

## 6. トライアル→本契約 移行フロー詳細

### 6.1 移行の全体像

```
[本契約に切り替える] ボタン
  → TrialConvertWizard 起動（4.6節参照）
  → LINE設定入力 + 接続テスト
  → 全データ削除の確認
  → POST /api/trial/convert 実行
    1. 全トライアルデータ削除（トランザクション）
    2. 店舗のLINE設定を更新
    3. is_trial = false に更新
  → Webhook URL設定案内を表示
  → ダッシュボードへ（クリーンな状態）
```

### 6.2 移行後の状態

- stores テーブル: `is_trial = false`, LINE設定は店舗自身のもの（暗号化して保存）
- 飼い主（owners）・犬・予約・カルテ（records）・トレーニングプロフィール: 全て空
- TrialGuideOverlay: 非表示
- TrialBanner: 非表示
- 決済機能: 有効（既存の `billing.ts` と `subscription_status` に従う。past_due 時は既存どおり一部制限）
- LINE Webhook: 店舗自身の Webhook URL に切り替わる（店舗が LINE Developers Console で設定）

### 6.3 移行が必要な理由の提示

ユーザーが「なぜ移行が必要なのか」を理解できるよう、TrialConvertWizardの冒頭で説明する。

```
「トライアルではBlink社のLINE公式アカウントを使って体験いただきました。
 本契約では、お店専用のLINE公式アカウントに切り替えることで、
 飼い主さんに直接お店の名前でメッセージを届けられるようになります。」
```

---

## 7. 実装フェーズ

### Phase 1: 基盤 + 登録（目安: 1週間）

**ゴール：** トライアルモードで新規登録でき、ダッシュボードにアクセスできる。

- [ ] DBマイグレーション（048〜050）
- [ ] `POST /api/trial/start` API
- [ ] `GET /api/trial/guide` API
- [ ] `getLineConfig()` 共通関数
- [ ] `trialStore.ts` Zustandストア
- [ ] 既存LINE関連ルートを `getLineConfig()` に置き換え
- [ ] `TrialGuideOverlay.tsx`（Step 1のみ動作する最小版）
- [ ] `TrialStepCard.tsx`（3状態の表示）

### Phase 2: ガイド体験（目安: 1〜2週間）

**ゴール：** 5ステップのProgressive Disclosureガイドが完全に動作する。

- [ ] `POST /api/trial/guide/:stepKey/complete` API
- [ ] `useTrialStepCompletion` フック
- [ ] 各ページへの完了トリガー埋め込み（5箇所）
- [ ] `TrialStepCelebration.tsx`（ステップ完了演出）
- [ ] `TrialAllCompleteCelebration.tsx`（全完了演出）
- [ ] `TrialPaymentBlocker.tsx`
- [ ] トライアル用Webhookエンドポイント（`/api/line/webhook/trial`）
- [ ] 店舗コードによるLINE友だち紐付けフロー

### Phase 3: 本契約移行（目安: 1週間）

**ゴール：** トライアルから本契約へクリーンに移行できる。

- [ ] `POST /api/trial/convert` API（トランザクション + 全データ削除）
- [ ] `TrialConvertWizard.tsx`（5ステップウィザード）
- [ ] LINE接続テスト機能（Bot Info API呼び出し）
- [ ] `TrialBanner.tsx`（ガイド完了後の常時表示バナー）
- [ ] `POST /api/trial/extend` API
- [ ] `TrialExpiredOverlay.tsx`（期限切れ時）

### Phase 4: 改善・安定化（目安: 1週間）

**ゴール：** エッジケース対応とUX磨き込み。

- [ ] 期限切れ時の挙動（読み取り専用モード or 延長案内）
- [ ] ガイドのステップ説明文チューニング（実際に使ってみて調整）
- [ ] お祝い演出のアニメーション調整
- [ ] Blink社LINEアカウントのメッセージ数モニタリング
- [ ] 管理者向けトライアル店舗一覧ダッシュボード
- [ ] Sentryでのトライアル関連エラー監視

---

## 8. 要検討事項

### 8.1 Blink社LINEアカウントのメッセージ枠

LINE公式アカウントのプランによって月間無料メッセージ数が異なる。トライアル店舗数の増加に伴い、以下を確認・検討する必要がある。

- 現在のBlink社LINEアカウントのプランと無料メッセージ枠
- トライアル中の1店舗あたりの想定メッセージ数（10〜30通程度？）
- 上限到達時の対策（プラン変更 or メッセージ制限）

### 8.2 トライアル期限切れの扱い

30日経過後の挙動を決める必要がある。

- **案A:** 読み取り専用モード（データ閲覧のみ可、操作不可）
- **案B:** 管理画面にオーバーレイを表示し「延長 or 本契約」の二択
- **案C:** 自動延長（一定回数まで）

### 8.3 既存ベータユーザーの扱い

既にベータテスト中の店舗を、トライアルモードに移行するか、本契約として扱うか。

### 8.4 ガイドステップの順序の妥当性

現在のステップ順（ダッシュボード → 顧客登録 → 予約 → 連絡帳 → LINE通知）が実際の業務フローに合っているか、ベータテスターにヒアリングして調整する余地がある。

---

## 9. ファイル変更一覧

| カテゴリ | ファイル | 変更内容 |
|---------|---------|---------|
| DB | `server/src/db/migrations/048_*.sql` | stores カラム追加（is_trial, trial_*） |
| DB | `server/src/db/migrations/049_*.sql` | trial_line_config 作成 |
| DB | `server/src/db/migrations/050_*.sql` | trial_guide_progress 作成 |
| API（新規） | `server/src/routes/trial.ts` | start / guide / complete / convert / extend |
| API（新規） | `server/src/routes/lineWebhookTrial.ts` | トライアル用 Webhook |
| API（変更） | `server/src/routes/lineWebhook.ts` 等 | LINE 処理でトライアル時 credential 取得に対応 |
| サービス（変更） | `server/src/services/lineMessagingService.ts` | トライアル時は trial_line_config を参照 |
| サービス（変更） | `server/src/services/lineBotService.ts` | 本契約用のまま；トライアルは lineWebhookTrial で処理 |
| API（変更） | `server/src/routes/billing.ts` | トライアル時は決済不可レスポンス（trialGuard 連携） |
| ミドルウェア | `server/src/middleware/trialGuard.ts` | トライアル判定（req.storeId で store 取得） |
| フロント（新規） | `client/src/store/trialStore.ts` | トライアル・ガイド状態管理 |
| フロント（新規） | `client/src/components/trial/*.tsx` | TrialBanner, TrialGuideOverlay 等 8 コンポーネント |
| フロント（新規） | `client/src/hooks/useTrialStepCompletion.ts` | ガイド完了トリガー用フック |
| フロント（変更） | `client/src/pages/Dashboard.tsx` 等 | ガイド完了トリガー埋め込み（/owners/new, /reservations/new, /records/* 等） |
| フロント（変更） | `client/src/components/onboarding/SetupWizard.tsx` | トライアル時は LINE セットアップをスキップ（4.7節参照） |
| 型定義（新規） | `client/src/types/trial.ts` | トライアル・ガイド関連型 |
