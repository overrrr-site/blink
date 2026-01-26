import express from 'express';
import crypto from 'crypto';
import pool from '../db/connection.js';
import { decrypt } from '../utils/encryption.js';
import { handleLineMessage } from '../services/lineBotService.js';

const router = express.Router();

/**
 * LINE Webhook署名検証
 */
function verifySignature(
  channelSecret: string,
  body: string,
  signature: string
): boolean {
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

/**
 * bodyを文字列として取得（Vercel環境対応）
 * express.text()で取得した場合は文字列、それ以外はオブジェクト/Bufferの可能性あり
 */
function getBodyString(body: any): string {
  if (!body) {
    return '{}';
  }
  if (typeof body === 'string') {
    return body;
  }
  if (Buffer.isBuffer(body)) {
    return body.toString('utf-8');
  }
  if (typeof body === 'object') {
    return JSON.stringify(body);
  }
  return String(body);
}

/**
 * LINE Webhookエンドポイント
 * マルチテナント対応: 複数店舗のWebhookを1エンドポイントで処理
 */
router.post('/webhook', async (req, res) => {
  // まず200 OKを返す（LINEのタイムアウト対策）
  // これにより、LINE検証は必ず成功する
  try {
    res.status(200).send('OK');
  } catch (e) {
    // レスポンス送信に失敗した場合のフォールバック
    console.error('LINE Webhook: レスポンス送信エラー:', e);
    return;
  }

  try {
    const signature = req.headers['x-line-signature'] as string;
    if (!signature) {
      console.warn('LINE Webhook: 署名が提供されていません');
      return;
    }

    // bodyを文字列として取得（Buffer/Object/String対応）
    const bodyString = getBodyString(req.body);
    console.log('LINE Webhook: bodyタイプ:', typeof req.body, Buffer.isBuffer(req.body));
    
    let parsedBody: any;
    try {
      parsedBody = typeof req.body === 'object' && !Buffer.isBuffer(req.body) 
        ? req.body 
        : JSON.parse(bodyString);
    } catch (parseError) {
      console.error('LINE Webhook: JSONパースエラー:', parseError);
      return;
    }

    const events = parsedBody.events || [];

    // イベントが空の場合は終了（検証リクエストの可能性）
    if (!events || events.length === 0) {
      console.log('LINE Webhook: イベントがありません（検証リクエスト成功）');
      return;
    }

    // 各イベントを非同期で処理（レスポンスは既に返している）
    for (const event of events) {
      // 検証イベントの場合はスキップ
      if (event.type === 'verify') {
        console.log('LINE Webhook: 検証イベントを受信');
        continue;
      }

      if (event.type !== 'message' && event.type !== 'postback') {
        continue;
      }

      const lineUserId = event.source?.userId;
      if (!lineUserId) {
        console.warn('LINE Webhook: userIdが見つかりません');
        continue;
      }

      // 非同期で処理（エラーはログに記録するが、レスポンスには影響しない）
      processEvent(event, lineUserId, bodyString, signature);
    }
  } catch (error: any) {
    console.error('LINE Webhook error:', error);
    // レスポンスは既に返しているので、エラーログのみ記録
  }
});

/**
 * イベントを非同期で処理
 */
async function processEvent(
  event: any,
  lineUserId: string,
  bodyString: string,
  signature: string
): Promise<void> {
  try {
    // LINE IDから店舗を特定
    const ownerResult = await pool.query(
      `SELECT o.id as owner_id, o.store_id, s.line_channel_id, s.line_channel_secret
       FROM owners o
       JOIN stores s ON o.store_id = s.id
       WHERE o.line_id = $1
       LIMIT 1`,
      [lineUserId]
    );

    if (ownerResult.rows.length === 0) {
      console.warn(`LINE Webhook: ユーザー ${lineUserId} が見つかりません`);
      return;
    }

    const owner = ownerResult.rows[0];
    
    // 店舗のLINE認証情報を取得
    if (!owner.line_channel_secret) {
      console.warn(`LINE Webhook: 店舗ID ${owner.store_id} のLINE認証情報が設定されていません`);
      return;
    }

    // 署名検証
    const channelSecret = decrypt(owner.line_channel_secret);
    if (!verifySignature(channelSecret, bodyString, signature)) {
      console.warn(`LINE Webhook: 署名検証に失敗しました (店舗ID: ${owner.store_id})`);
      return;
    }

    // チャットボットが有効かチェック
    const botSettingsResult = await pool.query(
      `SELECT line_bot_enabled FROM notification_settings WHERE store_id = $1`,
      [owner.store_id]
    );
    const lineBotEnabled = botSettingsResult.rows[0]?.line_bot_enabled ?? false;
    
    if (!lineBotEnabled) {
      console.log(`LINE Webhook: 店舗ID ${owner.store_id} のチャットボットが無効です`);
      return;
    }

    // メッセージ処理（replyTokenを渡す）
    const replyToken = event.replyToken;
    if (replyToken) {
      await handleLineMessage(
        owner.store_id,
        owner.owner_id,
        lineUserId,
        event,
        replyToken
      );
    }
  } catch (error: any) {
    console.error('LINE Webhook event processing error:', error);
  }
}

export default router;
