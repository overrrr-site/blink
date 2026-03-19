import { Client } from '@line/bot-sdk';
import pool from '../../db/connection.js';
import {
  createContractFlexMessage,
  createQuickReply,
} from '../lineFlexMessages.js';
import { sendErrorFallback } from './helpers.js';
import type { BotContext } from './types.js';

/**
 * 契約情報を送信
 */
export async function sendContracts(
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
export async function calculateRemainingSessionsForContract(contract: any): Promise<number | null> {
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
