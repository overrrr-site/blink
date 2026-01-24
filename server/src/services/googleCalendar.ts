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
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: storeId.toString(), // storeIdをstateに含める
    prompt: 'consent', // refresh_tokenを取得するために必要
  });

  return url;
}

/**
 * トークンを交換して保存
 */
export async function saveTokens(storeId: number, code: string) {
  const oauth2Client = createOAuth2Client();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error('アクセストークンが取得できませんでした');
    }

    // カレンダーIDを取得（プライマリカレンダーを使用）
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarList = await calendar.calendarList.list();
    const primaryCalendar = calendarList.data.items?.find(cal => cal.primary) || calendarList.data.items?.[0];

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
  } catch (error) {
    console.error('Error saving tokens:', error);
    throw error;
  }
}

/**
 * トークンをリフレッシュ
 */
async function refreshToken(integration: any) {
  const oauth2Client = createOAuth2Client();
  
  // 暗号化されたリフレッシュトークンを復号化
  let decryptedRefreshToken: string;
  try {
    decryptedRefreshToken = decrypt(integration.refresh_token);
  } catch (error) {
    console.error('Error decrypting refresh token:', error);
    throw new Error('リフレッシュトークンの復号化に失敗しました');
  }
  
  oauth2Client.setCredentials({
    refresh_token: decryptedRefreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // 新しいアクセストークンを暗号化して保存
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
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

/**
 * 認証済みカレンダークライアントを取得
 */
async function getAuthenticatedCalendar(storeId: number) {
  const integration = await getGoogleCalendarIntegration(storeId);
  
  if (!integration) {
    throw new Error('Googleカレンダー連携が設定されていません');
  }

  const oauth2Client = createOAuth2Client();
  
  // 暗号化されたトークンを復号化
  let accessToken: string;
  let refreshToken: string | null = null;
  
  try {
    accessToken = decrypt(integration.access_token);
    if (integration.refresh_token) {
      refreshToken = decrypt(integration.refresh_token);
    }
  } catch (error) {
    console.error('Error decrypting tokens:', error);
    throw new Error('トークンの復号化に失敗しました');
  }
  
  // トークンの有効期限をチェック
  if (integration.token_expiry && new Date(integration.token_expiry) <= new Date()) {
    if (!refreshToken) {
      throw new Error('リフレッシュトークンがありません。再認証が必要です。');
    }
    accessToken = await refreshToken(integration);
  }

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken || undefined,
  });

  return {
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
    calendarId: integration.calendar_id,
  };
}

/**
 * 予約をGoogleカレンダーに作成
 */
export async function createCalendarEvent(storeId: number, reservation: any, dogName: string, ownerName: string) {
  try {
    const { calendar, calendarId } = await getAuthenticatedCalendar(storeId);

    // 日付と時間を結合してISO形式に変換
    const startDateTime = new Date(`${reservation.reservation_date}T${reservation.reservation_time}:00`);
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + 8); // デフォルト8時間

    const event: CalendarEvent = {
      summary: `🐾 ${dogName}（${ownerName}様）`,
      description: `予約ID: ${reservation.id}\n${reservation.memo || ''}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    // イベントIDを保存
    await pool.query(
      `INSERT INTO reservation_calendar_events (reservation_id, calendar_event_id, calendar_id)
       VALUES ($1, $2, $3)`,
      [reservation.id, response.data.id, calendarId]
    );

    return response.data;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

/**
 * Googleカレンダーのイベントを更新
 */
export async function updateCalendarEvent(storeId: number, reservation: any, dogName: string, ownerName: string) {
  try {
    const { calendar, calendarId } = await getAuthenticatedCalendar(storeId);

    // 既存のイベントIDを取得
    const eventResult = await pool.query(
      `SELECT calendar_event_id FROM reservation_calendar_events WHERE reservation_id = $1`,
      [reservation.id]
    );

    if (eventResult.rows.length === 0) {
      // イベントが存在しない場合は新規作成
      return await createCalendarEvent(storeId, reservation, dogName, ownerName);
    }

    const eventId = eventResult.rows[0].calendar_event_id;

    // 既存のイベントを取得
    const existingEvent = await calendar.events.get({
      calendarId,
      eventId,
    });

    // 日付と時間を結合してISO形式に変換
    const startDateTime = new Date(`${reservation.reservation_date}T${reservation.reservation_time}:00`);
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + 8);

    const updatedEvent: CalendarEvent = {
      summary: `🐾 ${dogName}（${ownerName}様）`,
      description: `予約ID: ${reservation.id}\n${reservation.memo || ''}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
    };

    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: updatedEvent,
    });

    return response.data;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

/**
 * Googleカレンダーのイベントを削除
 */
export async function deleteCalendarEvent(storeId: number, reservationId: number) {
  try {
    const { calendar, calendarId } = await getAuthenticatedCalendar(storeId);

    // イベントIDを取得
    const eventResult = await pool.query(
      `SELECT calendar_event_id FROM reservation_calendar_events WHERE reservation_id = $1`,
      [reservationId]
    );

    if (eventResult.rows.length === 0) {
      return; // イベントが存在しない場合は何もしない
    }

    const eventId = eventResult.rows[0].calendar_event_id;

    await calendar.events.delete({
      calendarId,
      eventId,
    });

    // データベースからも削除
    await pool.query(
      `DELETE FROM reservation_calendar_events WHERE reservation_id = $1`,
      [reservationId]
    );
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}

