import { Client } from '@line/bot-sdk';
import pool from '../../db/connection.js';
import {
  createRecordFlexMessage,
  createQuickReply,
} from '../lineFlexMessages.js';
import { sendErrorFallback } from './helpers.js';
import { getChatbotConfig } from '../../utils/businessTypes.js';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import type { BotContext } from './types.js';

/**
 * 記録一覧を送信（recordsテーブルのみ）
 */
export async function sendRecords(
  client: Client,
  lineUserId: string,
  ctx: BotContext,
  replyToken: string
): Promise<void> {
  try {
    const config = getChatbotConfig(ctx.primaryBusinessType);

    const result = await pool.query(
      `SELECT r.id, r.record_date as date, r.record_type as source_type,
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

    if (result.rows.length === 0) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: `📝 ${config.recordLabel}はまだ作成されていません。`,
        quickReply: createQuickReply(ctx.businessTypes),
      });
      return;
    }

    await client.replyMessage(replyToken, {
      type: 'text',
      text: `📝 ${config.recordLabel}一覧です（最新${result.rows.length}件）`,
    });

    for (const entry of result.rows) {
      await client.pushMessage(lineUserId, createRecordFlexMessage(entry), false);
    }

    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '詳しい内容は「詳細を見る」ボタンからご確認いただけます。',
      quickReply: createQuickReply(ctx.businessTypes),
    }, false);
  } catch (error) {
    console.error('Error sending records:', error);
    await sendErrorFallback(client, lineUserId, '申し訳ございません、記録情報の取得に失敗しました。');
  }
}

/**
 * 記録詳細を送信
 */
export async function sendRecordDetail(
  client: Client,
  lineUserId: string,
  ctx: BotContext,
  recordId: number,
  replyToken: string
): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT r.*, d.name as dog_name, d.photo_url as dog_photo, s.name as staff_name
       FROM records r
       JOIN dogs d ON r.dog_id = d.id
       LEFT JOIN staff s ON r.staff_id = s.id
       WHERE r.id = $1 AND d.owner_id = $2 AND r.deleted_at IS NULL`,
      [recordId, ctx.ownerId]
    );

    if (result.rows.length === 0) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '記録が見つかりませんでした。',
        quickReply: createQuickReply(ctx.businessTypes),
      });
      return;
    }

    const record = result.rows[0];
    const recordDate = format(new Date(record.record_date), 'yyyy年M月d日(E)', { locale: ja });

    const lines: string[] = [
      `📝 ${recordDate}`,
      '',
      `🐕 ${record.dog_name}`,
    ];
    if (record.staff_name) lines.push(`👤 ${record.staff_name}`);
    lines.push('');
    const reportText = record.notes?.report_text;
    if (reportText) lines.push(reportText);

    await client.replyMessage(replyToken, {
      type: 'text',
      text: lines.join('\n'),
      quickReply: createQuickReply(ctx.businessTypes),
    });
  } catch (error) {
    console.error('Error sending record detail:', error);
    await sendErrorFallback(client, lineUserId, '申し訳ございません、記録情報の取得に失敗しました。');
  }
}
