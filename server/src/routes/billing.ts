import express from 'express';
import pool from '../db/connection.js';
import { authenticate, requireOwner, AuthRequest } from '../middleware/auth.js';
import Payjp from 'payjp';
import {
  requireStoreId,
  sendBadRequest,
  sendNotFound,
  sendServerError,
} from '../utils/response.js';

const router = express.Router();
router.use(authenticate);
router.use(requireOwner); // 課金関連は管理者のみ

// PAY.JP初期化（APIキーが設定されていない場合はnull）
const payjp = process.env.PAYJP_SECRET_KEY ? Payjp(process.env.PAYJP_SECRET_KEY) : null;

// プラン一覧取得
router.get('/plans', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM plans ORDER BY price_monthly ASC`
    );
    res.json(result.rows);
  } catch (error) {
    sendServerError(res, 'プラン一覧の取得に失敗しました', error);
  }
});

// 現在のプラン情報取得
router.get('/current', async (req: AuthRequest, res) => {
  try {
    const storeResult = await pool.query(
      `SELECT s.*, p.name as plan_name, p.display_name, p.price_monthly, p.max_dogs, p.features
       FROM stores s
       LEFT JOIN plans p ON s.plan_id = p.id
       WHERE s.id = $1`,
      [req.storeId]
    );

    if (storeResult.rows.length === 0) {
      sendNotFound(res, '店舗が見つかりません');
      return;
    }

    const store = storeResult.rows[0];

    // 現在の登録犬数を取得
    const dogsCountResult = await pool.query(
      `SELECT COUNT(*) as count FROM dogs d
       JOIN owners o ON d.owner_id = o.id
       WHERE o.store_id = $1 AND d.deleted_at IS NULL AND o.deleted_at IS NULL`,
      [req.storeId]
    );
    const dogsCount = parseInt(dogsCountResult.rows[0]?.count || '0');

    res.json({
      ...store,
      current_dogs_count: dogsCount,
      is_plan_limit_exceeded: store.max_dogs ? dogsCount >= store.max_dogs : false,
    });
  } catch (error) {
    sendServerError(res, 'プラン情報の取得に失敗しました', error);
  }
});

// プラン変更（PAY.JPサブスクリプション作成）
router.post('/subscribe', async (req: AuthRequest, res) => {
  try {
    const { plan_id, payjp_token } = req.body;

    if (!requireStoreId(req, res)) {
      return;
    }

    if (!plan_id || !payjp_token) {
      sendBadRequest(res, 'プランIDとPAY.JPトークンが必要です');
      return;
    }

    // プラン情報を取得
    const planResult = await pool.query(
      `SELECT * FROM plans WHERE id = $1`,
      [plan_id]
    );

    if (planResult.rows.length === 0) {
      sendNotFound(res, 'プランが見つかりません');
      return;
    }

    const plan = planResult.rows[0];

    // 店舗情報を取得
    const storeResult = await pool.query(
      `SELECT * FROM stores WHERE id = $1`,
      [req.storeId]
    );

    if (storeResult.rows.length === 0) {
      sendNotFound(res, '店舗が見つかりません');
      return;
    }

    const store = storeResult.rows[0];

    try {
      let customerId = store.payjp_customer_id;

      // 顧客が存在しない場合は作成
      if (!customerId) {
        // 店舗のメールアドレスを使用（未設定の場合はスタッフのメールを取得）
        let customerEmail = store.email;
        if (!customerEmail) {
          const staffResult = await pool.query(
            `SELECT s.email FROM staff s
             JOIN store_staff ss ON s.id = ss.staff_id
             WHERE ss.store_id = $1 AND ss.role = 'owner'
             LIMIT 1`,
            [req.storeId]
          );
          customerEmail = staffResult.rows[0]?.email || `store_${req.storeId}@blink.app`;
        }

        const customer = await payjp.customers.create({
          email: customerEmail,
          card: payjp_token,
        });
        customerId = customer.id;

        await pool.query(
          `UPDATE stores SET payjp_customer_id = $1 WHERE id = $2`,
          [customerId, req.storeId]
        );
      } else {
        // 既存顧客のカードを更新
        await payjp.customers.update(customerId, {
          card: payjp_token,
        });
      }

      // 既存のサブスクリプションをキャンセル
      if (store.payjp_subscription_id) {
        try {
          await payjp.subscriptions.cancel(store.payjp_subscription_id);
        } catch (cancelError) {
          console.warn('Failed to cancel existing subscription:', cancelError);
        }
      }

      // 新しいサブスクリプションを作成
      // PAY.JPはプランIDが必須のため、DBプランに対応するPAY.JPプランを用意する
      const monthlyAmount = Math.floor(Number(plan.price_monthly));
      const payjpPlanId = `plan_${plan.id}`;

      try {
        await payjp.plans.retrieve(payjpPlanId);
      } catch (planError) {
        await payjp.plans.create({
          id: payjpPlanId,
          amount: monthlyAmount,
          currency: 'jpy',
          interval: 'month',
          name: plan.display_name,
          metadata: {
            plan_id: plan.id.toString(),
            plan_name: plan.name,
          },
        });
      }

      const subscription = await payjp.subscriptions.create({
        customer: customerId,
        plan: payjpPlanId,
        metadata: {
          plan_id: plan.id.toString(),
          plan_name: plan.name,
        },
      });

      // 店舗情報を更新
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      await pool.query(
        `UPDATE stores SET
          plan_id = $1,
          payjp_subscription_id = $2,
          subscription_status = 'active',
          subscription_start_date = $3,
          subscription_end_date = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5`,
        [plan_id, subscription.id, startDate, endDate, req.storeId]
      );

      // 請求履歴に記録
      await pool.query(
        `INSERT INTO billing_history (
          store_id, plan_id, amount, payjp_subscription_id,
          billing_period_start, billing_period_end, status, paid_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'paid', CURRENT_TIMESTAMP)`,
        [
          req.storeId,
          plan_id,
          plan.price_monthly,
          subscription.id,
          startDate,
          endDate,
        ]
      );

      res.json({
        success: true,
        subscription: {
          id: subscription.id,
          status: 'active',
          plan: plan,
        },
      });
    } catch (payjpError: any) {
      console.error('PAY.JP error:', payjpError);
      res.status(400).json({
        error: '決済処理に失敗しました',
        details: payjpError.message || 'Unknown error',
      });
    }
  } catch (error) {
    sendServerError(res, 'プラン変更に失敗しました', error);
  }
});

// カード情報更新（サブスクリプション維持）
router.post('/update-card', async (req: AuthRequest, res) => {
  try {
    const { payjp_token } = req.body;

    if (!requireStoreId(req, res)) {
      return;
    }

    if (!payjp_token) {
      sendBadRequest(res, 'PAY.JPトークンが必要です');
      return;
    }

    const storeResult = await pool.query(
      `SELECT payjp_customer_id FROM stores WHERE id = $1`,
      [req.storeId]
    );

    if (storeResult.rows.length === 0) {
      sendNotFound(res, '店舗が見つかりません');
      return;
    }

    const customerId = storeResult.rows[0]?.payjp_customer_id as string | null;
    if (!customerId) {
      sendBadRequest(res, 'PAY.JP顧客情報が存在しません');
      return;
    }

    try {
      await payjp.customers.update(customerId, {
        card: payjp_token,
      });

      res.json({ success: true, message: 'カード情報を更新しました' });
    } catch (payjpError: any) {
      console.error('PAY.JP update card error:', payjpError);
      res.status(400).json({
        error: 'カード情報の更新に失敗しました',
        details: payjpError.message || 'Unknown error',
      });
    }
  } catch (error) {
    sendServerError(res, 'カード情報の更新に失敗しました', error);
  }
});

// サブスクリプションキャンセル
router.post('/cancel', async (req: AuthRequest, res) => {
  try {
    const storeResult = await pool.query(
      `SELECT payjp_subscription_id FROM stores WHERE id = $1`,
      [req.storeId]
    );

    if (storeResult.rows.length === 0 || !storeResult.rows[0].payjp_subscription_id) {
      sendNotFound(res, 'アクティブなサブスクリプションが見つかりません');
      return;
    }

    const subscriptionId = storeResult.rows[0].payjp_subscription_id;

    try {
      await payjp.subscriptions.cancel(subscriptionId);

      await pool.query(
        `UPDATE stores SET
          subscription_status = 'canceled',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
        [req.storeId]
      );

      res.json({ success: true, message: 'サブスクリプションをキャンセルしました' });
    } catch (payjpError: any) {
      console.error('PAY.JP cancel error:', payjpError);
      res.status(400).json({
        error: 'キャンセル処理に失敗しました',
        details: payjpError.message || 'Unknown error',
      });
    }
  } catch (error) {
    sendServerError(res, 'キャンセル処理に失敗しました', error);
  }
});

// 請求履歴取得
router.get('/history', async (req: AuthRequest, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    // 総件数取得
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM billing_history WHERE store_id = $1`,
      [req.storeId]
    );
    const total = parseInt(countResult.rows[0]?.total || '0');

    // 請求履歴取得
    const result = await pool.query(
      `SELECT bh.*, p.display_name as plan_name
       FROM billing_history bh
       LEFT JOIN plans p ON bh.plan_id = p.id
       WHERE bh.store_id = $1
       ORDER BY bh.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.storeId, limitNum, offset]
    );

    res.json({
      history: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    sendServerError(res, '請求履歴の取得に失敗しました', error);
  }
});

// PAY.JPトークン作成用の公開キー取得
router.get('/payjp-key', async (req: AuthRequest, res) => {
  res.json({
    publicKey: process.env.PAYJP_PUBLIC_KEY || '',
  });
});

export default router;
