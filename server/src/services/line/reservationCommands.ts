import { Client } from '@line/bot-sdk';
import pool from '../../db/connection.js';
import {
  createReservationFlexMessage,
  createQuickReply,
} from '../lineFlexMessages.js';
import { formatReservationDateTime, sendErrorFallback } from './helpers.js';
import type { BotContext } from './types.js';

/**
 * 予約一覧を送信
 */
export async function sendReservations(
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
export async function sendReservationLink(
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
export async function sendReservationMenu(
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
export async function sendCancellableReservations(
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
export async function fetchOwnerReservation(reservationId: number, ownerId: number): Promise<any | null> {
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
export async function cancelReservation(
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
export async function confirmCancelReservation(
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
