import { Client } from '@line/bot-sdk';
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

    if (result.rows.length === 0) {
      console.warn(`店舗ID ${storeId} が見つかりません`);
      return null;
    }

    const store = result.rows[0];
    
    if (!store.line_channel_id || !store.line_channel_secret || !store.line_channel_access_token) {
      console.warn(`店舗ID ${storeId} のLINE認証情報が設定されていません`);
      return null;
    }

    try {
      // 暗号化されたシークレットとアクセストークンを復号化
      const decryptedSecret = decrypt(store.line_channel_secret);
      const decryptedToken = decrypt(store.line_channel_access_token);

      return {
        channelId: store.line_channel_id,
        channelSecret: decryptedSecret,
        channelAccessToken: decryptedToken,
      };
    } catch (error) {
      console.error(`店舗ID ${storeId} のLINE認証情報の復号化に失敗しました:`, error);
      return null;
    }
  } catch (error) {
    console.error(`店舗ID ${storeId} のLINE認証情報取得エラー:`, error);
    return null;
  }
}

/**
 * 店舗ごとのLINEクライアントを取得（キャッシュあり）
 */
export async function getStoreLineClient(storeId: number): Promise<Client | null> {
  // キャッシュにあればそれを返す
  if (storeLineClients.has(storeId)) {
    return storeLineClients.get(storeId)!;
  }

  const credentials = await getStoreLineCredentials(storeId);
  if (!credentials) {
    return null;
  }

  const client = new Client({
    channelAccessToken: credentials.channelAccessToken,
    channelSecret: credentials.channelSecret,
  });

  // キャッシュに保存
  storeLineClients.set(storeId, client);

  return client;
}

/**
 * 店舗のLINEクライアントキャッシュをクリア（認証情報更新時に使用）
 */
export function clearStoreLineClientCache(storeId?: number) {
  if (storeId) {
    storeLineClients.delete(storeId);
  } else {
    storeLineClients.clear();
  }
}

/**
 * LINEメッセージを送信（マルチテナント対応）
 */
export async function sendLineMessage(
  storeId: number,
  lineUserId: string,
  message: string
): Promise<boolean> {
  try {
    const client = await getStoreLineClient(storeId);
    if (!client) {
      console.warn(`店舗ID ${storeId} のLINEクライアントが初期化されていません`);
      return false;
    }

    await client.pushMessage(lineUserId, {
      type: 'text',
      text: message,
    }, false);

    return true;
  } catch (error: any) {
    console.error('Error sending LINE message:', error);
    if (error.statusCode === 400) {
      console.error('LINE API Error:', error.originalError?.response?.data);
    }
    return false;
  }
}

/**
 * 複数のLINEメッセージを送信（マルチテナント対応）
 */
export async function sendLineMessages(
  storeId: number,
  lineUserId: string,
  messages: Array<{ type: string; text?: string; [key: string]: any }>
): Promise<boolean> {
  try {
    const client = await getStoreLineClient(storeId);
    if (!client) {
      console.warn(`店舗ID ${storeId} のLINEクライアントが初期化されていません`);
      return false;
    }

    await client.pushMessage(lineUserId, messages as any, false);

    return true;
  } catch (error: any) {
    console.error('Error sending LINE messages:', error);
    return false;
  }
}

/**
 * LINE Flexメッセージを送信（マルチテナント対応）
 */
export async function sendLineFlexMessage(
  storeId: number,
  lineUserId: string,
  flexMessage: { type: string; altText: string; contents: any; quickReply?: any }
): Promise<boolean> {
  try {
    const client = await getStoreLineClient(storeId);
    if (!client) {
      console.warn(`店舗ID ${storeId} のLINEクライアントが初期化されていません`);
      return false;
    }

    await client.pushMessage(lineUserId, flexMessage as any, false);

    return true;
  } catch (error: any) {
    console.error('Error sending LINE flex message:', error);
    if (error.statusCode === 400) {
      console.error('LINE API Error:', error.originalError?.response?.data);
    }
    return false;
  }
}

/**
 * 飼い主のLINE IDを取得
 */
export async function getOwnerLineId(ownerId: number): Promise<string | null> {
  try {
    const result = await pool.query(
      `SELECT line_id FROM owners WHERE id = $1 AND line_id IS NOT NULL`,
      [ownerId]
    );

    return result.rows[0]?.line_id || null;
  } catch (error) {
    console.error('Error fetching owner LINE ID:', error);
    return null;
  }
}
