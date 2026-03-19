import crypto from 'crypto';
import { Client } from '@line/bot-sdk';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';

export function verifySignature(channelSecret: string, body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

/**
 * 予約日時を「M月d日(E) HH:mm」の形式にフォーマットする
 */
export function formatReservationDateTime(date: string | Date, time: string): { dateLabel: string; timeLabel: string } {
  const dateLabel = format(new Date(date), 'M月d日(E)', { locale: ja });
  const timeLabel = time.substring(0, 5);
  return { dateLabel, timeLabel };
}

/**
 * エラー発生時のフォールバック通知を送信する
 */
export async function sendErrorFallback(client: Client, lineUserId: string, text: string): Promise<void> {
  await client.pushMessage(lineUserId, { type: 'text', text }, false);
}
