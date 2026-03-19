import { Client } from '@line/bot-sdk';
import { createHelpMessage } from '../lineFlexMessages.js';
import type { BotContext } from './types.js';

/**
 * ヘルプメッセージを送信
 */
export async function sendHelp(
  client: Client,
  lineUserId: string,
  ctx: BotContext,
  replyToken: string
): Promise<void> {
  const helpMessage = createHelpMessage(ctx.businessTypes);
  await client.replyMessage(replyToken, helpMessage);
}
