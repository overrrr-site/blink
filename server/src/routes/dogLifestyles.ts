import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  requireStoreId,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
} from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

const REST_ENV = new Set(['circle', 'bed_only', 'crate', 'none']);
const TOILET_ENV = new Set(['sheet_only', 'tray_with_mesh', 'tray_no_mesh', 'outside']);
const TOILET_TRAINING = new Set(['voluntary', 'on_command', 'many_failures']);
const PRAISE = new Set(['iiko', 'good', 'other']);
const TOILET_SIGNAL = new Set(['wantsu', 'toilet', 'other']);
const TREAT = new Set(['kong_paste', 'churu', 'k9_natural', 'cheese', 'other', 'none']);

function sanitizeStringArray(value: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && allowed.has(v));
}

function sanitizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function sanitizeOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

function sanitizeOptionalTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.test(t)) return null;
  return t.length === 5 ? `${t}:00` : t;
}

function sanitizeToiletEnvironments(body: Record<string, unknown>): string[] {
  const environments = sanitizeStringArray(body.toilet_environments, TOILET_ENV);
  if (environments.length > 0) return environments;

  const legacyEnvironment = sanitizeOptionalString(body.toilet_environment);
  return legacyEnvironment && TOILET_ENV.has(legacyEnvironment) ? [legacyEnvironment] : [];
}

async function ensureDogBelongsToStore(dogId: number, storeId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT d.id FROM dogs d
     JOIN owners o ON d.owner_id = o.id
     WHERE d.id = $1 AND o.store_id = $2 AND d.deleted_at IS NULL`,
    [dogId, storeId]
  );
  return result.rows.length > 0;
}

// 取得
router.get('/:dogId', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const dogId = Number(req.params.dogId);
    if (!Number.isInteger(dogId) || dogId <= 0) {
      sendBadRequest(res, 'dogId が不正です');
      return;
    }
    if (!(await ensureDogBelongsToStore(dogId, req.storeId!))) {
      sendForbidden(res);
      return;
    }
    const result = await pool.query(`SELECT * FROM dog_lifestyles WHERE dog_id = $1`, [dogId]);
    if (result.rows.length === 0) {
      sendNotFound(res, '生活情報がまだ登録されていません');
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '生活情報の取得に失敗しました', error);
  }
});

// 作成・更新（UPSERT）
router.put('/:dogId', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const dogId = Number(req.params.dogId);
    if (!Number.isInteger(dogId) || dogId <= 0) {
      sendBadRequest(res, 'dogId が不正です');
      return;
    }
    if (!(await ensureDogBelongsToStore(dogId, req.storeId!))) {
      sendForbidden(res);
      return;
    }

    const body = req.body as Record<string, unknown>;
    const payload = {
      praise_words: sanitizeStringArray(body.praise_words, PRAISE),
      praise_words_other: sanitizeOptionalString(body.praise_words_other),
      toilet_signal: sanitizeStringArray(body.toilet_signal, TOILET_SIGNAL),
      toilet_signal_other: sanitizeOptionalString(body.toilet_signal_other),
      rest_environments: sanitizeStringArray(body.rest_environments, REST_ENV),
      toilet_environments: sanitizeToiletEnvironments(body),
      toilet_training: sanitizeStringArray(body.toilet_training, TOILET_TRAINING),
      urination_count_per_day: sanitizeOptionalInt(body.urination_count_per_day),
      defecation_count_per_day: sanitizeOptionalInt(body.defecation_count_per_day),
      toilet_timing_notes: sanitizeOptionalString(body.toilet_timing_notes),
      has_lunch: body.has_lunch === true,
      lunch_time: sanitizeOptionalTime(body.lunch_time),
      treat_experience: sanitizeStringArray(body.treat_experience, TREAT),
      treat_other_notes: sanitizeOptionalString(body.treat_other_notes),
      other_concerns: sanitizeOptionalString(body.other_concerns),
    };

    const result = await pool.query(
      `INSERT INTO dog_lifestyles (
        dog_id, praise_words, praise_words_other, toilet_signal, toilet_signal_other,
        rest_environments, toilet_environments, toilet_training,
        urination_count_per_day, defecation_count_per_day, toilet_timing_notes,
        has_lunch, lunch_time, treat_experience, treat_other_notes, other_concerns
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (dog_id) DO UPDATE SET
        praise_words = EXCLUDED.praise_words,
        praise_words_other = EXCLUDED.praise_words_other,
        toilet_signal = EXCLUDED.toilet_signal,
        toilet_signal_other = EXCLUDED.toilet_signal_other,
        rest_environments = EXCLUDED.rest_environments,
        toilet_environments = EXCLUDED.toilet_environments,
        toilet_training = EXCLUDED.toilet_training,
        urination_count_per_day = EXCLUDED.urination_count_per_day,
        defecation_count_per_day = EXCLUDED.defecation_count_per_day,
        toilet_timing_notes = EXCLUDED.toilet_timing_notes,
        has_lunch = EXCLUDED.has_lunch,
        lunch_time = EXCLUDED.lunch_time,
        treat_experience = EXCLUDED.treat_experience,
        treat_other_notes = EXCLUDED.treat_other_notes,
        other_concerns = EXCLUDED.other_concerns,
        updated_at = NOW()
      RETURNING *`,
      [
        dogId,
        payload.praise_words,
        payload.praise_words_other,
        payload.toilet_signal,
        payload.toilet_signal_other,
        payload.rest_environments,
        payload.toilet_environments,
        payload.toilet_training,
        payload.urination_count_per_day,
        payload.defecation_count_per_day,
        payload.toilet_timing_notes,
        payload.has_lunch,
        payload.lunch_time,
        payload.treat_experience,
        payload.treat_other_notes,
        payload.other_concerns,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '生活情報の保存に失敗しました', error);
  }
});

export default router;
