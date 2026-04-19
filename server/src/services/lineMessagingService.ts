import { Client } from '@line/bot-sdk';
import type { Message, FlexMessage } from '@line/bot-sdk';
import pool from '../db/connection.js';
import { decrypt } from '../utils/encryption.js';

// 店舗ごとのLINEクライアントをキャッシュ
const storeLineClients: Map<number, Client> = new Map();

export type LineConnectionSource = 'store' | 'trial_env' | 'none';

export interface StoreLineConnectionStatus {
  connected: boolean;
  isTrial: boolean;
  source: LineConnectionSource;
  missing: string[];
  channelId: string | null;
}

export interface LineSendResult {
  sent: boolean;
  reason?: string;
}

export interface LineCredentialValidationInput {
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
}

export interface LineCredentialValidationResult {
  ok: boolean;
  kind: 'valid' | 'invalid' | 'network_error';
  message?: string;
  statusCode?: number;
  botInfo?: {
    userId?: string;
    basicId?: string;
    displayName?: string;
  };
}

type StoreLineCredentials = {
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
};

type StoreLineRow = {
  line_channel_id: string | null;
  line_channel_secret: string | null;
  line_channel_access_token: string | null;
  is_trial: boolean;
};

const TRIAL_LINE_ENV_MAP = [
  { key: 'TRIAL_LINE_CHANNEL_ID', label: 'TRIAL_LINE_CHANNEL_ID' },
  { key: 'TRIAL_LINE_CHANNEL_SECRET', label: 'TRIAL_LINE_CHANNEL_SECRET' },
  { key: 'TRIAL_LINE_CHANNEL_ACCESS_TOKEN', label: 'TRIAL_LINE_CHANNEL_ACCESS_TOKEN' },
] as const;

async function fetchStoreLineRow(storeId: number): Promise<StoreLineRow | null> {
  const result = await pool.query<StoreLineRow>(
    `SELECT line_channel_id, line_channel_secret, line_channel_access_token, is_trial
     FROM stores
     WHERE id = $1`,
    [storeId]
  );

  return result.rows[0] ?? null;
}

export async function getStoreLineConnectionStatus(storeId: number): Promise<StoreLineConnectionStatus | null> {
  try {
    const store = await fetchStoreLineRow(storeId);
    if (!store) {
      console.warn(`店舗ID ${storeId} が見つかりません`);
      return null;
    }

    if (store.is_trial) {
      const missing = TRIAL_LINE_ENV_MAP
        .filter(({ key }) => !process.env[key])
        .map(({ label }) => label);

      return {
        connected: missing.length === 0,
        isTrial: true,
        source: missing.length === 0 ? 'trial_env' : 'none',
        missing,
        channelId: missing.length === 0 ? process.env.TRIAL_LINE_CHANNEL_ID ?? null : null,
      };
    }

    const missing: string[] = [];
    if (!store.line_channel_id) missing.push('Channel ID');
    if (!store.line_channel_secret) missing.push('Channel Secret');
    if (!store.line_channel_access_token) missing.push('Channel Access Token');

    return {
      connected: missing.length === 0,
      isTrial: false,
      source: missing.length === 0 ? 'store' : 'none',
      missing,
      channelId: store.line_channel_id,
    };
  } catch (error) {
    console.error(`店舗ID ${storeId} のLINE接続状態取得エラー:`, error);
    return null;
  }
}

export function describeLineConnectionIssue(status: StoreLineConnectionStatus | null): string {
  if (!status) {
    return 'LINE認証情報を取得できません';
  }

  if (status.connected) {
    return 'LINE送信に失敗しました';
  }

  if (status.isTrial) {
    return status.missing.length > 0
      ? `トライアルLINE認証情報が未設定です: ${status.missing.join(', ')}`
      : 'トライアルLINE認証情報が未設定です';
  }

  return status.missing.length > 0
    ? `LINE認証情報が不足しています: ${status.missing.join(', ')}`
    : 'LINE認証情報が不足しています';
}

export async function validateLineCredentials(
  input: LineCredentialValidationInput
): Promise<LineCredentialValidationResult> {
  const channelId = input.channelId.trim();
  const channelSecret = input.channelSecret.trim();
  const channelAccessToken = input.channelAccessToken.trim();

  if (!channelId) {
    return {
      ok: false,
      kind: 'invalid',
      message: '有効なLINEチャネルIDを入力してください',
    };
  }

  if (!channelSecret) {
    return {
      ok: false,
      kind: 'invalid',
      message: '有効なLINEチャネルシークレットを入力してください',
    };
  }

  if (!channelAccessToken) {
    return {
      ok: false,
      kind: 'invalid',
      message: '有効なLINEチャネルアクセストークンを入力してください',
    };
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/info', {
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
      },
    });

    if (response.ok) {
      const botInfo = await response.json() as LineCredentialValidationResult['botInfo'];
      return {
        ok: true,
        kind: 'valid',
        botInfo,
      };
    }

    const responseBody = await response.text().catch(() => '');

    let message = 'LINE認証情報を確認してください';
    let kind: LineCredentialValidationResult['kind'] = 'invalid';

    if (response.status === 400) {
      message = 'LINEチャネルアクセストークンの形式が不正です';
    } else if (response.status === 401 || response.status === 403) {
      message = 'LINEチャネルアクセストークンが無効です';
    } else if (response.status === 429) {
      message = 'LINE APIの利用制限に達しました。少し時間をおいて再試行してください';
      kind = 'network_error';
    } else if (response.status >= 500) {
      message = 'LINE API側でエラーが発生しました。少し時間をおいて再試行してください';
      kind = 'network_error';
    }

    if (responseBody) {
      console.warn('LINE credential validation failed:', response.status, responseBody);
    }

    return {
      ok: false,
      kind,
      message,
      statusCode: response.status,
    };
  } catch (error) {
    console.error('LINE credential validation request failed:', error);
    return {
      ok: false,
      kind: 'network_error',
      message: 'LINE APIへの接続に失敗しました。時間をおいて再試行してください',
    };
  }
}

/**
 * 店舗のLINE認証情報を取得
 */
async function getStoreLineCredentials(storeId: number): Promise<StoreLineCredentials | null> {
  try {
    const store = await fetchStoreLineRow(storeId);
    if (!store) {
      console.warn(`店舗ID ${storeId} が見つかりません`);
      return null;
    }

    // トライアルモードの場合は環境変数からトライアル用credential返却
    if (store.is_trial) {
      const trialChannelId = process.env.TRIAL_LINE_CHANNEL_ID;
      const trialChannelSecret = process.env.TRIAL_LINE_CHANNEL_SECRET;
      const trialAccessToken = process.env.TRIAL_LINE_CHANNEL_ACCESS_TOKEN;

      if (!trialChannelId || !trialChannelSecret || !trialAccessToken) {
        console.warn('トライアル用LINE認証情報が環境変数に設定されていません');
        return null;
      }

      return {
        channelId: trialChannelId,
        channelSecret: trialChannelSecret,
        channelAccessToken: trialAccessToken,
      };
    }

    // 本契約の場合は従来通りDBから復号して返却
    if (!store.line_channel_id || !store.line_channel_secret || !store.line_channel_access_token) {
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
): Promise<LineSendResult> {
  try {
    const status = await getStoreLineConnectionStatus(storeId);
    if (!status?.connected) {
      const reason = describeLineConnectionIssue(status);
      console.warn(`店舗ID ${storeId} のLINEクライアントが初期化されていません: ${reason}`);
      return { sent: false, reason };
    }

    const client = await getStoreLineClient(storeId);
    if (!client) {
      const reason = describeLineConnectionIssue(status);
      console.warn(`店舗ID ${storeId} のLINEクライアントが初期化されていません: ${reason}`);
      return { sent: false, reason };
    }

    await client.pushMessage(lineUserId, message, false);
    return { sent: true };
  } catch (error) {
    console.error(`Error sending LINE ${label}:`, error);
    const statusCode = (error as { statusCode?: number })?.statusCode;
    if (statusCode === 400) {
      const originalData = (error as { originalError?: { response?: { data?: unknown } } })?.originalError?.response?.data;
      console.error('LINE API Error:', originalData);
    }
    return {
      sent: false,
      reason: error instanceof Error ? error.message : 'LINE APIエラーが発生しました',
    };
  }
}

async function pushWithClientLegacy(
  storeId: number,
  lineUserId: string,
  message: Message | Message[],
  label: string
): Promise<boolean> {
  const result = await pushWithClient(storeId, lineUserId, message, label);
  return result.sent;
}

/**
 * LINEテキストメッセージを送信（マルチテナント対応）
 */
export async function sendLineMessage(
  storeId: number,
  lineUserId: string,
  message: string
): Promise<boolean> {
  return pushWithClientLegacy(storeId, lineUserId, { type: 'text', text: message }, 'message');
}

export async function sendLineMessageDetailed(
  storeId: number,
  lineUserId: string,
  message: string
): Promise<LineSendResult> {
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
  return pushWithClientLegacy(storeId, lineUserId, messages, 'messages');
}

/**
 * LINE Flexメッセージを送信（マルチテナント対応）
 */
export async function sendLineFlexMessage(
  storeId: number,
  lineUserId: string,
  flexMessage: FlexMessage
): Promise<boolean> {
  return pushWithClientLegacy(storeId, lineUserId, flexMessage, 'flex message');
}

export async function sendLineFlexMessageDetailed(
  storeId: number,
  lineUserId: string,
  flexMessage: FlexMessage
): Promise<LineSendResult> {
  return pushWithClient(storeId, lineUserId, flexMessage, 'flex message');
}

export interface LineUserProfile {
  userId: string;
  displayName?: string;
  pictureUrl?: string;
  statusMessage?: string;
}

/**
 * 店舗のLINEクライアント経由でLINEユーザーのプロフィールを取得する。
 * 飼い主候補一覧などで表示名を添えるために使用。
 */
export async function fetchLineUserProfile(
  storeId: number,
  lineUserId: string
): Promise<LineUserProfile | null> {
  try {
    const client = await getStoreLineClient(storeId);
    if (!client) return null;

    const profile = await client.getProfile(lineUserId);
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
    };
  } catch (error) {
    console.warn(`LINEプロフィール取得失敗 store_id=${storeId} line_user_id=${lineUserId}:`, error);
    return null;
  }
}
