import { Client } from '@line/bot-sdk';
import crypto from 'crypto';
import pool from '../db/connection.js';
import { getStoreLineClient } from './lineMessagingService.js';
import { decrypt } from '../utils/encryption.js';
import {
  createReservationFlexMessage,
  createJournalFlexMessage,
  createContractFlexMessage,
  createHelpMessage,
  createQuickReply,
} from './lineFlexMessages.js';
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
 * LINE Webhookイベントを処理（index.tsから呼び出される）
 */
export async function processLineWebhookEvents(
  events: LineEvent[],
  bodyString: string,
  signature: string
): Promise<void> {
  console.log('processLineWebhookEvents開始: イベント数=', events.length);
  
  for (const event of events) {
    try {
      console.log('イベント処理中: type=', event.type);
      
      // 検証イベントはスキップ
      if (event.type === 'verify') {
        console.log('LINE Webhook: 検証イベント');
        continue;
      }

      if (event.type !== 'message' && event.type !== 'postback') {
        console.log('スキップ: サポート外のイベントタイプ');
        continue;
      }

      const lineUserId = event.source?.userId;
      if (!lineUserId) {
        console.warn('LINE Webhook: userIdなし');
        continue;
      }
      
      console.log('LINE userId:', lineUserId);

      // LINE IDから店舗を特定
      const ownerResult = await pool.query(
        `SELECT o.id as owner_id, o.store_id, s.line_channel_id, s.line_channel_secret
         FROM owners o
         JOIN stores s ON o.store_id = s.id
         WHERE o.line_id = $1
         LIMIT 1`,
        [lineUserId]
      );
      
      console.log('オーナー検索結果: 件数=', ownerResult.rows.length);

      if (ownerResult.rows.length === 0) {
        console.warn(`LINE Webhook: ユーザー ${lineUserId} が見つかりません`);
        continue;
      }

      const owner = ownerResult.rows[0];

      // 店舗のLINE認証情報を確認
      if (!owner.line_channel_secret) {
        console.warn(`LINE Webhook: 店舗ID ${owner.store_id} のLINE認証情報なし`);
        continue;
      }

      // 署名検証
      const channelSecret = decrypt(owner.line_channel_secret);
      const signatureValid = verifySignature(channelSecret, bodyString, signature);
      console.log('署名検証結果:', signatureValid);
      
      if (!signatureValid) {
        console.warn(`LINE Webhook: 署名検証失敗 (店舗ID: ${owner.store_id})`);
        continue;
      }

      // チャットボット有効チェック
      const botSettingsResult = await pool.query(
        `SELECT line_bot_enabled FROM notification_settings WHERE store_id = $1`,
        [owner.store_id]
      );
      const lineBotEnabled = botSettingsResult.rows[0]?.line_bot_enabled ?? false;
      console.log('チャットボット有効:', lineBotEnabled);

      if (!lineBotEnabled) {
        console.log(`LINE Webhook: 店舗ID ${owner.store_id} はボット無効`);
        continue;
      }

      // メッセージ処理
      const replyToken = event.replyToken;
      console.log('replyToken:', replyToken ? '存在' : 'なし');
      
      if (replyToken) {
        console.log('handleLineMessage呼び出し開始');
        await handleLineMessage(
          owner.store_id,
          owner.owner_id,
          lineUserId,
          event,
          replyToken
        );
        console.log('handleLineMessage完了');
      }
    } catch (error) {
      console.error('LINE Webhook event処理エラー:', error);
    }
  }
  console.log('processLineWebhookEvents完了');
}

/**
 * LINEメッセージを処理
 */
export async function handleLineMessage(
  storeId: number,
  ownerId: number,
  lineUserId: string,
  event: LineEvent,
  replyToken: string
): Promise<void> {
  try {
    const client = await getStoreLineClient(storeId);
    if (!client) {
      console.warn(`店舗ID ${storeId} のLINEクライアントが初期化されていません`);
      return;
    }

    // Postbackイベント（ボタンタップなど）
    if (event.type === 'postback' && event.postback) {
      await handlePostback(client, storeId, ownerId, lineUserId, event.postback.data, replyToken);
      return;
    }

    // テキストメッセージ
    if (event.type === 'message' && event.message?.type === 'text') {
      const text = event.message.text.trim();
      await handleTextMessage(client, storeId, ownerId, lineUserId, text, replyToken);
      return;
    }
  } catch (error: any) {
    console.error('Error handling LINE message:', error);
  }
}

/**
 * テキストメッセージを処理
 */
async function handleTextMessage(
  client: Client,
  storeId: number,
  ownerId: number,
  lineUserId: string,
  text: string,
  replyToken: string
): Promise<void> {
  const normalizedText = text.toLowerCase().replace(/\s+/g, '');

  // コマンド判定
  if (normalizedText.includes('予約') && (normalizedText.includes('確認') || normalizedText.includes('見る') || normalizedText.includes('一覧'))) {
    await sendReservations(client, lineUserId, ownerId, replyToken);
  } else if (normalizedText.includes('予約') && (normalizedText.includes('する') || normalizedText.includes('作成') || normalizedText.includes('新規'))) {
    await sendReservationLink(client, lineUserId, storeId, replyToken);
  } else if (normalizedText.includes('キャンセル')) {
    await sendCancellableReservations(client, lineUserId, ownerId, replyToken);
  } else if (normalizedText.includes('日誌') || normalizedText.includes('日報')) {
    await sendJournals(client, lineUserId, ownerId, replyToken);
  } else if (normalizedText.includes('契約') || normalizedText.includes('残回数') || normalizedText.includes('残り')) {
    await sendContracts(client, lineUserId, ownerId, replyToken);
  } else if (normalizedText.includes('ヘルプ') || normalizedText.includes('使い方') || normalizedText === '？' || normalizedText === '?') {
    await sendHelp(client, lineUserId, replyToken);
  } else {
    // 不明なメッセージにはヘルプを返す
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '申し訳ございませんが、そのメッセージは理解できませんでした。\n\n「ヘルプ」と送信すると、使い方を確認できます。',
      quickReply: createQuickReply(),
    });
  }
}

/**
 * Postbackイベントを処理（ボタンタップなど）
 */
async function handlePostback(
  client: Client,
  storeId: number,
  ownerId: number,
  lineUserId: string,
  data: string,
  replyToken: string
): Promise<void> {
  try {
    const params = new URLSearchParams(data);
    const action = params.get('action');

    switch (action) {
      case 'cancel_reservation':
        const reservationId = params.get('reservation_id');
        if (reservationId) {
          await cancelReservation(client, lineUserId, ownerId, parseInt(reservationId), replyToken);
        }
        break;
      case 'confirm_cancel':
        const confirmReservationId = params.get('reservation_id');
        if (confirmReservationId) {
          await confirmCancelReservation(client, lineUserId, ownerId, parseInt(confirmReservationId), replyToken);
        }
        break;
      case 'view_journal':
        const journalId = params.get('journal_id');
        if (journalId) {
          await sendJournalDetail(client, lineUserId, ownerId, parseInt(journalId), replyToken);
        }
        break;
      case 'view_reservations':
        await sendReservations(client, lineUserId, ownerId, replyToken);
        break;
      case 'create_reservation':
        await sendReservationLink(client, lineUserId, storeId, replyToken);
        break;
      case 'view_journals':
        await sendJournals(client, lineUserId, ownerId, replyToken);
        break;
      case 'view_contracts':
        await sendContracts(client, lineUserId, ownerId, replyToken);
        break;
      case 'help':
        await sendHelp(client, lineUserId, replyToken);
        break;
      case 'cancel':
        // キャンセル操作をやめる
        await client.replyMessage(replyToken, {
          type: 'text',
          text: '操作をキャンセルしました。',
          quickReply: createQuickReply(),
        });
        break;
      default:
        await client.replyMessage(replyToken, {
          type: 'text',
          text: '操作を完了しました。',
          quickReply: createQuickReply(),
        });
    }
  } catch (error: any) {
    console.error('Error handling postback:', error);
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: 'エラーが発生しました。もう一度お試しください。',
    }, false);
  }
}

/**
 * 予約一覧を送信
 */
async function sendReservations(
  client: Client,
  lineUserId: string,
  ownerId: number,
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
      [ownerId]
    );

    if (result.rows.length === 0) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '今後の予約はありません。',
        quickReply: createQuickReply(),
      });
      return;
    }

    const messages = result.rows.map((reservation) =>
      createReservationFlexMessage(reservation)
    );

    // 最初のメッセージをreplyTokenで送信
    await client.replyMessage(replyToken, {
      type: 'text',
      text: `📅 予約一覧（${result.rows.length}件）`,
    });

    // 以降のメッセージはpushMessageで送信
    for (const message of messages) {
      await client.pushMessage(lineUserId, message, false);
    }

    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '予約をキャンセルする場合は「キャンセル」と送信してください。',
      quickReply: createQuickReply(),
    }, false);
  } catch (error: any) {
      console.error('Error sending reservations:', error);
    // エラー時はpushMessageを使用（replyTokenは既に使用済みの可能性があるため）
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '予約情報の取得に失敗しました。',
    }, false);
  }
}

/**
 * 予約作成リンクを送信
 */
async function sendReservationLink(
  client: Client,
  lineUserId: string,
  storeId: number,
  replyToken: string
): Promise<void> {
  // LIFF URLを生成（環境変数から取得）
  const liffId = process.env.LIFF_ID;
    if (!liffId) {
      await client.pushMessage(lineUserId, {
        type: 'text',
        text: '予約機能の設定が完了していません。管理者にお問い合わせください。',
      }, false);
      return;
    }

  const liffUrl = `https://liff.line.me/${liffId}/home/reservations`;

  await client.replyMessage(replyToken, {
    type: 'text',
    text: '予約を作成するには、以下のリンクをタップしてください。',
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'uri',
            label: '予約する',
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
 * キャンセル可能な予約一覧を送信
 */
async function sendCancellableReservations(
  client: Client,
  lineUserId: string,
  ownerId: number,
  replyToken: string
): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT r.*, d.name as dog_name
       FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       WHERE d.owner_id = $1
         AND r.reservation_date >= CURRENT_DATE
         AND r.status IN ('予定', 'チェックイン済')
       ORDER BY r.reservation_date ASC, r.reservation_time ASC
       LIMIT 5`,
      [ownerId]
    );

    if (result.rows.length === 0) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: 'キャンセル可能な予約はありません。',
        quickReply: createQuickReply(),
      });
      return;
    }

    // 最初のメッセージをreplyTokenで送信
    await client.replyMessage(replyToken, {
      type: 'text',
      text: 'キャンセルする予約を選択してください：',
    });

    // 各予約にキャンセルボタンを付けて送信（pushMessageを使用）
    for (const reservation of result.rows) {
      const reservationDate = format(new Date(reservation.reservation_date), 'M月d日(E)', { locale: ja });
      const reservationTime = reservation.reservation_time.substring(0, 5);

      await client.pushMessage(lineUserId, {
        type: 'template',
        altText: `${reservationDate} ${reservationTime} - ${reservation.dog_name}`,
        template: {
          type: 'buttons',
          text: `${reservationDate} ${reservationTime}\n${reservation.dog_name}`,
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
  } catch (error: any) {
      console.error('Error sending cancellable reservations:', error);
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '予約情報の取得に失敗しました。',
    }, false);
  }
}

/**
 * 予約をキャンセル（確認ステップ付き）
 */
async function cancelReservation(
  client: Client,
  lineUserId: string,
  ownerId: number,
  reservationId: number,
  replyToken: string
): Promise<void> {
  try {
    // 予約情報を取得
    const result = await pool.query(
      `SELECT r.*, d.name as dog_name
       FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       WHERE r.id = $1 AND d.owner_id = $2`,
      [reservationId, ownerId]
    );

    if (result.rows.length === 0) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '予約が見つかりませんでした。',
      });
      return;
    }

    const reservation = result.rows[0];
    const reservationDate = format(new Date(reservation.reservation_date), 'M月d日(E)', { locale: ja });
    const reservationTime = reservation.reservation_time.substring(0, 5);

    // 確認メッセージ
    await client.replyMessage(replyToken, {
      type: 'template',
      altText: '予約キャンセルの確認',
      template: {
        type: 'confirm',
        text: `以下の予約をキャンセルしますか？\n\n${reservationDate} ${reservationTime}\n${reservation.dog_name}`,
        actions: [
          {
            type: 'postback',
            label: 'キャンセルする',
            data: `action=confirm_cancel&reservation_id=${reservationId}`,
          },
          {
            type: 'postback',
            label: 'やめる',
            data: 'action=cancel',
          },
        ],
      },
    });
  } catch (error: any) {
      console.error('Error canceling reservation:', error);
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: 'エラーが発生しました。',
    }, false);
  }
}

/**
 * 予約キャンセルを確定
 */
async function confirmCancelReservation(
  client: Client,
  lineUserId: string,
  ownerId: number,
  reservationId: number,
  replyToken: string
): Promise<void> {
  try {
    // 予約の所有者を確認
    const checkResult = await pool.query(
      `SELECT r.* FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       WHERE r.id = $1 AND d.owner_id = $2`,
      [reservationId, ownerId]
    );

    if (checkResult.rows.length === 0) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '予約が見つかりませんでした。',
      });
      return;
    }

    const reservation = checkResult.rows[0];

    // キャンセル可能かチェック
    if (reservation.status === 'キャンセル') {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: 'この予約は既にキャンセルされています。',
        quickReply: createQuickReply(),
      });
      return;
    }

    // 予約をキャンセル
    await pool.query(
      `UPDATE reservations 
       SET status = 'キャンセル', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [reservationId]
    );

    const reservationDate = format(new Date(reservation.reservation_date), 'M月d日(E)', { locale: ja });
    const reservationTime = reservation.reservation_time.substring(0, 5);

    await client.replyMessage(replyToken, {
      type: 'text',
      text: `✅ 予約をキャンセルしました。\n\n${reservationDate} ${reservationTime}`,
      quickReply: createQuickReply(),
    });
  } catch (error: any) {
      console.error('Error confirming cancel:', error);
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: 'キャンセル処理に失敗しました。',
    }, false);
  }
}

/**
 * 日誌一覧を送信
 */
async function sendJournals(
  client: Client,
  lineUserId: string,
  ownerId: number,
  replyToken: string
): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT j.*, d.name as dog_name, d.photo_url as dog_photo, s.name as staff_name
       FROM journals j
       JOIN dogs d ON j.dog_id = d.id
       LEFT JOIN staff s ON j.staff_id = s.id
       WHERE d.owner_id = $1
       ORDER BY j.journal_date DESC, j.created_at DESC
       LIMIT 5`,
      [ownerId]
    );

    if (result.rows.length === 0) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '日誌はまだありません。',
        quickReply: createQuickReply(),
      });
      return;
    }

    // 最初のメッセージをreplyTokenで送信
    await client.replyMessage(replyToken, {
      type: 'text',
      text: `📝 日誌一覧（最新${result.rows.length}件）`,
    });

    // 各日誌をFlexメッセージで送信（pushMessageを使用）
    for (const journal of result.rows) {
      const message = createJournalFlexMessage(journal);
      await client.pushMessage(lineUserId, message, false);
    }

    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '詳細を見るには、各日誌の「詳細を見る」ボタンをタップしてください。',
      quickReply: createQuickReply(),
    }, false);
  } catch (error: any) {
      console.error('Error sending journals:', error);
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '日誌情報の取得に失敗しました。',
    }, false);
  }
}

/**
 * 日誌詳細を送信
 */
async function sendJournalDetail(
  client: Client,
  lineUserId: string,
  ownerId: number,
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
      [journalId, ownerId]
    );

    if (result.rows.length === 0) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '日誌が見つかりませんでした。',
      });
      return;
    }

    const journal = result.rows[0];
    const journalDate = format(new Date(journal.journal_date), 'yyyy年M月d日(E)', { locale: ja });

    let message = `📝 ${journalDate}\n\n`;
    message += `🐕 ${journal.dog_name}\n`;
    if (journal.staff_name) {
      message += `👤 ${journal.staff_name}\n`;
    }
    message += `\n`;

    if (journal.morning_toilet_status) {
      message += `午前のトイレ: ${journal.morning_toilet_status}\n`;
    }
    if (journal.afternoon_toilet_status) {
      message += `午後のトイレ: ${journal.afternoon_toilet_status}\n`;
    }

    if (journal.comment) {
      message += `\n${journal.comment}`;
    }

    await client.replyMessage(replyToken, {
      type: 'text',
      text: message,
      quickReply: createQuickReply(),
    });
  } catch (error: any) {
      console.error('Error sending journal detail:', error);
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '日誌情報の取得に失敗しました。',
    }, false);
  }
}

/**
 * 契約情報を送信
 */
async function sendContracts(
  client: Client,
  lineUserId: string,
  ownerId: number,
  replyToken: string
): Promise<void> {
  try {
    // 飼い主の犬を取得
    const dogsResult = await pool.query(
      `SELECT id FROM dogs WHERE owner_id = $1`,
      [ownerId]
    );

    if (dogsResult.rows.length === 0) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '登録されている犬がいません。',
        quickReply: createQuickReply(),
      });
      return;
    }

    const dogIds = dogsResult.rows.map((d: any) => d.id);

    // 契約情報を取得
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
        text: '有効な契約情報はありません。',
        quickReply: createQuickReply(),
      });
      return;
    }

    // 最初のメッセージをreplyTokenで送信
    await client.replyMessage(replyToken, {
      type: 'text',
      text: `📋 契約情報（${contractsResult.rows.length}件）`,
    });

    // 各契約をFlexメッセージで送信（pushMessageを使用）
    for (const contract of contractsResult.rows) {
      // 残回数を計算
      let calculatedRemaining = null;
      if (contract.contract_type !== '月謝制') {
        const usedResult = await pool.query(
          `SELECT COUNT(*) as used_count
           FROM reservations r
           WHERE r.dog_id = $1 
             AND r.status IN ('チェックイン済', '予定')
             AND r.reservation_date >= $2
             AND r.reservation_date <= COALESCE($3, CURRENT_DATE + INTERVAL '1 year')`,
          [contract.dog_id, contract.created_at, contract.valid_until]
        );
        const usedCount = parseInt(usedResult.rows[0]?.used_count || '0', 10);
        calculatedRemaining = Math.max(0, (contract.total_sessions || 0) - usedCount);
      }

      const message = createContractFlexMessage(contract, calculatedRemaining);
      await client.pushMessage(lineUserId, message, false);
    }

    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '予約を作成するには「予約する」と送信してください。',
      quickReply: createQuickReply(),
    }, false);
  } catch (error: any) {
      console.error('Error sending contracts:', error);
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '契約情報の取得に失敗しました。',
    }, false);
  }
}

/**
 * ヘルプメッセージを送信
 */
async function sendHelp(
  client: Client,
  lineUserId: string,
  replyToken: string
): Promise<void> {
  const helpMessage = createHelpMessage();
  await client.replyMessage(replyToken, helpMessage);
}
