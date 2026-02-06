import express from 'express';
import pool from '../db/connection.js';
import { sendStoreOwnerPaymentFailedNotification } from '../services/notificationService.js';

type WebhookEvent = {
  id?: string;
  type?: string;
  data?: unknown;
  livemode?: boolean;
  [key: string]: unknown;
};

type StoreForBilling = {
  id: number;
  plan_id: number | null;
  name: string;
  price_monthly: number | string | null;
};

const router = express.Router();

// PAY.JP Webhook受信
router.post('/', async (req, res) => {
  let logId: number | null = null;

  try {
    const event = parseWebhookBody(req.body);
    if (!event) {
      console.log('PAY.JP Webhook: body取得失敗 - type:', typeof req.body);
      res.json({ received: true });
      return;
    }

    const eventType = event.type ?? 'unknown';
    const eventData = event.data ?? null;

    console.log('PAY.JP Webhook received:', eventType);

    logId = await logWebhookEvent(eventType, eventData);

    switch (eventType) {
      case 'charge.succeeded':
        await handleChargeSucceeded(eventData);
        break;
      case 'charge.failed':
        await handleChargeFailed(eventData);
        break;
      case 'subscription.deleted':
        await handleSubscriptionDeleted(eventData);
        break;
      case 'subscription.renewed':
        await handleSubscriptionRenewed(eventData);
        break;
      default:
        console.log('Unhandled PAY.JP event:', eventType);
    }

    if (logId) {
      await markWebhookProcessed(logId, true);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('PAY.JP Webhook error:', error);

    if (logId) {
      await markWebhookProcessed(logId, false);
    }

    // Webhookは常に200を返す（リトライ防止）
    res.json({ received: true, error: 'processing failed' });
  }
});

async function logWebhookEvent(eventType: string, eventData: unknown): Promise<number | null> {
  try {
    const result = await pool.query(
      `INSERT INTO billing_webhook_events (event_type, event_data, processed)
       VALUES ($1, $2, false)
       RETURNING id`,
      [eventType, eventData]
    );
    return result.rows[0]?.id ?? null;
  } catch (error) {
    console.error('Failed to log webhook event:', error);
    return null;
  }
}

async function markWebhookProcessed(logId: number, processed: boolean): Promise<void> {
  try {
    await pool.query(
      `UPDATE billing_webhook_events SET processed = $1 WHERE id = $2`,
      [processed, logId]
    );
  } catch (error) {
    console.error('Failed to update webhook status:', error);
  }
}

// 決済成功
async function handleChargeSucceeded(data: unknown): Promise<void> {
  const payload = extractEventObject(data);
  if (!payload) return;

  const subscriptionId = getString(payload.subscription ?? payload?.object?.subscription);
  if (!subscriptionId) return;

  const store = await findStoreBySubscription(subscriptionId);
  if (!store) return;

  const chargeId = getString(payload.id ?? payload?.object?.id);
  const existingCharge = await hasBillingCharge(chargeId);

  const now = new Date();
  const startDate = toDateFromUnix(payload.period_start ?? payload?.object?.period_start) ?? now;
  const endDate = toDateFromUnix(payload.period_end ?? payload?.object?.period_end) ?? addOneMonth(startDate);
  const amount = normalizeAmount(payload.amount ?? payload?.object?.amount, store.price_monthly);

  if (!existingCharge) {
    await pool.query(
      `INSERT INTO billing_history (
        store_id, plan_id, amount, payjp_charge_id, payjp_subscription_id,
        billing_period_start, billing_period_end, status, paid_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'paid', CURRENT_TIMESTAMP)`,
      [
        store.id,
        store.plan_id,
        amount,
        chargeId,
        subscriptionId,
        startDate,
        endDate,
      ]
    );
  }

  await pool.query(
    `UPDATE stores SET subscription_status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [store.id]
  );
}

// 決済失敗
async function handleChargeFailed(data: unknown): Promise<void> {
  const payload = extractEventObject(data);
  if (!payload) return;

  const subscriptionId = getString(payload.subscription ?? payload?.object?.subscription);
  if (!subscriptionId) return;

  const store = await findStoreBySubscription(subscriptionId);
  if (!store) return;

  const chargeId = getString(payload.id ?? payload?.object?.id);
  const existingCharge = await hasBillingCharge(chargeId);
  const amount = normalizeAmount(payload.amount ?? payload?.object?.amount, store.price_monthly);
  const failureReason = getString(payload.failure_message ?? payload?.object?.failure_message)
    || getString(payload.failure_code ?? payload?.object?.failure_code)
    || '決済に失敗しました';

  await pool.query(
    `UPDATE stores SET
      subscription_status = 'past_due',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1`,
    [store.id]
  );

  if (!existingCharge) {
    await pool.query(
      `INSERT INTO billing_history (
        store_id, plan_id, amount, payjp_charge_id, payjp_subscription_id,
        status, failure_reason
      ) VALUES ($1, $2, $3, $4, $5, 'failed', $6)`,
      [store.id, store.plan_id, amount, chargeId, subscriptionId, failureReason]
    );
  }

  await sendStoreOwnerPaymentFailedNotification({
    storeId: store.id,
    storeName: store.name,
    failureReason,
  });
}

// サブスクリプション削除
async function handleSubscriptionDeleted(data: unknown): Promise<void> {
  const payload = extractEventObject(data);
  if (!payload) return;

  const subscriptionId = getString(payload.id ?? payload?.object?.id);
  if (!subscriptionId) return;

  const store = await findStoreBySubscription(subscriptionId);
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

// サブスクリプション更新
async function handleSubscriptionRenewed(data: unknown): Promise<void> {
  const payload = extractEventObject(data);
  if (!payload) return;

  const subscriptionId = getString(payload.id ?? payload?.object?.id);
  if (!subscriptionId) return;

  const store = await findStoreBySubscription(subscriptionId);
  if (!store) return;

  const periodEnd = toDateFromUnix(payload.current_period_end ?? payload?.object?.current_period_end)
    ?? addOneMonth(new Date());

  await pool.query(
    `UPDATE stores SET
      subscription_status = 'active',
      subscription_end_date = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1`,
    [store.id, periodEnd]
  );
}

// ユーティリティ
async function findStoreBySubscription(subscriptionId: string): Promise<StoreForBilling | null> {
  const result = await pool.query<StoreForBilling>(
    `SELECT s.id, s.plan_id, s.name, p.price_monthly
     FROM stores s
     LEFT JOIN plans p ON s.plan_id = p.id
     WHERE s.payjp_subscription_id = $1`,
    [subscriptionId]
  );
  return result.rows[0] || null;
}

async function hasBillingCharge(chargeId: string | null): Promise<boolean> {
  if (!chargeId) return false;
  const result = await pool.query(
    `SELECT 1 FROM billing_history WHERE payjp_charge_id = $1 LIMIT 1`,
    [chargeId]
  );
  return result.rows.length > 0;
}

function parseWebhookBody(body: unknown): WebhookEvent | null {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as WebhookEvent;
    } catch {
      return null;
    }
  }

  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString('utf-8')) as WebhookEvent;
    } catch {
      return null;
    }
  }

  if (typeof body === 'object' && body !== null) {
    return body as WebhookEvent;
  }

  return null;
}

function extractEventObject(data: unknown): Record<string, any> | null {
  if (!data) return null;
  if (typeof data === 'object' && data !== null && 'object' in (data as Record<string, any>)) {
    return (data as Record<string, any>).object as Record<string, any>;
  }
  if (typeof data === 'object' && data !== null) {
    return data as Record<string, any>;
  }
  return null;
}

function getString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return null;
}

function normalizeAmount(value: unknown, fallback: number | string | null): number {
  const raw = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isNaN(raw)) {
    return raw;
  }

  const fallbackValue = typeof fallback === 'number'
    ? fallback
    : typeof fallback === 'string'
      ? Number(fallback)
      : NaN;

  return Number.isNaN(fallbackValue) ? 0 : fallbackValue;
}

function toDateFromUnix(value: unknown): Date | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value * 1000);
  }
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
    return new Date(Number(value) * 1000);
  }
  return null;
}

function addOneMonth(date: Date): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

export default router;
