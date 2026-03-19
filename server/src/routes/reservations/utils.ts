import pool from '../../db/connection.js';

export function toIsoDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getMonthDateRange(month: string): { start: string; end: string } | null {
  const [yearPart, monthPart] = month.split('-');
  const year = Number(yearPart);
  const monthNumber = Number(monthPart);

  if (!Number.isFinite(year) || !Number.isFinite(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return null;
  }

  const monthIndex = monthNumber - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));

  return { start: toIsoDateString(start), end: toIsoDateString(end) };
}

export function escapeCsvValue(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ];
  return `\uFEFF${lines.join('\n')}`;
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function normalizeDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})$/);
  return match ? match[1] : null;
}

export function normalizeTime(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
  }
  const text = String(value ?? '').trim();
  const match = text.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? match[0] : null;
}

export function normalizeDateTime(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())} ${pad2(value.getHours())}:${pad2(value.getMinutes())}:${pad2(value.getSeconds())}`;
  }
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})[T\s]([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?/);
  if (!match) {
    return null;
  }
  const [, datePart, hourPart, minutePart, secondPart] = match;
  return `${datePart} ${hourPart}:${minutePart}:${secondPart ?? '00'}`;
}

export function parseDateTimeRange(input: {
  reservationDate: unknown;
  reservationTime: unknown;
  endDatetime?: unknown;
}): { startAt: string; endAt: string } | null {
  const reservationDateText = normalizeDate(input.reservationDate);
  const reservationTimeText = normalizeTime(input.reservationTime);
  if (!reservationDateText || !reservationTimeText) {
    return null;
  }

  const startAtText = `${reservationDateText} ${reservationTimeText}:00`;
  const endAtText = input.endDatetime ? normalizeDateTime(input.endDatetime) : null;
  if (!endAtText) {
    return null;
  }

  const startAt = new Date(`${reservationDateText}T${reservationTimeText}:00`);
  const endAt = new Date(endAtText.replace(' ', 'T'));
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return null;
  }

  if (endAt <= startAt) {
    return null;
  }

  return {
    startAt: startAtText,
    endAt: endAtText,
  };
}

export async function findRoomConflict(params: {
  storeId: number;
  roomId: number;
  startAt: string;
  endAt: string;
  excludeReservationId?: number;
  queryable?: { query: (sql: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> };
}): Promise<number | null> {
  const queryable = params.queryable ?? pool;
  const result = await queryable.query(
    `SELECT id
     FROM reservations
     WHERE store_id = $1
       AND room_id = $2
       AND status != 'キャンセル'
       AND ($3::int IS NULL OR id != $3)
       AND COALESCE(end_datetime, (reservation_date::timestamp + reservation_time::time + INTERVAL '1 day')) > $4::timestamp
       AND (reservation_date::timestamp + reservation_time::time) < $5::timestamp
     ORDER BY reservation_date, reservation_time
     LIMIT 1`,
    [params.storeId, params.roomId, params.excludeReservationId ?? null, params.startAt, params.endAt]
  );

  const id = result.rows[0]?.id;
  return typeof id === 'number' ? id : null;
}
