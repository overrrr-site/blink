import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { sendBadRequest, sendServerError } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

// オンボーディング状態取得
router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT onboarding_state FROM staff WHERE id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'スタッフが見つかりません' });
      return;
    }

    const state = result.rows[0].onboarding_state ?? {
      role: null,
      setup: { line: 'not_started', google_calendar: 'not_started' },
      completedHints: [],
      dismissed: false,
      firstLoginAt: null,
    };

    // 初回ログイン記録
    if (!state.firstLoginAt) {
      state.firstLoginAt = new Date().toISOString();
      await pool.query(
        `UPDATE staff SET onboarding_state = onboarding_state || $1 WHERE id = $2`,
        [JSON.stringify({ firstLoginAt: state.firstLoginAt }), req.userId]
      );
    }

    res.json(state);
  } catch (error) {
    sendServerError(res, 'オンボーディング状態の取得に失敗しました', error);
  }
});

// オンボーディング状態更新（マージ更新）
router.patch('/', async (req: AuthRequest, res) => {
  try {
    const { role, setup, dismissed } = req.body;

    // バリデーション
    if (role !== undefined && !['admin', 'staff', null].includes(role)) {
      sendBadRequest(res, '無効な役割です');
      return;
    }

    if (setup !== undefined) {
      const validStatuses = ['not_started', 'in_progress', 'completed', 'skipped'];
      if (setup.line && !validStatuses.includes(setup.line)) {
        sendBadRequest(res, '無効なLINE連携ステータスです');
        return;
      }
      if (setup.google_calendar && !validStatuses.includes(setup.google_calendar)) {
        sendBadRequest(res, '無効なGoogleカレンダー連携ステータスです');
        return;
      }
    }

    if (dismissed !== undefined && typeof dismissed !== 'boolean') {
      sendBadRequest(res, 'dismissedはboolean値である必要があります');
      return;
    }

    // マージ更新を構築
    const patch: Record<string, unknown> = {};
    if (role !== undefined) patch.role = role;
    if (dismissed !== undefined) patch.dismissed = dismissed;

    if (setup) {
      // setup はネストされたオブジェクトなので個別に更新
      const currentResult = await pool.query(
        `SELECT onboarding_state->'setup' as current_setup FROM staff WHERE id = $1`,
        [req.userId]
      );
      const currentSetup = currentResult.rows[0]?.current_setup ?? {};
      patch.setup = { ...currentSetup, ...setup };
    }

    const result = await pool.query(
      `UPDATE staff
       SET onboarding_state = COALESCE(onboarding_state, '{}'::jsonb) || $1::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING onboarding_state`,
      [JSON.stringify(patch), req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'スタッフが見つかりません' });
      return;
    }

    res.json(result.rows[0].onboarding_state);
  } catch (error) {
    sendServerError(res, 'オンボーディング状態の更新に失敗しました', error);
  }
});

// CoachMark表示済みID記録
router.post('/hint-complete', async (req: AuthRequest, res) => {
  try {
    const { hintId } = req.body;

    if (!hintId || typeof hintId !== 'string') {
      sendBadRequest(res, 'hintIdは必須です');
      return;
    }

    // completedHints配列に追加（重複なし）
    const result = await pool.query(
      `UPDATE staff
       SET onboarding_state = jsonb_set(
         COALESCE(onboarding_state, '{}'::jsonb),
         '{completedHints}',
         (
           SELECT COALESCE(onboarding_state->'completedHints', '[]'::jsonb) || to_jsonb($1::text)
           FROM staff WHERE id = $2
         )
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       AND NOT (COALESCE(onboarding_state->'completedHints', '[]'::jsonb) ? $1)
       RETURNING onboarding_state`,
      [hintId, req.userId]
    );

    // 既に記録済みの場合は現在の状態を返す
    if (result.rows.length === 0) {
      const current = await pool.query(
        `SELECT onboarding_state FROM staff WHERE id = $1`,
        [req.userId]
      );
      res.json(current.rows[0]?.onboarding_state ?? {});
      return;
    }

    res.json(result.rows[0].onboarding_state);
  } catch (error) {
    sendServerError(res, 'ヒント完了の記録に失敗しました', error);
  }
});

export default router;
