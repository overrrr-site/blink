import { Client } from '@line/bot-sdk';
import crypto from 'crypto';
import pool from '../db/connection.js';
import { getStoreLineClient } from './lineMessagingService.js';
import { decrypt } from '../utils/encryption.js';
import {
  createReservationFlexMessage,
  createJournalFlexMessage,
  createContractFlexMessage,
  createRecordFlexMessage,
  createHelpMessage,
  createQuickReply,
} from './lineFlexMessages.js';
import { normalizeBusinessTypes, isBusinessType, getChatbotConfig, type BusinessType } from '../utils/businessTypes.js';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';

interface LineEvent {
  type: string;
  message?: {
    type: string;
    text?: string;
  };
  postback?: {
    data: string;
  };
  source?: {
    userId?: string;
  };
  replyToken?: string;
}

interface BotContext {
  storeId: number;
  ownerId: number;
  primaryBusinessType: BusinessType;
  businessTypes: BusinessType[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function verifySignature(channelSecret: string, body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

/**
 * 予約日時を「M月d日(E) HH:mm」の形式にフォーマットする
 */
function formatReservationDateTime(date: string | Date, time: string): { dateLabel: string; timeLabel: string } {
  const dateLabel = format(new Date(date), 'M月d日(E)', { locale: ja });
  const timeLabel = time.substring(0, 5);
  return { dateLabel, timeLabel };
}

/**
 * エラー発生時のフォールバック通知を送信する
 */
async function sendErrorFallback(client: Client, lineUserId: string, text: string): Promise<void> {
  await client.pushMessage(lineUserId, { type: 'text', text }, false);
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
    name: 'journal',
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
    case 'journal':
      await sendJournals(client, lineUserId, ctx, replyToken);
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
    const journalId = params.get('journal_id');

    switch (action) {
      case 'cancel_reservation':
        if (reservationId) await cancelReservation(client, lineUserId, ctx, parseInt(reservationId), replyToken);
        break;
      case 'confirm_cancel':
        if (reservationId) await confirmCancelReservation(client, lineUserId, ctx, parseInt(reservationId), replyToken);
        break;
      case 'view_journal':
        if (journalId) await sendJournalDetail(client, lineUserId, ctx, parseInt(journalId), replyToken);
        break;
      case 'view_reservations':
        await sendReservations(client, lineUserId, ctx, replyToken);
        break;
      case 'create_reservation':
        await sendReservationLink(client, lineUserId, ctx, replyToken);
        break;
      case 'view_journals':
        await sendJournals(client, lineUserId, ctx, replyToken);
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

/**
 * 予約一覧を送信
 */
async function sendReservations(
  client: Client,
  lineUserId: string,
  ctx: BotContext,
  replyToken: string
): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT r.*, d.name as dog_name
       FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       WHERE d.owner_id = $1
         AND r.reservation_date >= CURRENT_DATE
         AND r.status != 'キャンセル'
       ORDER BY r.reservation_date ASC, r.reservation_time ASC
       LIMIT 10`,
      [ctx.ownerId]
    );

    if (result.rows.length === 0) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '現在、今後のご予約はございません 📅\n\n新しくご予約される場合は「予約する」とお送りください。',
        quickReply: createQuickReply(ctx.businessTypes),
      });
      return;
    }

    await client.replyMessage(replyToken, {
      type: 'text',
      text: `📅 ご予約一覧です（${result.rows.length}件）`,
    });

    for (const reservation of result.rows) {
      await client.pushMessage(lineUserId, createReservationFlexMessage(reservation), false);
    }

    await client.pushMessage(lineUserId, {
      type: 'text',
      text: 'キャンセルをご希望の場合は「キャンセル」とお送りください 🙋',
      quickReply: createQuickReply(ctx.businessTypes),
    }, false);
  } catch (error) {
    console.error('Error sending reservations:', error);
    await sendErrorFallback(client, lineUserId, '申し訳ございません、予約情報の取得に失敗しました。しばらくしてから再度お試しください。');
  }
}

/**
 * 予約作成リンクを送信
 */
async function sendReservationLink(
  client: Client,
  lineUserId: string,
  ctx: BotContext,
  replyToken: string
): Promise<void> {
  const liffId = process.env.LIFF_ID;
  if (!liffId) {
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '予約機能の設定が完了していません。管理者にお問い合わせください。',
    }, false);
    return;
  }

  // 予約作成ページに直接遷移
  const liffUrl = `https://liff.line.me/${liffId}/home/reservations/new`;

  await client.replyMessage(replyToken, {
    type: 'text',
    text: '📅 ご予約ページをご用意しました。\n下のボタンからお進みください。',
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'uri',
            label: '予約を作成する',
            uri: liffUrl,
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '予約確認',
            data: 'action=view_reservations',
          },
        },
      ],
    },
  });
}

/**
 * 予約メニューを送信（「予約」単体の場合）
 */
async function sendReservationMenu(
  client: Client,
  lineUserId: string,
  ctx: BotContext,
  replyToken: string
): Promise<void> {
  const liffId = process.env.LIFF_ID;
  const createUrl = liffId ? `https://liff.line.me/${liffId}/home/reservations/new` : '#';

  await client.replyMessage(replyToken, {
    type: 'text',
    text: '📅 ご予約について、どちらをご希望ですか？',
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'uri',
            label: '新しく予約する',
            uri: createUrl,
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '予約を確認する',
            data: 'action=view_reservations',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: 'キャンセルする',
            data: 'action=cancel_menu',
          },
        },
      ],
    },
  });
}

/**
 * キャンセル可能な予約一覧を送信
 */
async function sendCancellableReservations(
  client: Client,
  lineUserId: string,
  ctx: BotContext,
  replyToken: string
): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT r.*, d.name as dog_name
       FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       WHERE d.owner_id = $1
         AND r.reservation_date >= CURRENT_DATE
         AND r.status IN ('予定', '登園済')
       ORDER BY r.reservation_date ASC, r.reservation_time ASC
       LIMIT 5`,
      [ctx.ownerId]
    );

    if (result.rows.length === 0) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '現在、キャンセル可能なご予約はございません。',
        quickReply: createQuickReply(ctx.businessTypes),
      });
      return;
    }

    await client.replyMessage(replyToken, {
      type: 'text',
      text: 'キャンセルされるご予約をお選びください：',
    });

    for (const reservation of result.rows) {
      const { dateLabel, timeLabel } = formatReservationDateTime(reservation.reservation_date, reservation.reservation_time);

      await client.pushMessage(lineUserId, {
        type: 'template',
        altText: `${dateLabel} ${timeLabel} - ${reservation.dog_name}`,
        template: {
          type: 'buttons',
          text: `${dateLabel} ${timeLabel}\n${reservation.dog_name}`,
          actions: [
            {
              type: 'postback',
              label: 'キャンセルする',
              data: `action=cancel_reservation&reservation_id=${reservation.id}`,
            },
          ],
        },
      }, false);
    }
  } catch (error) {
    console.error('Error sending cancellable reservations:', error);
    await sendErrorFallback(client, lineUserId, '申し訳ございません、予約情報の取得に失敗しました。しばらくしてから再度お試しください。');
  }
}

/**
 * 飼い主の予約を取得する共通クエリ
 */
async function fetchOwnerReservation(reservationId: number, ownerId: number): Promise<any | null> {
  const result = await pool.query(
    `SELECT r.*, d.name as dog_name
     FROM reservations r
     JOIN dogs d ON r.dog_id = d.id
     WHERE r.id = $1 AND d.owner_id = $2`,
    [reservationId, ownerId]
  );
  return result.rows[0] ?? null;
}

/**
 * 予約をキャンセル（確認ステップ付き）
 */
async function cancelReservation(
  client: Client,
  lineUserId: string,
  ctx: BotContext,
  reservationId: number,
  replyToken: string
): Promise<void> {
  try {
    const reservation = await fetchOwnerReservation(reservationId, ctx.ownerId);
    if (!reservation) {
      await client.replyMessage(replyToken, { type: 'text', text: 'ご予約が見つかりませんでした。' });
      return;
    }

    const { dateLabel, timeLabel } = formatReservationDateTime(reservation.reservation_date, reservation.reservation_time);

    await client.replyMessage(replyToken, {
      type: 'template',
      altText: '予約キャンセルの確認',
      template: {
        type: 'confirm',
        text: `こちらのご予約をキャンセルしますか？\n\n${dateLabel} ${timeLabel}\n${reservation.dog_name}`,
        actions: [
          { type: 'postback', label: 'キャンセルする', data: `action=confirm_cancel&reservation_id=${reservationId}` },
          { type: 'postback', label: 'やめる', data: 'action=cancel' },
        ],
      },
    });
  } catch (error) {
    console.error('Error canceling reservation:', error);
    await sendErrorFallback(client, lineUserId, '申し訳ございません、エラーが発生しました。');
  }
}

/**
 * 予約キャンセルを確定
 */
async function confirmCancelReservation(
  client: Client,
  lineUserId: string,
  ctx: BotContext,
  reservationId: number,
  replyToken: string
): Promise<void> {
  try {
    const reservation = await fetchOwnerReservation(reservationId, ctx.ownerId);
    if (!reservation) {
      await client.replyMessage(replyToken, { type: 'text', text: 'ご予約が見つかりませんでした。' });
      return;
    }

    if (reservation.status === 'キャンセル') {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: 'こちらのご予約は既にキャンセル済みです。',
        quickReply: createQuickReply(ctx.businessTypes),
      });
      return;
    }

    await pool.query(
      `UPDATE reservations SET status = 'キャンセル', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [reservationId]
    );

    const { dateLabel, timeLabel } = formatReservationDateTime(reservation.reservation_date, reservation.reservation_time);

    await client.replyMessage(replyToken, {
      type: 'text',
      text: `✅ ご予約をキャンセルいたしました。\n\n${dateLabel} ${timeLabel}`,
      quickReply: createQuickReply(ctx.businessTypes),
    });
  } catch (error) {
    console.error('Error confirming cancel:', error);
    await sendErrorFallback(client, lineUserId, '申し訳ございません、キャンセル処理に失敗しました。');
  }
}

/**
 * 記録一覧を送信（journals + records テーブルを統合）
 */
async function sendJournals(
  client: Client,
  lineUserId: string,
  ctx: BotContext,
  replyToken: string
): Promise<void> {
  try {
    const config = getChatbotConfig(ctx.primaryBusinessType);

    // journals（daycare業種がある場合のみ後方互換で取得）
    const journalPromise = ctx.businessTypes.includes('daycare')
      ? pool.query(
          `SELECT j.id, j.journal_date, j.journal_date as date, 'journal' as source, 'daycare' as source_type,
                  d.name as dog_name, j.comment,
                  d.photo_url as dog_photo, s.name as staff_name,
                  j.morning_toilet_status, j.afternoon_toilet_status
           FROM journals j
           JOIN dogs d ON j.dog_id = d.id
           LEFT JOIN staff s ON j.staff_id = s.id
           WHERE d.owner_id = $1
           ORDER BY j.journal_date DESC, j.created_at DESC
           LIMIT 5`,
          [ctx.ownerId]
        )
      : Promise.resolve({ rows: [] });

    // records（status='shared'、飼い主の業種に合致するもの）
    const recordPromise = pool.query(
      `SELECT r.id, r.record_date as date, 'record' as source, r.record_type as source_type,
              d.name as dog_name, (r.notes->>'report_text') as comment
       FROM records r
       JOIN dogs d ON r.dog_id = d.id
       WHERE d.owner_id = $1
         AND r.status = 'shared'
         AND r.record_type = ANY($2::text[])
         AND r.deleted_at IS NULL
       ORDER BY r.record_date DESC, r.created_at DESC
       LIMIT 5`,
      [ctx.ownerId, ctx.businessTypes]
    );

    const [journalResult, recordResult] = await Promise.all([journalPromise, recordPromise]);

    // マージして日付降順、最新5件
    const allEntries = [...journalResult.rows, ...recordResult.rows]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    if (allEntries.length === 0) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: `📝 ${config.recordLabel}はまだ作成されていません。`,
        quickReply: createQuickReply(ctx.businessTypes),
      });
      return;
    }

    await client.replyMessage(replyToken, {
      type: 'text',
      text: `📝 ${config.recordLabel}一覧です（最新${allEntries.length}件）`,
    });

    for (const entry of allEntries) {
      if (entry.source === 'journal') {
        await client.pushMessage(lineUserId, createJournalFlexMessage(entry), false);
      } else {
        await client.pushMessage(lineUserId, createRecordFlexMessage(entry), false);
      }
    }

    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '詳しい内容は「詳細を見る」ボタンからご確認いただけます。',
      quickReply: createQuickReply(ctx.businessTypes),
    }, false);
  } catch (error) {
    console.error('Error sending journals:', error);
    await sendErrorFallback(client, lineUserId, '申し訳ございません、記録情報の取得に失敗しました。');
  }
}

/**
 * 日誌詳細を送信
 */
async function sendJournalDetail(
  client: Client,
  lineUserId: string,
  ctx: BotContext,
  journalId: number,
  replyToken: string
): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT j.*, d.name as dog_name, d.photo_url as dog_photo, s.name as staff_name
       FROM journals j
       JOIN dogs d ON j.dog_id = d.id
       LEFT JOIN staff s ON j.staff_id = s.id
       WHERE j.id = $1 AND d.owner_id = $2`,
      [journalId, ctx.ownerId]
    );

    if (result.rows.length === 0) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '記録が見つかりませんでした。',
        quickReply: createQuickReply(ctx.businessTypes),
      });
      return;
    }

    const journal = result.rows[0];
    const journalDate = format(new Date(journal.journal_date), 'yyyy年M月d日(E)', { locale: ja });

    const lines: string[] = [
      `📝 ${journalDate}`,
      '',
      `🐕 ${journal.dog_name}`,
    ];
    if (journal.staff_name) lines.push(`👤 ${journal.staff_name}`);
    lines.push('');
    if (journal.morning_toilet_status) lines.push(`午前のトイレ: ${journal.morning_toilet_status}`);
    if (journal.afternoon_toilet_status) lines.push(`午後のトイレ: ${journal.afternoon_toilet_status}`);
    if (journal.comment) lines.push('', journal.comment);

    await client.replyMessage(replyToken, {
      type: 'text',
      text: lines.join('\n'),
      quickReply: createQuickReply(ctx.businessTypes),
    });
  } catch (error) {
    console.error('Error sending journal detail:', error);
    await sendErrorFallback(client, lineUserId, '申し訳ございません、記録情報の取得に失敗しました。');
  }
}

/**
 * 契約情報を送信
 */
async function sendContracts(
  client: Client,
  lineUserId: string,
  ctx: BotContext,
  replyToken: string
): Promise<void> {
  try {
    const dogsResult = await pool.query(
      `SELECT id FROM dogs WHERE owner_id = $1`,
      [ctx.ownerId]
    );

    if (dogsResult.rows.length === 0) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '🐕 まだワンちゃんの登録がありません。',
        quickReply: createQuickReply(ctx.businessTypes),
      });
      return;
    }

    const dogIds = dogsResult.rows.map((d: any) => d.id);

    const contractsResult = await pool.query(
      `SELECT c.*, d.name as dog_name
       FROM contracts c
       JOIN dogs d ON c.dog_id = d.id
       WHERE c.dog_id = ANY($1::int[])
         AND c.valid_until >= CURRENT_DATE
       ORDER BY c.created_at DESC`,
      [dogIds]
    );

    if (contractsResult.rows.length === 0) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '📋 現在、有効なご契約はございません。',
        quickReply: createQuickReply(ctx.businessTypes),
      });
      return;
    }

    await client.replyMessage(replyToken, {
      type: 'text',
      text: `📋 ご契約情報です（${contractsResult.rows.length}件）`,
    });

    for (const contract of contractsResult.rows) {
      const calculatedRemaining = await calculateRemainingSessionsForContract(contract);
      await client.pushMessage(lineUserId, createContractFlexMessage(contract, calculatedRemaining), false);
    }

    await client.pushMessage(lineUserId, {
      type: 'text',
      text: 'ご予約は「予約する」とお送りいただければ作成できます 📅',
      quickReply: createQuickReply(ctx.businessTypes),
    }, false);
  } catch (error) {
    console.error('Error sending contracts:', error);
    await sendErrorFallback(client, lineUserId, '申し訳ございません、契約情報の取得に失敗しました。');
  }
}

/**
 * 契約の残回数を計算（月謝制の場合はnull）
 */
async function calculateRemainingSessionsForContract(contract: any): Promise<number | null> {
  if (contract.contract_type === '月謝制') return null;

  const usedResult = await pool.query(
    `SELECT COUNT(*) as used_count
     FROM reservations r
     WHERE r.dog_id = $1
       AND r.status IN ('登園済', '降園済', '予定')
       AND r.reservation_date >= $2
       AND r.reservation_date <= COALESCE($3, CURRENT_DATE + INTERVAL '1 year')`,
    [contract.dog_id, contract.created_at, contract.valid_until]
  );
  const usedCount = parseInt(usedResult.rows[0]?.used_count || '0', 10);
  return Math.max(0, (contract.total_sessions || 0) - usedCount);
}

/**
 * ヘルプメッセージを送信
 */
async function sendHelp(
  client: Client,
  lineUserId: string,
  ctx: BotContext,
  replyToken: string
): Promise<void> {
  const helpMessage = createHelpMessage(ctx.businessTypes);
  await client.replyMessage(replyToken, helpMessage);
}
