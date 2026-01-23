import { Client, middleware, MiddlewareConfig } from '@line/bot-sdk';
import pool from '../db/connection.js';

// LINE Messaging APIクライアント
let lineClient: Client | null = null;

export function initializeLineClient() {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelAccessToken || !channelSecret) {
    console.warn('⚠️  LINE Messaging APIの認証情報が設定されていません');
    return null;
  }

  lineClient = new Client({
    channelAccessToken,
    channelSecret,
  });

  return lineClient;
}

/**
 * LINEメッセージを送信
 */
export async function sendLineMessage(
  lineUserId: string,
  message: string,
  altText?: string
): Promise<boolean> {
  try {
    if (!lineClient) {
      const client = initializeLineClient();
      if (!client) {
        console.warn('LINE Messaging APIクライアントが初期化されていません');
        return false;
      }
      lineClient = client;
    }

    await lineClient.pushMessage(lineUserId, {
      type: 'text',
      text: message,
    }, {
      notificationDisabled: false,
    });

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
 * 複数のLINEメッセージを送信
 */
export async function sendLineMessages(
  lineUserId: string,
  messages: Array<{ type: string; text?: string; [key: string]: any }>
): Promise<boolean> {
  try {
    if (!lineClient) {
      const client = initializeLineClient();
      if (!client) {
        console.warn('LINE Messaging APIクライアントが初期化されていません');
        return false;
      }
      lineClient = client;
    }

    await lineClient.pushMessage(lineUserId, messages, {
      notificationDisabled: false,
    });

    return true;
  } catch (error: any) {
    console.error('Error sending LINE messages:', error);
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
