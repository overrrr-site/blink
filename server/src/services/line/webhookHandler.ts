import { Client } from '@line/bot-sdk';
import pool from '../../db/connection.js';
import { getStoreLineClient } from '../lineMessagingService.js';
import { decrypt } from '../../utils/encryption.js';
import { createQuickReply } from '../lineFlexMessages.js';
import { normalizeBusinessTypes, isBusinessType, type BusinessType } from '../../utils/businessTypes.js';
import { verifySignature, sendErrorFallback } from './helpers.js';
import { sendReservations, sendReservationLink, sendReservationMenu, sendCancellableReservations, cancelReservation, confirmCancelReservation } from './reservationCommands.js';
import { sendRecords, sendRecordDetail } from './recordCommands.js';
import { sendContracts } from './contractCommands.js';
import { sendHelp } from './helpCommand.js';
import type { LineEvent, BotContext } from './types.js';

// ---------------------------------------------------------------------------
// Keyword definitions for text message routing (checked in order)
// ---------------------------------------------------------------------------

const KEYWORD_ROUTES: Array<{
  name: string;
  keywords: string[];
}> = [
  {
    name: 'create_reservation',
    keywords: ['予約する', '予約したい', '予約取', '予約とる', '予約とりたい', '予約入れ', '予約いれ', '新しく予約', '新規予約', 'よやくする', 'よやくしたい'],
  },
  {
    name: 'view_reservations',
    keywords: ['予約確認', '予約見', '予約みる', '予約みたい', '予約一覧', '予約いちらん', '次の予約', 'いつ予約', 'よやくかくにん', 'よやくみ'],
  },
  {
    name: 'cancel',
    keywords: ['キャンセル', 'きゃんせる', 'やめる', 'やめたい', '取り消し', '取消', 'とりけし', '予約取消', '予約キャンセル'],
  },
  {
    name: 'record',
    keywords: ['日誌', '日報', 'にっし', 'にっぽう', 'レポート', '報告', '様子', 'ようす', '今日の', 'カルテ', 'かるて', '記録', 'きろく', '宿泊記録'],
  },
  {
    name: 'contract',
    keywords: ['契約', 'けいやく', '残回数', '残り回数', 'のこり', 'あと何回', '回数券', 'チケット'],
  },
  {
    name: 'help',
    keywords: ['ヘルプ', 'へるぷ', 'help', '使い方', 'つかいかた', '？', '?', 'わからない', '教えて', 'おしえて', '何ができる'],
  },
];

function matchTextCommand(normalizedText: string): string {
  for (const route of KEYWORD_ROUTES) {
    if (route.keywords.some((kw) => normalizedText.includes(kw))) {
      return route.name;
    }
  }
  // 「予約」or「よやく」単体 -> 予約メニュー
  if (/^(予約|よやく)[！!]?$/.test(normalizedText)) {
    return 'reservation_menu';
  }
  return 'unknown';
}

/**
 * LINE Webhookイベントを処理（index.tsから呼び出される）
 */
export async function processLineWebhookEvents(
  events: LineEvent[],
  bodyString: string,
  signature: string
): Promise<void> {
  for (const event of events) {
    try {
      // 検証イベント・サポート外イベントはスキップ
      if (event.type === 'verify') continue;
      if (event.type !== 'message' && event.type !== 'postback') continue;

      const lineUserId = event.source?.userId;
      if (!lineUserId) continue;

      // LINE IDから店舗を特定（業種情報含む）
      const ownerResult = await pool.query(
        `SELECT o.id as owner_id, o.store_id, o.business_types as owner_business_types,
                s.line_channel_id, s.line_channel_secret,
                s.primary_business_type, s.business_types as store_business_types
         FROM owners o
         JOIN stores s ON o.store_id = s.id
         WHERE o.line_id = $1
         LIMIT 1`,
        [lineUserId]
      );

      if (ownerResult.rows.length === 0) continue;

      const owner = ownerResult.rows[0];
      if (!owner.line_channel_secret) continue;

      // 署名検証
      const channelSecret = decrypt(owner.line_channel_secret);
      if (!verifySignature(channelSecret, bodyString, signature)) {
        console.warn(`LINE Webhook: 署名検証失敗 (店舗ID: ${owner.store_id})`);
        continue;
      }

      // チャットボット有効チェック
      const botSettingsResult = await pool.query(
        `SELECT line_bot_enabled FROM notification_settings WHERE store_id = $1`,
        [owner.store_id]
      );
      if (!(botSettingsResult.rows[0]?.line_bot_enabled ?? false)) continue;

      // BotContext構築
      const ownerBizTypes = normalizeBusinessTypes(owner.owner_business_types);
      const storeBizTypes = normalizeBusinessTypes(owner.store_business_types);
      const fallbackPrimary: BusinessType = isBusinessType(owner.primary_business_type)
        ? owner.primary_business_type
        : 'daycare';
      const ctx: BotContext = {
        storeId: owner.store_id,
        ownerId: owner.owner_id,
        primaryBusinessType: fallbackPrimary,
        businessTypes: ownerBizTypes.length > 0
          ? ownerBizTypes
          : storeBizTypes.length > 0
            ? storeBizTypes
            : [fallbackPrimary],
      };

      // メッセージ処理
      if (event.replyToken) {
        await handleLineMessage(ctx, lineUserId, event, event.replyToken);
      }
    } catch (error) {
      console.error('LINE Webhook event処理エラー:', error);
    }
  }
}

/**
 * LINEメッセージを処理
 */
export async function handleLineMessage(
  ctx: BotContext,
  lineUserId: string,
  event: LineEvent,
  replyToken: string
): Promise<void> {
  try {
    const client = await getStoreLineClient(ctx.storeId);
    if (!client) {
      console.warn(`店舗ID ${ctx.storeId} のLINEクライアントが初期化されていません`);
      return;
    }

    // Postbackイベント（ボタンタップなど）
    if (event.type === 'postback' && event.postback) {
      await handlePostback(client, ctx, lineUserId, event.postback.data, replyToken);
      return;
    }

    // テキストメッセージ
    if (event.type === 'message' && event.message?.type === 'text') {
      const text = event.message.text.trim();
      await handleTextMessage(client, ctx, lineUserId, text, replyToken);
      return;
    }
  } catch (error) {
    console.error('Error handling LINE message:', error);
  }
}

/**
 * テキストメッセージを処理
 */
async function handleTextMessage(
  client: Client,
  ctx: BotContext,
  lineUserId: string,
  text: string,
  replyToken: string
): Promise<void> {
  const normalizedText = text.toLowerCase().replace(/\s+/g, '');
  const command = matchTextCommand(normalizedText);

  switch (command) {
    case 'create_reservation':
      await sendReservationLink(client, lineUserId, ctx, replyToken);
      break;
    case 'view_reservations':
      await sendReservations(client, lineUserId, ctx, replyToken);
      break;
    case 'reservation_menu':
      await sendReservationMenu(client, lineUserId, ctx, replyToken);
      break;
    case 'cancel':
      await sendCancellableReservations(client, lineUserId, ctx, replyToken);
      break;
    case 'record':
      await sendRecords(client, lineUserId, ctx, replyToken);
      break;
    case 'contract':
      await sendContracts(client, lineUserId, ctx, replyToken);
      break;
    case 'help':
      await sendHelp(client, lineUserId, ctx, replyToken);
      break;
    default:
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '申し訳ございません、メッセージを理解できませんでした。\n\n「ヘルプ」と送信いただくと、使い方をご案内いたします。',
        quickReply: createQuickReply(ctx.businessTypes),
      });
  }
}

/**
 * Postbackイベントを処理（ボタンタップなど）
 */
async function handlePostback(
  client: Client,
  ctx: BotContext,
  lineUserId: string,
  data: string,
  replyToken: string
): Promise<void> {
  try {
    const params = new URLSearchParams(data);
    const action = params.get('action');
    const reservationId = params.get('reservation_id');
    const recordId = params.get('record_id');

    switch (action) {
      case 'cancel_reservation':
        if (reservationId) await cancelReservation(client, lineUserId, ctx, parseInt(reservationId), replyToken);
        break;
      case 'confirm_cancel':
        if (reservationId) await confirmCancelReservation(client, lineUserId, ctx, parseInt(reservationId), replyToken);
        break;
      case 'view_record':
        if (recordId) await sendRecordDetail(client, lineUserId, ctx, parseInt(recordId), replyToken);
        break;
      case 'view_reservations':
        await sendReservations(client, lineUserId, ctx, replyToken);
        break;
      case 'create_reservation':
        await sendReservationLink(client, lineUserId, ctx, replyToken);
        break;
      case 'view_records':
        await sendRecords(client, lineUserId, ctx, replyToken);
        break;
      case 'view_contracts':
        await sendContracts(client, lineUserId, ctx, replyToken);
        break;
      case 'help':
        await sendHelp(client, lineUserId, ctx, replyToken);
        break;
      case 'cancel_menu':
        await sendCancellableReservations(client, lineUserId, ctx, replyToken);
        break;
      case 'cancel':
        await client.replyMessage(replyToken, {
          type: 'text',
          text: '承知しました。また何かございましたらお気軽にどうぞ 😊',
          quickReply: createQuickReply(ctx.businessTypes),
        });
        break;
      default:
        await client.replyMessage(replyToken, {
          type: 'text',
          text: '完了いたしました。他にご用件はございますか？',
          quickReply: createQuickReply(ctx.businessTypes),
        });
    }
  } catch (error) {
    console.error('Error handling postback:', error);
    await sendErrorFallback(client, lineUserId, '申し訳ございません、エラーが発生しました。しばらくしてから再度お試しください。');
  }
}
