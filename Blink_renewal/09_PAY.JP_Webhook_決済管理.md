# PAY.JP Webhook & SaaS課金管理

## 概要
PAY.JPはBlink SaaSの月額利用料金の決済基盤。
お金の流れは **利用店舗 → 当社（サービサー）** であり、エンドユーザー（飼い主）には関係しない。
PAY.JPからのWebhookを受信し、決済失敗・サブスクリプション更新・キャンセルなどのイベントを処理する。
決済失敗時に店舗の管理者（is_owner=true のスタッフ）へメール通知し、カード更新手段を提供する。

---

## 現状分析

### 既存実装（`server/src/routes/billing.ts`）
- `POST /subscribe` - PAY.JPサブスクリプション作成 ✅
- `POST /cancel` - サブスクリプションキャンセル ✅
- `POST /update-card` - カード情報更新 ✅（新規追加済み）
- `GET /plans` - プラン一覧取得 ✅
- `GET /current` - 現在のプラン情報 ✅
- `GET /history` - 請求履歴取得 ✅
- `GET /payjp-key` - 公開キー取得 ✅

### 既存実装（`server/src/index.ts`）
- Webhook用 raw body parser 登録済み ✅
- `billingWebhookRoutes` のインポート・マウント済み ✅

### 課題
- **Webhookハンドラー本体（`billingWebhook.ts`）が未実装** - ルートは登録済みだがファイルが存在しない
- 決済失敗時にシステム側で検知する手段がない
- `stores.subscription_status` の自動更新がされない（手動操作のみ）
- `billing_history` テーブルに失敗レコードが記録されない
- 店舗管理者への決済失敗通知がない（※LINE通知ではなくメール通知が適切。管理者はLIFFユーザーではない）

---

## 実装内容

### 1. Webhookハンドラー（新規: `server/src/routes/billingWebhook.ts`）

※ `server/src/index.ts` での登録は完了済み:
```typescript
// 既に追加済み
app.use('/api/billing/webhook', express.text({ type: '*/*' }));
app.use('/api/billing/webhook', billingWebhookRoutes);
```

```typescript
import express from 'express';
import pool from '../db/connection.js';

const router = express.Router();

// PAY.JP Webhook受信
// 認証不要（PAY.JPからの直接リクエスト）
router.post('/', async (req, res) => {
  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    console.log('PAY.JP Webhook received:', event.type);

    // Webhookイベントをログに記録（デバッグ・監査用）
    await pool.query(
      `INSERT INTO billing_webhook_events (event_type, event_data)
       VALUES ($1, $2)`,
      [event.type, JSON.stringify(event.data)]
    );

    switch (event.type) {
      case 'charge.succeeded':
        await handleChargeSucceeded(event.data);
        break;
      case 'charge.failed':
        await handleChargeFailed(event.data);
        break;
      case 'subscription.deleted':
        await handleSubscriptionDeleted(event.data);
        break;
      case 'subscription.renewed':
        await handleSubscriptionRenewed(event.data);
        break;
      default:
        console.log('Unhandled PAY.JP event:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('PAY.JP Webhook error:', error);
    // Webhookは常に200を返す（リトライループ防止）
    res.json({ received: true, error: 'processing failed' });
  }
});
```

### 2. イベントハンドラー

```typescript
// 決済成功 - billing_history記録 & ステータス復旧
async function handleChargeSucceeded(data: any) {
  const subscriptionId = data.subscription;
  if (!subscriptionId) return;

  const store = await findStoreBySubscription(subscriptionId);
  if (!store) return;

  await pool.query(
    `INSERT INTO billing_history (
      store_id, plan_id, amount, payjp_subscription_id,
      billing_period_start, billing_period_end, status, paid_at
    ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 month', 'paid', CURRENT_TIMESTAMP)`,
    [store.id, store.plan_id, data.amount, subscriptionId]
  );

  // past_due → active への復旧も含む
  await pool.query(
    `UPDATE stores SET subscription_status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [store.id]
  );
}

// 決済失敗 - ステータス更新 & 管理者にメール通知
async function handleChargeFailed(data: any) {
  const subscriptionId = data.subscription;
  if (!subscriptionId) return;

  const store = await findStoreBySubscription(subscriptionId);
  if (!store) return;

  // ステータスを past_due に更新
  await pool.query(
    `UPDATE stores SET
      subscription_status = 'past_due',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1`,
    [store.id]
  );

  // billing_historyに失敗レコード
  await pool.query(
    `INSERT INTO billing_history (
      store_id, plan_id, amount, payjp_subscription_id,
      status, failure_reason
    ) VALUES ($1, $2, $3, $4, 'failed', $5)`,
    [store.id, store.plan_id, data.amount, subscriptionId, data.failure_message || '決済に失敗しました']
  );

  // 店舗管理者（is_owner=true）にメール通知
  await notifyPaymentFailureToAdmin(store);
}

// サブスクリプション削除
async function handleSubscriptionDeleted(data: any) {
  const store = await findStoreBySubscription(data.id);
  if (!store) return;

  await pool.query(
    `UPDATE stores SET
      subscription_status = 'canceled',
      payjp_subscription_id = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1`,
    [store.id]
  );
}

// サブスクリプション自動更新成功
async function handleSubscriptionRenewed(data: any) {
  const store = await findStoreBySubscription(data.id);
  if (!store) return;

  await pool.query(
    `UPDATE stores SET
      subscription_status = 'active',
      subscription_end_date = CURRENT_TIMESTAMP + INTERVAL '1 month',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1`,
    [store.id]
  );
}

// ユーティリティ
async function findStoreBySubscription(subscriptionId: string) {
  const result = await pool.query(
    `SELECT id, plan_id, name, email FROM stores WHERE payjp_subscription_id = $1`,
    [subscriptionId]
  );
  return result.rows[0] || null;
}
```

### 3. 決済失敗のメール通知

店舗管理者（is_owner=true のスタッフ）のメールアドレスを取得してメール送信。
LINE通知は使わない（管理者はLIFFユーザーではないため）。

```typescript
import { sendEmail } from '../services/emailService.js';

async function notifyPaymentFailureToAdmin(store: { id: number; name: string }) {
  try {
    // 店舗の管理者（is_owner=true）のメールアドレスを取得
    const adminResult = await pool.query(
      `SELECT s.email FROM staff s
       JOIN staff_stores ss ON s.id = ss.staff_id
       WHERE ss.store_id = $1 AND s.is_owner = true`,
      [store.id]
    );

    if (adminResult.rows.length === 0) return;

    const adminEmail = adminResult.rows[0].email;

    await sendEmail({
      to: adminEmail,
      subject: '【Blink】お支払いに失敗しました',
      html: `
        <p>${store.name} 様</p>
        <p>Blinkの月額利用料のお支払いが失敗しました。</p>
        <p>カード情報を更新していただくか、別のお支払い方法をご登録ください。</p>
        <p>更新しない場合、サービスが一時停止される場合があります。</p>
        <p><a href="${process.env.FRONTEND_URL}/billing">カード情報を更新する</a></p>
        <hr>
        <p style="color:#999;font-size:12px">Blink - ペットサロン管理システム</p>
      `,
    });
  } catch (error) {
    console.error('Failed to notify payment failure to admin:', error);
  }
}
```

### 4. DB マイグレーション

```sql
-- 新規: server/src/db/migrations/035_billing_webhook.sql

-- billing_historyにfailure_reason追加
ALTER TABLE billing_history
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Webhookイベントログ（デバッグ・監査用）
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 5. フロントエンド（`client/src/pages/Billing.tsx`）

管理画面のBillingページに `past_due` ステータスの警告バナーを追加:

```typescript
// subscription_statusに応じた表示（管理画面内、オーナーのみアクセス可能）
{store.subscription_status === 'past_due' && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
    <p className="text-red-800 font-medium">お支払いに失敗しました</p>
    <p className="text-red-600 text-sm mt-1">
      カード情報を更新してください。更新しない場合、サービスが一時停止される場合があります。
    </p>
    <button
      onClick={handleUpdateCard}
      className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg"
    >
      カード情報を更新
    </button>
  </div>
)}
```

※ `handleUpdateCard` は既存の `POST /billing/update-card` エンドポイントを呼び出す。

### 6. サービス制限（past_due 時）

`past_due` 状態が一定期間続いた場合の機能制限:

```typescript
// server/src/middleware/auth.ts に追加
// past_due が14日以上続いている場合、読み取り専用に制限
if (store.subscription_status === 'past_due') {
  const daysPastDue = getDaysSince(store.subscription_end_date);
  if (daysPastDue > 14) {
    // POST/PUT/DELETE を制限（GET のみ許可）
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && !req.path.includes('/billing')) {
      return res.status(402).json({
        error: 'お支払いが未完了のため、データの変更ができません。課金設定から更新してください。',
      });
    }
  }
}
```

---

## 対象ファイル

### バックエンド
| ファイル | 変更内容 | ステータス |
|----------|----------|-----------|
| `server/src/index.ts` | Webhook用raw body parser・ルート登録 | ✅ 実装済 |
| `server/src/routes/billing.ts` | カード更新エンドポイント | ✅ 実装済 |
| 新規: `server/src/routes/billingWebhook.ts` | Webhookハンドラー本体 | 📋 |
| `server/src/middleware/auth.ts` | past_due時の機能制限 | 📋 |
| 新規: `server/src/db/migrations/035_billing_webhook.sql` | テーブル変更 | 📋 |

### フロントエンド
| ファイル | 変更内容 | ステータス |
|----------|----------|-----------|
| `client/src/pages/Billing.tsx` | past_due表示・カード更新UI | 📋 |

---

## 検証チェックリスト

- [ ] PAY.JP管理画面からテストWebhookを送信し、受信・ログ記録されること
- [ ] `charge.failed` イベントで `subscription_status` が `past_due` に更新されること
- [ ] `charge.failed` 時に管理者スタッフにメール通知が送信されること（LINEではなくメール）
- [ ] `charge.succeeded` イベントで `past_due` → `active` に復旧すること
- [ ] `subscription.renewed` イベントで `subscription_end_date` が更新されること
- [ ] `billing_history` に失敗レコード（`failure_reason` 付き）が記録されること
- [ ] Billing画面（管理画面）で `past_due` ステータスのアラートが表示されること
- [ ] カード更新後、次回決済が成功すること
- [ ] past_due 14日超で書き込み操作が制限されること（billingページは除外）
- [ ] Webhook処理がエラーでも200を返すこと（リトライループ防止）
- [ ] `billing_webhook_events` テーブルにイベントログが記録されること

---

## 実装ステータス

- [x] `server/src/index.ts` にWebhookルート登録 ✅
- [x] `server/src/routes/billing.ts` にカード更新エンドポイント ✅
- [ ] `server/src/routes/billingWebhook.ts` ハンドラー本体 📋
- [ ] イベントハンドラー（charge.succeeded/failed, subscription.deleted/renewed）📋
- [ ] DBマイグレーション（billing_webhook_events, failure_reason）📋
- [ ] 決済失敗メール通知（管理者スタッフ宛）📋
- [ ] Billing画面の past_due 表示 📋
- [ ] past_due 時の機能制限（auth middleware）📋
- [ ] PAY.JP管理画面でWebhook URL設定 📋
