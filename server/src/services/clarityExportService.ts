import pool from '../db/connection.js';

const DEFAULT_CLARITY_API_URL = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';
const DEFAULT_SYNC_INTERVAL_MINUTES = 180;
const DEFAULT_NUM_OF_DAYS = 1;
const DEFAULT_MAX_AGE_HOURS = 168;
const DEFAULT_DIMENSION_1 = 'URL';
const DEFAULT_DIMENSION_2 = 'Device';
const DEFAULT_DIMENSION_3 = 'OS';

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getNumOfDays(): number {
  return clamp(toPositiveInt(process.env.CLARITY_EXPORT_NUM_OF_DAYS, DEFAULT_NUM_OF_DAYS), 1, 3);
}

function getSyncIntervalMinutes(): number {
  return toPositiveInt(process.env.CLARITY_EXPORT_SYNC_INTERVAL_MINUTES, DEFAULT_SYNC_INTERVAL_MINUTES);
}

function getMaxAgeHours(): number {
  return toPositiveInt(process.env.CLARITY_EXPORT_MAX_AGE_HOURS, DEFAULT_MAX_AGE_HOURS);
}

function getDimensions(): { dimension1: string; dimension2: string; dimension3: string } {
  return {
    dimension1: process.env.CLARITY_EXPORT_DIMENSION1 || DEFAULT_DIMENSION_1,
    dimension2: process.env.CLARITY_EXPORT_DIMENSION2 || DEFAULT_DIMENSION_2,
    dimension3: process.env.CLARITY_EXPORT_DIMENSION3 || DEFAULT_DIMENSION_3,
  };
}

function getApiConfig(): { apiUrl: string; token: string | null } {
  return {
    apiUrl: process.env.CLARITY_EXPORT_API_URL || DEFAULT_CLARITY_API_URL,
    token: process.env.CLARITY_EXPORT_API_TOKEN || null,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

interface ClaritySnapshotRow {
  id: number;
  source: string;
  num_of_days: number;
  dimension1: string | null;
  dimension2: string | null;
  dimension3: string | null;
  payload: unknown;
  fetched_at: string;
}

export interface ClaritySnapshot {
  id: number;
  source: string;
  numOfDays: number;
  dimension1: string | null;
  dimension2: string | null;
  dimension3: string | null;
  payload: unknown;
  fetchedAt: string;
}

export interface ClaritySyncResult {
  synced: boolean;
  reason: 'synced' | 'not_configured' | 'interval_not_reached' | 'request_failed';
  snapshotId: number | null;
  fetchedAt: string | null;
  message?: string;
}

function mapSnapshotRow(row: ClaritySnapshotRow): ClaritySnapshot {
  return {
    id: row.id,
    source: row.source,
    numOfDays: row.num_of_days,
    dimension1: row.dimension1,
    dimension2: row.dimension2,
    dimension3: row.dimension3,
    payload: row.payload,
    fetchedAt: row.fetched_at,
  };
}

async function fetchClarityLiveInsights(): Promise<unknown> {
  const { apiUrl, token } = getApiConfig();
  if (!token) {
    throw new Error('CLARITY_EXPORT_API_TOKEN is not configured');
  }

  const { dimension1, dimension2, dimension3 } = getDimensions();
  const body = {
    numOfDays: getNumOfDays(),
    dimension1,
    dimension2,
    dimension3,
  };

  const timeoutMs = toPositiveInt(process.env.CLARITY_EXPORT_TIMEOUT_MS, 15000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }

    if (!response.ok) {
      throw new Error(`Clarity API error: ${response.status}`);
    }
    return parsed;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getLatestSnapshotRow(): Promise<ClaritySnapshotRow | null> {
  const result = await pool.query<ClaritySnapshotRow>(
    `SELECT id, source, num_of_days, dimension1, dimension2, dimension3, payload, fetched_at
     FROM clarity_export_snapshots
     ORDER BY fetched_at DESC
     LIMIT 1`,
  );
  return result.rows[0] ?? null;
}

async function saveSnapshot(payload: unknown): Promise<ClaritySnapshotRow> {
  const { dimension1, dimension2, dimension3 } = getDimensions();
  const numOfDays = getNumOfDays();
  const result = await pool.query<ClaritySnapshotRow>(
    `INSERT INTO clarity_export_snapshots (
      source,
      num_of_days,
      dimension1,
      dimension2,
      dimension3,
      payload
    ) VALUES ('project-live-insights', $1, $2, $3, $4, $5::jsonb)
    RETURNING id, source, num_of_days, dimension1, dimension2, dimension3, payload, fetched_at`,
    [numOfDays, dimension1, dimension2, dimension3, JSON.stringify(payload)],
  );
  return result.rows[0];
}

export async function syncClarityInsightsIfDue(): Promise<ClaritySyncResult> {
  const { token } = getApiConfig();
  if (!token) {
    return {
      synced: false,
      reason: 'not_configured',
      snapshotId: null,
      fetchedAt: null,
      message: 'CLARITY_EXPORT_API_TOKEN が未設定のため同期をスキップしました',
    };
  }

  const latest = await getLatestSnapshotRow();
  const intervalMinutes = getSyncIntervalMinutes();

  if (latest) {
    const diffMs = Date.now() - new Date(latest.fetched_at).getTime();
    const minIntervalMs = intervalMinutes * 60 * 1000;
    if (diffMs < minIntervalMs) {
      return {
        synced: false,
        reason: 'interval_not_reached',
        snapshotId: latest.id,
        fetchedAt: latest.fetched_at,
        message: `前回同期から${intervalMinutes}分未満のためスキップ`,
      };
    }
  }

  try {
    const payload = await fetchClarityLiveInsights();
    if (!isObject(payload) && !Array.isArray(payload)) {
      throw new Error('Clarityレスポンスが不正です');
    }
    const saved = await saveSnapshot(payload);
    return {
      synced: true,
      reason: 'synced',
      snapshotId: saved.id,
      fetchedAt: saved.fetched_at,
    };
  } catch (error) {
    return {
      synced: false,
      reason: 'request_failed',
      snapshotId: null,
      fetchedAt: null,
      message: error instanceof Error ? error.message : 'unknown error',
    };
  }
}

export async function getLatestClaritySnapshot(): Promise<ClaritySnapshot | null> {
  const maxAgeHours = getMaxAgeHours();
  const result = await pool.query<ClaritySnapshotRow>(
    `SELECT id, source, num_of_days, dimension1, dimension2, dimension3, payload, fetched_at
     FROM clarity_export_snapshots
     WHERE fetched_at >= NOW() - ($1 * INTERVAL '1 hour')
     ORDER BY fetched_at DESC
     LIMIT 1`,
    [maxAgeHours],
  );
  const row = result.rows[0];
  return row ? mapSnapshotRow(row) : null;
}

