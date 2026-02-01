import express, { Router } from 'express';

const router = Router();

interface WebhookEvent {
  type: string;
  [key: string]: unknown;
}

interface WebhookBody {
  events?: WebhookEvent[];
}

/**
 * LINE Webhook エンドポイント
 *
 * express.text() でリクエストボディを文字列として取得し、
 * 署名検証に使用する。express.json() より先に登録する必要がある。
 */
router.post('/', express.text({ type: '*/*' }), async (req, res) => {
  try {
    const signature = req.headers['x-line-signature'] as string;
    if (!signature) {
      console.log('LINE Webhook: 署名なし（検証リクエスト）');
      res.status(200).send('OK');
      return;
    }

    const parsed = parseWebhookBody(req.body);
    if (!parsed) {
      console.log('LINE Webhook: body取得失敗 - type:', typeof req.body);
      res.status(200).send('OK');
      return;
    }

    const { bodyString, events } = parsed;
    console.log('LINE Webhook: イベント受信, body長:', bodyString.length);

    if (events.length === 0) {
      console.log('LINE Webhook: イベントなし（検証成功）');
      res.status(200).send('OK');
      return;
    }

    console.log(
      'LINE Webhook: イベント数:',
      events.length,
      'タイプ:',
      events.map((e) => e.type).join(','),
    );

    const { processLineWebhookEvents } = await import('../services/lineBotService.js');
    await processLineWebhookEvents(events, bodyString, signature);

    console.log('LINE Webhook: 処理完了');
    res.status(200).send('OK');
  } catch (error) {
    console.error('LINE Webhook error:', error);
    // エラーでも200を返す（LINEがリトライしないように）
    res.status(200).send('OK');
  }
});

/**
 * Webhook リクエストボディをパースして文字列とイベント配列を返す。
 * パースできない場合は null を返す。
 */
function parseWebhookBody(
  body: unknown,
): { bodyString: string; events: WebhookEvent[] } | null {
  let bodyString: string;
  let parsed: WebhookBody;

  if (typeof body === 'string') {
    bodyString = body;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = { events: [] };
    }
  } else if (Buffer.isBuffer(body)) {
    bodyString = body.toString('utf-8');
    try {
      parsed = JSON.parse(bodyString);
    } catch {
      parsed = { events: [] };
    }
  } else if (typeof body === 'object' && body !== null) {
    bodyString = JSON.stringify(body);
    parsed = body as WebhookBody;
  } else {
    return null;
  }

  return { bodyString, events: parsed.events ?? [] };
}

export default router;
