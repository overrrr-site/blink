import pool from '../db/connection.js';

export const UX_REPORT_SESSION_THRESHOLD = 5;

const ALLOWED_FLOW = new Set(['reservation', 'record']);
const ALLOWED_EVENT_NAMES = new Set([
  'route_view',
  'cta_click',
  'form_error',
  'submit_success',
  'submit_fail',
  'api_slow',
]);
const TERMINAL_EVENT_NAMES = new Set(['submit_success', 'submit_fail']);

const PII_KEY_PATTERNS = [
  /name/i,
  /phone/i,
  /email/i,
  /address/i,
  /memo/i,
  /note/i,
  /comment/i,
  /text/i,
  /dog/i,
];

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_PATTERN = /\b(?:\+?\d{1,3}[-\s]?)?(?:\d{2,4}[-\s]?){2,4}\d{3,4}\b/;
const POSTAL_PATTERN = /\b\d{3}-?\d{4}\b/;
const ADDRESS_PATTERN = /(都|道|府|県|市|区|町|村|丁目|番地|号)/;

export interface UxEventInput {
  event_name: string;
  flow: string;
  step: string;
  session_id: string;
  path: string;
  staff_id_hash: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export class UxValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UxValidationError';
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isPrimitiveMetaValue(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function containsPii(key: string, value: string | number | boolean): boolean {
  const keyMatched = PII_KEY_PATTERNS.some((pattern) => pattern.test(key));
  if (keyMatched) return true;

  if (typeof value !== 'string') return false;
  return (
    EMAIL_PATTERN.test(value)
    || PHONE_PATTERN.test(value)
    || POSTAL_PATTERN.test(value)
    || ADDRESS_PATTERN.test(value)
  );
}

function validateEventInput(input: UxEventInput): void {
  if (!ALLOWED_EVENT_NAMES.has(input.event_name)) {
    throw new UxValidationError('event_nameが不正です');
  }
  if (!ALLOWED_FLOW.has(input.flow)) {
    throw new UxValidationError('flowが不正です');
  }
  if (!input.step || typeof input.step !== 'string' || input.step.length > 128) {
    throw new UxValidationError('stepが不正です');
  }
  if (!input.session_id || typeof input.session_id !== 'string' || input.session_id.length > 128) {
    throw new UxValidationError('session_idが不正です');
  }
  if (!input.path || typeof input.path !== 'string' || input.path.length > 512) {
    throw new UxValidationError('pathが不正です');
  }
  if (!input.staff_id_hash || typeof input.staff_id_hash !== 'string' || input.staff_id_hash.length > 128) {
    throw new UxValidationError('staff_id_hashが不正です');
  }
  const date = new Date(input.timestamp);
  if (Number.isNaN(date.getTime())) {
    throw new UxValidationError('timestampが不正です');
  }

  if (typeof input.meta === 'undefined') return;
  if (!isPlainObject(input.meta)) {
    throw new UxValidationError('metaはオブジェクトで指定してください');
  }

  for (const [key, rawValue] of Object.entries(input.meta)) {
    if (!isPrimitiveMetaValue(rawValue)) {
      throw new UxValidationError('metaには文字列・数値・真偽値のみ指定できます');
    }
    if (containsPii(key, rawValue)) {
      throw new UxValidationError(`PIIに該当する可能性のあるデータが含まれています: ${key}`);
    }
  }
}

function normalizeMeta(meta?: Record<string, unknown>): Record<string, string | number | boolean> {
  if (!meta || !isPlainObject(meta)) return {};
  const normalized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (isPrimitiveMetaValue(value)) {
      normalized[key] = value;
    }
  }
  return normalized;
}

export async function recordUxEvent(input: {
  storeId: number;
  staffId: number | null;
  payload: UxEventInput;
}): Promise<{ queuedJobId: number | null }> {
  validateEventInput(input.payload);

  const clientTimestamp = new Date(input.payload.timestamp);
  const normalizedMeta = normalizeMeta(input.payload.meta);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO ux_events (
        store_id,
        staff_id,
        staff_id_hash,
        flow,
        event_name,
        step,
        session_id,
        path,
        client_timestamp,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
      [
        input.storeId,
        input.staffId,
        input.payload.staff_id_hash,
        input.payload.flow,
        input.payload.event_name,
        input.payload.step,
        input.payload.session_id,
        input.payload.path,
        clientTimestamp.toISOString(),
        JSON.stringify(normalizedMeta),
      ],
    );

    let queuedJobId: number | null = null;
    if (TERMINAL_EVENT_NAMES.has(input.payload.event_name)) {
      const activeJob = await client.query(
        `SELECT id
         FROM ux_report_jobs
         WHERE store_id = $1
           AND status IN ('pending', 'running')
         LIMIT 1`,
        [input.storeId],
      );

      if (activeJob.rows.length === 0) {
        const sessionRows = await client.query<{ session_id: string }>(
          `WITH completed AS (
             SELECT session_id, MAX(created_at) AS last_created_at
             FROM ux_events
             WHERE store_id = $1
               AND report_job_id IS NULL
               AND event_name IN ('submit_success', 'submit_fail')
             GROUP BY session_id
             ORDER BY MAX(created_at) ASC
             LIMIT $2
           )
           SELECT session_id
           FROM completed
           ORDER BY last_created_at ASC`,
          [input.storeId, UX_REPORT_SESSION_THRESHOLD],
        );

        const sessionIds = sessionRows.rows.map((row) => row.session_id);
        if (sessionIds.length === UX_REPORT_SESSION_THRESHOLD) {
          const jobResult = await client.query<{ id: number }>(
            `INSERT INTO ux_report_jobs (
              store_id,
              status,
              session_count,
              session_ids
            ) VALUES ($1, 'pending', $2, to_jsonb($3::text[]))
            RETURNING id`,
            [input.storeId, sessionIds.length, sessionIds],
          );

          queuedJobId = jobResult.rows[0]?.id ?? null;

          if (queuedJobId) {
            await client.query(
              `UPDATE ux_events
               SET report_job_id = $1
               WHERE store_id = $2
                 AND report_job_id IS NULL
                 AND session_id = ANY($3::text[])`,
              [queuedJobId, input.storeId, sessionIds],
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    return { queuedJobId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

