import express from 'express';
import { customAlphabet } from 'nanoid';
import pool from '../db/connection.js';
import { supabase } from '../db/supabase.js';
import { authenticate, requireOwner, AuthRequest, invalidateStaffCache } from '../middleware/auth.js';
import { requireStoreId, sendBadRequest, sendServerError } from '../utils/response.js';
import { encrypt } from '../utils/encryption.js';
import { clearStoreLineClientCache } from '../services/lineMessagingService.js';

const router = express.Router();

// トライアル店舗コード生成（O/0, I/1 を除外）
const generateStoreCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

// ガイドステップ定義
const GUIDE_STEPS = [
  { step_number: 1, step_key: 'register_customer', title: '飼い主を登録しよう', description: 'あなた自身の情報で飼い主と犬を1件登録します', action_url: '/owners/new' },
  { step_number: 2, step_key: 'create_reservation', title: '予約を作成しよう', description: '登録した犬の予約を作成します', action_url: '/reservations/new' },
  { step_number: 3, step_key: 'write_record', title: '連絡帳を書いてみよう', description: '今日の様子を連絡帳に書きます', action_url: '/records/new' },
  { step_number: 4, step_key: 'link_line_account', title: 'LINE通知を受け取る設定', description: 'デモ用LINE公式アカウントを友だち追加し、店舗コードを送信します', action_url: '' },
  { step_number: 5, step_key: 'write_internal_notes', title: '内部記録を記入しよう', description: '予約カードから内部記録を記入します（飼い主には非公開）', action_url: '/' },
  { step_number: 6, step_key: 'send_line_notification', title: 'LINEで通知を送ってみよう', description: '連絡帳を共有すると、あなたのLINEに届きます', action_url: '/records' },
  { step_number: 7, step_key: 'check_liff_app', title: 'ユーザー側の画面を確認', description: 'LINEのBlink画面を開いて、飼い主として受け取った連絡帳を確認します', action_url: '' },
];

// -------------------------
// POST /start - トライアル登録（認証不要）
// -------------------------
router.post('/start', async (req, res) => {
  try {
    const { email, password, store_name, owner_name, businessTypes, primaryBusinessType } = req.body;

    // バリデーション
    if (!email || !password || !store_name || !owner_name) {
      sendBadRequest(res, '全ての必須項目を入力してください');
      return;
    }

    if (typeof store_name !== 'string' || store_name.trim().length === 0 || store_name.length > 255) {
      sendBadRequest(res, '店舗名は1〜255文字で入力してください');
      return;
    }

    if (typeof owner_name !== 'string' || owner_name.trim().length === 0 || owner_name.length > 100) {
      sendBadRequest(res, '名前は1〜100文字で入力してください');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      sendBadRequest(res, '有効なメールアドレスを入力してください');
      return;
    }

    if (typeof password !== 'string' || password.length < 8) {
      sendBadRequest(res, 'パスワードは8文字以上で入力してください');
      return;
    }

    const validTypes = ['daycare', 'grooming', 'hotel'];
    const types = Array.isArray(businessTypes) && businessTypes.length > 0 ? businessTypes : ['daycare'];
    const invalidTypes = types.filter((t: string) => !validTypes.includes(t));
    if (invalidTypes.length > 0) {
      sendBadRequest(res, '無効な業態が含まれています');
      return;
    }

    const primary = primaryBusinessType && types.includes(primaryBusinessType)
      ? primaryBusinessType
      : types[0];

    if (!supabase) {
      return res.status(500).json({ error: '認証システムが設定されていません' });
    }

    // 既存メールチェック
    const existingStaff = await pool.query(
      'SELECT id FROM staff WHERE email = $1',
      [email]
    );
    if (existingStaff.rows.length > 0) {
      return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
    }

    // Supabase認証ユーザー作成
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('[error] Supabase createUser error:', authError);
      if (authError.message?.includes('already been registered')) {
        return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
      }
      return res.status(500).json({ error: 'アカウントの作成に失敗しました' });
    }

    const authUserId = authData.user.id;

    // トライアル店舗コード生成
    const trialStoreCode = `STORE-${generateStoreCode()}`;

    // トランザクションで店舗・スタッフ・ガイド進捗を一括作成
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 店舗作成
      const storeResult = await client.query(
        `INSERT INTO stores (name, business_types, primary_business_type, onboarding_completed, is_trial, trial_started_at, trial_expires_at, trial_store_code)
         VALUES ($1, $2, $3, TRUE, TRUE, NOW(), NOW() + INTERVAL '14 days', $4)
         RETURNING id`,
        [store_name.trim(), types, primary, trialStoreCode]
      );
      const storeId = storeResult.rows[0].id;

      // スタッフ作成
      const staffResult = await client.query(
        `INSERT INTO staff (email, name, auth_user_id, is_owner)
         VALUES ($1, $2, $3, TRUE)
         RETURNING id`,
        [email, owner_name.trim(), authUserId]
      );
      const staffId = staffResult.rows[0].id;

      // スタッフと店舗の関連付け
      await client.query(
        `INSERT INTO staff_stores (staff_id, store_id)
         VALUES ($1, $2)`,
        [staffId, storeId]
      );

      // ガイド進捗の初期データ作成（ステップ1のみ unlocked）
      for (const step of GUIDE_STEPS) {
        await client.query(
          `INSERT INTO trial_guide_progress (store_id, step_number, step_key, unlocked_at)
           VALUES ($1, $2, $3, $4)`,
          [storeId, step.step_number, step.step_key, step.step_number === 1 ? new Date() : null]
        );
      }

      // 通知設定の初期データ作成（LINE通知を有効にしておく）
      await client.query(
        `INSERT INTO notification_settings (store_id, record_notification, line_notification_enabled)
         VALUES ($1, TRUE, TRUE)
         ON CONFLICT DO NOTHING`,
        [storeId]
      );

      await client.query('COMMIT');

      // キャッシュを無効化
      invalidateStaffCache(authUserId);

      res.status(201).json({
        success: true,
        data: { message: 'トライアルアカウントが作成されました' },
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      // Supabaseユーザーをクリーンアップ
      try {
        await supabase.auth.admin.deleteUser(authUserId);
      } catch (cleanupError) {
        console.error('[error] Failed to cleanup Supabase user after DB error:', cleanupError);
      }
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    sendServerError(res, 'トライアルアカウントの作成に失敗しました', error);
  }
});

// -------------------------
// GET /guide - ガイド状態取得（認証必要）
// -------------------------
router.get('/guide', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    // 店舗情報取得
    const storeResult = await pool.query(
      `SELECT is_trial, trial_expires_at, trial_store_code FROM stores WHERE id = $1`,
      [req.storeId]
    );

    if (storeResult.rows.length === 0) {
      return res.status(404).json({ error: '店舗が見つかりません' });
    }

    const store = storeResult.rows[0];

    // ガイド進捗取得
    let stepsResult = await pool.query(
      `SELECT * FROM trial_guide_progress WHERE store_id = $1 ORDER BY step_number`,
      [req.storeId]
    );

    // ガイド進捗が存在しない場合は自動初期化（トライアルアカウントの復旧用）
    if (stepsResult.rows.length === 0 && store.is_trial) {
      for (const step of GUIDE_STEPS) {
        await pool.query(
          `INSERT INTO trial_guide_progress (store_id, step_number, step_key, unlocked_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [req.storeId, step.step_number, step.step_key, step.step_number === 1 ? new Date() : null]
        );
      }
      stepsResult = await pool.query(
        `SELECT * FROM trial_guide_progress WHERE store_id = $1 ORDER BY step_number`,
        [req.storeId]
      );
    }

    // Step 1 が unlocked でなければ自動修復（初期化不備の安全策）
    const step1Row = stepsResult.rows.find((row: { step_key: string }) => row.step_key === 'register_customer');
    if (step1Row && !step1Row.unlocked_at) {
      await pool.query(
        `UPDATE trial_guide_progress SET unlocked_at = NOW() WHERE store_id = $1 AND step_key = 'register_customer'`,
        [req.storeId]
      );
      stepsResult = await pool.query(
        `SELECT * FROM trial_guide_progress WHERE store_id = $1 ORDER BY step_number`,
        [req.storeId]
      );
    }

    // 不足ステップの自動補完（ステップ追加時の既存アカウント対応）
    if (stepsResult.rows.length < GUIDE_STEPS.length && store.is_trial) {
      const existingKeys = new Set(stepsResult.rows.map((r: { step_key: string }) => r.step_key));
      for (const step of GUIDE_STEPS) {
        if (!existingKeys.has(step.step_key)) {
          await pool.query(
            `INSERT INTO trial_guide_progress (store_id, step_number, step_key)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [req.storeId, step.step_number, step.step_key]
          );
        }
      }
      stepsResult = await pool.query(
        `SELECT * FROM trial_guide_progress WHERE store_id = $1 ORDER BY step_number`,
        [req.storeId]
      );
    }

    // trial_store_code が未設定の場合は自動生成
    if (store.is_trial && !store.trial_store_code) {
      const trialStoreCode = `STORE-${generateStoreCode()}`;
      await pool.query(
        `UPDATE stores SET trial_store_code = $1 WHERE id = $2`,
        [trialStoreCode, req.storeId]
      );
      store.trial_store_code = trialStoreCode;
    }

    // 残り日数を計算
    let daysRemaining = 0;
    if (store.trial_expires_at) {
      const expiresAt = new Date(store.trial_expires_at);
      const now = new Date();
      daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // link_line_account ステップの自動完了チェック
    const linkStep = stepsResult.rows.find((row: { step_key: string; completed_at?: string; unlocked_at?: string }) =>
      row.step_key === 'link_line_account'
    );
    if (linkStep && linkStep.unlocked_at && !linkStep.completed_at) {
      const linkCheck = await pool.query(
        'SELECT id FROM trial_line_links WHERE store_id = $1 LIMIT 1',
        [req.storeId]
      );
      if (linkCheck.rows.length > 0) {
        // 自動完了 + 次ステップアンロック
        await pool.query(
          `UPDATE trial_guide_progress SET completed_at = NOW() WHERE store_id = $1 AND step_key = 'link_line_account'`,
          [req.storeId]
        );
        await pool.query(
          `UPDATE trial_guide_progress SET unlocked_at = NOW() WHERE store_id = $1 AND step_key = 'write_internal_notes' AND unlocked_at IS NULL`,
          [req.storeId]
        );
        // 更新後のデータを再取得
        stepsResult = await pool.query(
          `SELECT * FROM trial_guide_progress WHERE store_id = $1 ORDER BY step_number`,
          [req.storeId]
        );
      }
    }

    // ステップ定義とDB進捗をマージ
    const steps = GUIDE_STEPS.map((def) => {
      const dbStep = stepsResult.rows.find((row: { step_key: string; unlocked_at?: string; completed_at?: string }) => row.step_key === def.step_key);
      return {
        ...def,
        unlocked: !!dbStep?.unlocked_at,
        completed: !!dbStep?.completed_at,
        completed_at: dbStep?.completed_at || null,
      };
    });

    // 全ステップ完了チェック
    const guideCompleted = steps.every((s) => s.completed);

    // 現在のステップ（最初のアンロック済み＆未完了）
    const currentStep = steps.find((s) => s.unlocked && !s.completed) || null;

    res.json({
      success: true,
      data: {
        is_trial: store.is_trial,
        days_remaining: daysRemaining,
        trial_store_code: store.trial_store_code,
        guide_completed: guideCompleted,
        steps,
        current_step: currentStep,
      },
    });
  } catch (error) {
    sendServerError(res, 'ガイド状態の取得に失敗しました', error);
  }
});

// -------------------------
// POST /guide/:stepKey/complete - ガイドステップ完了（認証必要）
// -------------------------
router.post('/guide/:stepKey/complete', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const { stepKey } = req.params;

    // ステップキーのバリデーション
    const stepDef = GUIDE_STEPS.find((s) => s.step_key === stepKey);
    if (!stepDef) {
      sendBadRequest(res, '無効なステップキーです');
      return;
    }

    // 現在のステップ状態を取得
    const stepResult = await pool.query(
      `SELECT * FROM trial_guide_progress WHERE store_id = $1 AND step_key = $2`,
      [req.storeId, stepKey]
    );

    if (stepResult.rows.length === 0) {
      return res.status(404).json({ error: 'ステップが見つかりません' });
    }

    const step = stepResult.rows[0];

    if (!step.unlocked_at) {
      sendBadRequest(res, 'このステップはまだロックされています');
      return;
    }

    if (step.completed_at) {
      sendBadRequest(res, 'このステップは既に完了しています');
      return;
    }

    // ステップを完了に設定
    await pool.query(
      `UPDATE trial_guide_progress SET completed_at = NOW() WHERE store_id = $1 AND step_key = $2`,
      [req.storeId, stepKey]
    );

    // 次のステップをアンロック
    const nextStepDef = GUIDE_STEPS.find((s) => s.step_number === stepDef.step_number + 1);
    let nextStep = null;

    if (nextStepDef) {
      await pool.query(
        `UPDATE trial_guide_progress SET unlocked_at = NOW() WHERE store_id = $1 AND step_key = $2 AND unlocked_at IS NULL`,
        [req.storeId, nextStepDef.step_key]
      );
      nextStep = nextStepDef;
    }

    // 全ステップ完了チェック
    const allStepsResult = await pool.query(
      `SELECT COUNT(*) as total, COUNT(completed_at) as completed FROM trial_guide_progress WHERE store_id = $1`,
      [req.storeId]
    );
    const { total, completed } = allStepsResult.rows[0];
    const allCompleted = parseInt(total) === parseInt(completed) + 1; // +1 は今完了したステップ分

    res.json({
      success: true,
      data: {
        completed_step: stepDef,
        next_step: nextStep,
        all_completed: allCompleted,
        celebration: allCompleted,
      },
    });
  } catch (error) {
    sendServerError(res, 'ステップの完了に失敗しました', error);
  }
});

// -------------------------
// POST /convert - トライアルから本番アカウントへ変換（認証必要・オーナーのみ）
// -------------------------
router.post('/convert', authenticate, requireOwner, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const { line_channel_id, line_channel_secret, line_channel_access_token, liff_id, confirm_delete_all } = req.body;

    // 確認フラグのバリデーション
    if (confirm_delete_all !== true) {
      sendBadRequest(res, 'データ削除の確認が必要です');
      return;
    }

    // LINE認証情報のバリデーション
    if (!line_channel_id || !line_channel_secret || !line_channel_access_token || !liff_id) {
      sendBadRequest(res, 'LINE連携情報を全て入力してください');
      return;
    }

    if (typeof line_channel_id !== 'string' || line_channel_id.trim().length === 0) {
      sendBadRequest(res, '有効なLINEチャネルIDを入力してください');
      return;
    }

    if (typeof line_channel_secret !== 'string' || line_channel_secret.trim().length === 0) {
      sendBadRequest(res, '有効なLINEチャネルシークレットを入力してください');
      return;
    }

    if (typeof line_channel_access_token !== 'string' || line_channel_access_token.trim().length === 0) {
      sendBadRequest(res, '有効なLINEチャネルアクセストークンを入力してください');
      return;
    }

    if (typeof liff_id !== 'string' || liff_id.trim().length === 0) {
      sendBadRequest(res, '有効なLIFF IDを入力してください');
      return;
    }

    // トライアル状態の確認
    const storeCheck = await pool.query(
      `SELECT is_trial FROM stores WHERE id = $1`,
      [req.storeId]
    );

    if (storeCheck.rows.length === 0 || !storeCheck.rows[0].is_trial) {
      sendBadRequest(res, 'この店舗はトライアルモードではありません');
      return;
    }

    // トランザクションで顧客データ削除 + LINE設定更新
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const deleteCounts: Record<string, number> = {};

      // 顧客データの削除（依存関係の順序に従う）
      const deleteQueries: { key: string; sql: string }[] = [
        { key: 'owner_announcement_reads', sql: `DELETE FROM owner_announcement_reads WHERE owner_id IN (SELECT id FROM owners WHERE store_id = $1)` },
        { key: 'notification_logs', sql: `DELETE FROM notification_logs WHERE store_id = $1` },
        { key: 'audit_logs', sql: `DELETE FROM audit_logs WHERE store_id = $1` },
        { key: 'pre_visit_inputs', sql: `DELETE FROM pre_visit_inputs WHERE reservation_id IN (SELECT id FROM reservations WHERE store_id = $1)` },
        { key: 'reservation_calendar_events', sql: `DELETE FROM reservation_calendar_events WHERE reservation_id IN (SELECT id FROM reservations WHERE store_id = $1)` },
        { key: 'records', sql: `DELETE FROM records WHERE store_id = $1` },
        { key: 'training_profile_grid_entries', sql: `DELETE FROM training_profile_grid_entries WHERE store_id = $1` },
        { key: 'training_profile_log_entries', sql: `DELETE FROM training_profile_log_entries WHERE store_id = $1` },
        { key: 'training_profile_concerns', sql: `DELETE FROM training_profile_concerns WHERE store_id = $1` },
        { key: 'makeup_tickets', sql: `DELETE FROM makeup_tickets WHERE dog_id IN (SELECT id FROM dogs WHERE owner_id IN (SELECT id FROM owners WHERE store_id = $1))` },
        { key: 'dog_health', sql: `DELETE FROM dog_health WHERE dog_id IN (SELECT id FROM dogs WHERE owner_id IN (SELECT id FROM owners WHERE store_id = $1))` },
        { key: 'dog_personality', sql: `DELETE FROM dog_personality WHERE dog_id IN (SELECT id FROM dogs WHERE owner_id IN (SELECT id FROM owners WHERE store_id = $1))` },
        { key: 'contracts', sql: `DELETE FROM contracts WHERE dog_id IN (SELECT id FROM dogs WHERE owner_id IN (SELECT id FROM owners WHERE store_id = $1))` },
        { key: 'dogs', sql: `DELETE FROM dogs WHERE owner_id IN (SELECT id FROM owners WHERE store_id = $1)` },
        { key: 'owners', sql: `DELETE FROM owners WHERE store_id = $1` },
        { key: 'reservations', sql: `DELETE FROM reservations WHERE store_id = $1` },
        { key: 'store_announcements', sql: `DELETE FROM store_announcements WHERE store_id = $1` },
        { key: 'ai_learning_data', sql: `DELETE FROM ai_learning_data WHERE store_id = $1` },
        { key: 'export_logs', sql: `DELETE FROM export_logs WHERE store_id = $1` },
        { key: 'ux_events', sql: `DELETE FROM ux_events WHERE store_id = $1` },
        { key: 'ux_report_jobs', sql: `DELETE FROM ux_report_jobs WHERE store_id = $1` },
        { key: 'inspection_records', sql: `DELETE FROM inspection_records WHERE store_id = $1` },
        { key: 'billing_history', sql: `DELETE FROM billing_history WHERE store_id = $1` },
        { key: 'trial_line_links', sql: `DELETE FROM trial_line_links WHERE store_id = $1` },
        { key: 'trial_guide_progress', sql: `DELETE FROM trial_guide_progress WHERE store_id = $1` },
      ];

      for (const { key, sql } of deleteQueries) {
        const result = await client.query(sql, [req.storeId]);
        deleteCounts[key] = result.rowCount || 0;
      }

      // LINE認証情報を暗号化して店舗テーブルを更新
      const encryptedSecret = encrypt(line_channel_secret.trim());
      const encryptedAccessToken = encrypt(line_channel_access_token.trim());

      await client.query(
        `UPDATE stores
         SET line_channel_id = $1,
             line_channel_secret = $2,
             line_channel_access_token = $3,
             liff_id = $4,
             is_trial = FALSE,
             converted_at = NOW(),
             trial_store_code = NULL
         WHERE id = $5`,
        [line_channel_id.trim(), encryptedSecret, encryptedAccessToken, liff_id.trim(), req.storeId]
      );

      await client.query('COMMIT');

      // LINE クライアントキャッシュをクリア
      clearStoreLineClientCache(req.storeId);

      console.log(`[info] Trial store ${req.storeId} converted to full account`);

      res.json({
        success: true,
        data: {
          message: '本番アカウントへの切り替えが完了しました',
          deleted_counts: deleteCounts,
        },
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    sendServerError(res, '本番アカウントへの切り替えに失敗しました', error);
  }
});

// -------------------------
// POST /extend - トライアル期間延長（認証必要・オーナーのみ）
// -------------------------
router.post('/extend', authenticate, requireOwner, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;

    const { days = 14 } = req.body;

    if (typeof days !== 'number' || days < 1 || days > 365) {
      sendBadRequest(res, '延長日数は1〜365の範囲で指定してください');
      return;
    }

    // トライアル状態の確認
    const storeCheck = await pool.query(
      `SELECT is_trial, trial_expires_at FROM stores WHERE id = $1`,
      [req.storeId]
    );

    if (storeCheck.rows.length === 0) {
      return res.status(404).json({ error: '店舗が見つかりません' });
    }

    if (!storeCheck.rows[0].is_trial) {
      sendBadRequest(res, 'この店舗はトライアルモードではありません');
      return;
    }

    // トライアル期間を延長
    const result = await pool.query(
      `UPDATE stores
       SET trial_expires_at = trial_expires_at + ($1 || ' days')::INTERVAL
       WHERE id = $2
       RETURNING trial_expires_at`,
      [String(days), req.storeId]
    );

    const newExpiresAt = result.rows[0].trial_expires_at;

    console.log(`[info] Trial store ${req.storeId} extended by ${days} days, new expiry: ${newExpiresAt}`);

    res.json({
      success: true,
      data: {
        message: `トライアル期間を${days}日間延長しました`,
        trial_expires_at: newExpiresAt,
      },
    });
  } catch (error) {
    sendServerError(res, 'トライアル期間の延長に失敗しました', error);
  }
});

export default router;
