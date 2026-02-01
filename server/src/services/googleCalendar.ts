import { google } from 'googleapis';
import pool from '../db/connection.js';
import { encrypt, decrypt } from '../utils/encryption.js';

interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: 'Asia/Tokyo';
  };
  end: {
    dateTime: string;
    timeZone: 'Asia/Tokyo';
  };
  location?: string;
}

interface ReservationForCalendar {
  id: number;
  reservation_date: string | Date;
  reservation_time?: string;
  memo?: string | null;
}

interface CalendarIntegrationRow {
  id: number;
  store_id: number;
  calendar_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expiry: string | null;
  enabled: boolean;
}

/**
 * Googleカレンダー連携情報を取得
 */
export async function getGoogleCalendarIntegration(storeId: number) {
  const result = await pool.query(
    `SELECT * FROM google_calendar_integrations WHERE store_id = $1 AND enabled = TRUE`,
    [storeId]
  );
  return result.rows[0] || null;
}

/**
 * OAuth2クライアントを作成
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/google-calendar/callback'
  );
}

/**
 * 認証URLを生成
 */
export function getAuthUrl(storeId: number): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    state: storeId.toString(),
    prompt: 'consent',
  });
}

/**
 * トークンを交換して保存
 */
export async function saveTokens(storeId: number, code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error('アクセストークンが取得できませんでした');
  }

  // カレンダーIDを取得（プライマリカレンダーを使用）
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const calendarList = await calendar.calendarList.list();
  const primaryCalendar = calendarList.data.items?.find(cal => cal.primary) ?? calendarList.data.items?.[0];

  if (!primaryCalendar?.id) {
    throw new Error('カレンダーIDが取得できませんでした');
  }

  // データベースに保存（トークンは暗号化）
  await pool.query(
    `INSERT INTO google_calendar_integrations
     (store_id, calendar_id, access_token, refresh_token, token_expiry, enabled)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (store_id)
     DO UPDATE SET
       calendar_id = EXCLUDED.calendar_id,
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       token_expiry = EXCLUDED.token_expiry,
       enabled = EXCLUDED.enabled,
       updated_at = CURRENT_TIMESTAMP`,
    [
      storeId,
      primaryCalendar.id,
      encrypt(tokens.access_token),
      tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      true,
    ]
  );

  return { success: true, calendarId: primaryCalendar.id };
}

/**
 * トークンをリフレッシュ
 */
async function refreshAccessToken(integration: CalendarIntegrationRow) {
  const oauth2Client = createOAuth2Client();

  const decryptedRefreshToken = decrypt(integration.refresh_token);
  oauth2Client.setCredentials({ refresh_token: decryptedRefreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  await pool.query(
    `UPDATE google_calendar_integrations
     SET access_token = $1,
         token_expiry = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [
      encrypt(credentials.access_token),
      credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      integration.id,
    ]
  );

  return credentials.access_token;
}

/**
 * 認証済みカレンダークライアントを取得
 */
async function getAuthenticatedCalendar(storeId: number) {
  const integration = await getGoogleCalendarIntegration(storeId);
  if (!integration) {
    throw new Error('Googleカレンダー連携が設定されていません');
  }

  let accessToken = decrypt(integration.access_token);
  const refreshToken = integration.refresh_token ? decrypt(integration.refresh_token) : null;

  // トークンの有効期限をチェック
  const isExpired = integration.token_expiry && new Date(integration.token_expiry) <= new Date();
  if (isExpired) {
    if (!refreshToken) {
      throw new Error('リフレッシュトークンがありません。再認証が必要です。');
    }
    accessToken = await refreshAccessToken(integration);
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken ?? undefined,
  });

  return {
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
    calendarId: integration.calendar_id,
  };
}

/**
 * 日付を YYYY-MM-DD 形式の文字列に変換
 */
function formatDateToYMD(date: Date | string): string {
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // 文字列の場合はT以前の部分を取得
  return String(date).split('T')[0];
}

/**
 * 時刻文字列を HH:mm 形式に正規化
 * PostgreSQLのTIME型は "09:00:00" のように秒付きで返る場合がある
 */
function formatTimeToHM(time: string): string {
  const parts = String(time).split(':');
  return `${parts[0].padStart(2, '0')}:${(parts[1] || '00').padStart(2, '0')}`;
}

const DEFAULT_EVENT_DURATION_HOURS = 8;

/**
 * 予約データからCalendarEventオブジェクトを構築する
 */
function buildCalendarEvent(
  reservation: ReservationForCalendar,
  dogName: string,
  ownerName: string
): CalendarEvent {
  const dateStr = formatDateToYMD(reservation.reservation_date);
  const timeStr = formatTimeToHM(reservation.reservation_time || '09:00');
  const startDateTime = new Date(`${dateStr}T${timeStr}:00`);
  const endDateTime = new Date(startDateTime);
  endDateTime.setHours(endDateTime.getHours() + DEFAULT_EVENT_DURATION_HOURS);

  return {
    summary: `🐾 ${dogName}（${ownerName}様）`,
    description: `予約ID: ${reservation.id}\n${reservation.memo || ''}`,
    start: { dateTime: startDateTime.toISOString(), timeZone: 'Asia/Tokyo' },
    end: { dateTime: endDateTime.toISOString(), timeZone: 'Asia/Tokyo' },
  };
}

/**
 * 予約に紐づくカレンダーイベントIDを取得する
 */
async function getLinkedCalendarEventId(reservationId: number): Promise<string | null> {
  const result = await pool.query(
    `SELECT calendar_event_id FROM reservation_calendar_events WHERE reservation_id = $1`,
    [reservationId]
  );
  return result.rows[0]?.calendar_event_id ?? null;
}

/**
 * 予約をGoogleカレンダーに作成
 */
export async function createCalendarEvent(
  storeId: number,
  reservation: ReservationForCalendar,
  dogName: string,
  ownerName: string
): Promise<any> {
  const { calendar, calendarId } = await getAuthenticatedCalendar(storeId);
  const event = buildCalendarEvent(reservation, dogName, ownerName);

  const response = await calendar.events.insert({ calendarId, requestBody: event });

  await pool.query(
    `INSERT INTO reservation_calendar_events (reservation_id, calendar_event_id, calendar_id)
     VALUES ($1, $2, $3)`,
    [reservation.id, response.data.id, calendarId]
  );

  return response.data;
}

/**
 * Googleカレンダーのイベントを更新
 */
export async function updateCalendarEvent(
  storeId: number,
  reservation: ReservationForCalendar,
  dogName: string,
  ownerName: string
): Promise<any> {
  const eventId = await getLinkedCalendarEventId(reservation.id);
  if (!eventId) {
    return createCalendarEvent(storeId, reservation, dogName, ownerName);
  }

  const { calendar, calendarId } = await getAuthenticatedCalendar(storeId);
  const event = buildCalendarEvent(reservation, dogName, ownerName);

  const response = await calendar.events.update({ calendarId, eventId, requestBody: event });
  return response.data;
}

/**
 * Googleカレンダーのイベントを削除
 */
export async function deleteCalendarEvent(storeId: number, reservationId: number): Promise<void> {
  const eventId = await getLinkedCalendarEventId(reservationId);
  if (!eventId) return;

  const { calendar, calendarId } = await getAuthenticatedCalendar(storeId);
  await calendar.events.delete({ calendarId, eventId });
  await pool.query(
    `DELETE FROM reservation_calendar_events WHERE reservation_id = $1`,
    [reservationId]
  );
}

