import express, { Router } from 'express';
import crypto from 'crypto';
import pool from '../db/connection.js';

const router = Router();

// Trial webhook uses environment variables for LINE credentials
const TRIAL_CHANNEL_SECRET = process.env.TRIAL_LINE_CHANNEL_SECRET || '';

function verifyTrialSignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('SHA256', TRIAL_CHANNEL_SECRET)
    .update(body)
    .digest('base64');
  return hash === signature;
}

// Same pattern as existing lineWebhook.ts - use express.text() for raw body
router.post('/', express.text({ type: '*/*' }), async (req, res) => {
  try {
    const signature = req.headers['x-line-signature'] as string;
    if (!signature) {
      res.status(200).send('OK');
      return;
    }

    // Parse body (same pattern as existing lineWebhook.ts)
    let bodyString: string;
    let parsed: any;
    if (typeof req.body === 'string') {
      bodyString = req.body;
      try { parsed = JSON.parse(req.body); } catch { parsed = { events: [] }; }
    } else if (Buffer.isBuffer(req.body)) {
      bodyString = req.body.toString('utf-8');
      try { parsed = JSON.parse(bodyString); } catch { parsed = { events: [] }; }
    } else if (typeof req.body === 'object' && req.body !== null) {
      bodyString = JSON.stringify(req.body);
      parsed = req.body;
    } else {
      res.status(200).send('OK');
      return;
    }

    // Verify signature
    if (!verifyTrialSignature(bodyString, signature)) {
      console.error('Trial webhook: 署名検証失敗');
      res.status(200).send('OK');
      return;
    }

    const events = parsed.events || [];

    for (const event of events) {
      const lineUserId = event.source?.userId;
      if (!lineUserId) continue;

      // Handle text messages
      if (event.type === 'message' && event.message?.type === 'text') {
        const text = event.message.text.trim().toUpperCase();

        // Store code pattern: STORE-XXXXXX
        if (text.startsWith('STORE-')) {
          await handleStoreCodeInput(lineUserId, text, event.replyToken);
          continue;
        }
      }

      // For non-store-code messages, route to linked store
      const linkResult = await pool.query(
        `SELECT tll.store_id, tll.owner_id FROM trial_line_links tll
         JOIN stores s ON s.id = tll.store_id AND s.is_trial = true
         WHERE tll.line_user_id = $1
         LIMIT 1`,
        [lineUserId]
      );

      if (linkResult.rows.length === 0) {
        // Not linked yet - prompt for store code
        await sendTrialReply(event.replyToken, '管理画面に表示されている店舗コード（例: STORE-A1B2C3）を入力してください。');
      }
      // If linked, for now just ignore other messages (trial is for admin testing)
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Trial webhook error:', error);
    res.status(200).send('OK');
  }
});

async function handleStoreCodeInput(lineUserId: string, storeCode: string, replyToken: string): Promise<void> {
  try {
    // Find trial store by code
    const storeResult = await pool.query(
      'SELECT id, name FROM stores WHERE trial_store_code = $1 AND is_trial = true',
      [storeCode]
    );

    if (storeResult.rows.length === 0) {
      await sendTrialReply(replyToken, '店舗コードが見つかりません。管理画面に表示されているコードを確認してください。');
      return;
    }

    const store = storeResult.rows[0];

    // Check if already linked to this store
    const existingLink = await pool.query(
      'SELECT id FROM trial_line_links WHERE store_id = $1 AND line_user_id = $2',
      [store.id, lineUserId]
    );

    if (existingLink.rows.length > 0) {
      await sendTrialReply(replyToken, `既に${store.name}に接続済みです。`);
      return;
    }

    // Find the first owner in this store to link to
    const ownerResult = await pool.query(
      'SELECT id FROM owners WHERE store_id = $1 ORDER BY id ASC LIMIT 1',
      [store.id]
    );

    const ownerId = ownerResult.rows.length > 0 ? ownerResult.rows[0].id : null;

    // Create trial link
    await pool.query(
      `INSERT INTO trial_line_links (store_id, line_user_id, owner_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (store_id, line_user_id) DO NOTHING`,
      [store.id, lineUserId, ownerId]
    );

    await sendTrialReply(replyToken, `${store.name}に接続しました！管理画面から通知テストを送ってみてください。`);
  } catch (error) {
    console.error('Store code handling error:', error);
    await sendTrialReply(replyToken, 'エラーが発生しました。もう一度お試しください。');
  }
}

async function sendTrialReply(replyToken: string, text: string): Promise<void> {
  const accessToken = process.env.TRIAL_LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('TRIAL_LINE_CHANNEL_ACCESS_TOKEN not configured');
    return;
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text }],
      }),
    });

    if (!response.ok) {
      console.error('Trial LINE reply failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Trial LINE reply error:', error);
  }
}

export default router;
