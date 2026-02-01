import { Client } from '@line/bot-sdk';
import type { Message, FlexMessage } from '@line/bot-sdk';
import pool from '../db/connection.js';
import { decrypt } from '../utils/encryption.js';

// 店舗ごとのLINEクライアントをキャッシュ
const storeLineClients: Map<number, Client> = new Map();

/**
 * 店舗のLINE認証情報を取得
 */
async function getStoreLineCredentials(storeId: number): Promise<{
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
} | null> {
  try {
    const result = await pool.query(
      `SELECT line_channel_id, line_channel_secret, line_channel_access_token
       FROM stores
       WHERE id = $1`,
      [storeId]
    );

    const store = result.rows[0];
    if (!store?.line_channel_id || !store.line_channel_secret || !store.line_channel_access_token) {
      console.warn(`店舗ID ${storeId} のLINE認証情報が見つからないか未設定です`);
      return null;
    }

    return {
      channelId: store.line_channel_id,
      channelSecret: decrypt(store.line_channel_secret),
      channelAccessToken: decrypt(store.line_channel_access_token),
    };
  } catch (error) {
    console.error(`店舗ID ${storeId} のLINE認証情報取得エラー:`, error);
    return null;
  }
}

/**
 * 店舗ごとのLINEクライアントを取得（キャッシュあり）
 */
export async function getStoreLineClient(storeId: number): Promise<Client | null> {
  const cached = storeLineClients.get(storeId);
  if (cached) return cached;

  const credentials = await getStoreLineCredentials(storeId);
  if (!credentials) return null;

  const client = new Client({
    channelAccessToken: credentials.channelAccessToken,
    channelSecret: credentials.channelSecret,
  });

  storeLineClients.set(storeId, client);
  return client;
}

/**
 * 店舗のLINEクライアントキャッシュをクリア（認証情報更新時に使用）
 */
export function clearStoreLineClientCache(storeId?: number): void {
  if (storeId) {
    storeLineClients.delete(storeId);
  } else {
    storeLineClients.clear();
  }
}

/**
 * LINEクライアントを取得してメッセージを送信する共通処理。
 * クライアント取得失敗・送信エラーをハンドリングし boolean を返す。
 */
async function pushWithClient(
  storeId: number,
  lineUserId: string,
  message: Message | Message[],
  label: string
): Promise<boolean> {
  try {
    const client = await getStoreLineClient(storeId);
    if (!client) {
      console.warn(`店舗ID ${storeId} のLINEクライアントが初期化されていません`);
      return false;
    }

    await client.pushMessage(lineUserId, message, false);
    return true;
  } catch (error) {
    console.error(`Error sending LINE ${label}:`, error);
    const statusCode = (error as { statusCode?: number })?.statusCode;
    if (statusCode === 400) {
      const originalData = (error as { originalError?: { response?: { data?: unknown } } })?.originalError?.response?.data;
      console.error('LINE API Error:', originalData);
    }
    return false;
  }
}

/**
 * LINEテキストメッセージを送信（マルチテナント対応）
 */
export async function sendLineMessage(
  storeId: number,
  lineUserId: string,
  message: string
): Promise<boolean> {
  return pushWithClient(storeId, lineUserId, { type: 'text', text: message }, 'message');
}

/**
 * 複数のLINEメッセージを送信（マルチテナント対応）
 */
export async function sendLineMessages(
  storeId: number,
  lineUserId: string,
  messages: Message[]
): Promise<boolean> {
  return pushWithClient(storeId, lineUserId, messages, 'messages');
}

/**
 * LINE Flexメッセージを送信（マルチテナント対応）
 */
export async function sendLineFlexMessage(
  storeId: number,
  lineUserId: string,
  flexMessage: FlexMessage
): Promise<boolean> {
  return pushWithClient(storeId, lineUserId, flexMessage, 'flex message');
}

