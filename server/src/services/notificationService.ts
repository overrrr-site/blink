import pool from '../db/connection.js';
import { sendLineMessage, getOwnerLineId } from './lineMessagingService.js';
import { sendEmail, getOwnerEmail } from './emailService.js';

export interface NotificationData {
  storeId: number;
  ownerId: number;
  notificationType: 'reminder' | 'journal' | 'vaccine_alert';
  title: string;
  message: string;
}

/**
 * 通知を送信する（ログに記録）
 * 実際の送信（LINE/メール）は別途実装が必要
 */
export async function sendNotification(data: NotificationData): Promise<void> {
  try {
    // 通知設定を取得
    const settingsResult = await pool.query(
      `SELECT * FROM notification_settings WHERE store_id = $1`,
      [data.storeId]
    );

    if (settingsResult.rows.length === 0) {
      console.warn(`通知設定が見つかりません: store_id=${data.storeId}`);
      return;
    }

    const settings = settingsResult.rows[0];

    // 通知タイプごとの設定チェック
    let shouldSend = false;
    let sentVia: string | null = null;

    switch (data.notificationType) {
      case 'reminder':
        shouldSend = settings.reminder_before_visit === true;
        break;
      case 'journal':
        shouldSend = settings.journal_notification === true;
        break;
      case 'vaccine_alert':
        shouldSend = settings.vaccine_alert === true;
        break;
    }

    if (!shouldSend) {
      console.log(`通知が無効です: type=${data.notificationType}, store_id=${data.storeId}`);
      return;
    }

    // 送信方法を決定（LINE優先、次にメール）
    let sent = false;
    
    if (settings.line_notification_enabled) {
      const lineId = await getOwnerLineId(data.ownerId);
      if (lineId) {
        const lineSent = await sendLineMessage(lineId, `${data.title}\n\n${data.message}`);
        if (lineSent) {
          sentVia = 'line';
          sent = true;
        }
      }
    }

    if (!sent && settings.email_notification_enabled) {
      const email = await getOwnerEmail(data.ownerId);
      if (email) {
        const emailSent = await sendEmail(
          email,
          data.title,
          data.message,
          `<h2>${data.title}</h2><p>${data.message.replace(/\n/g, '<br>')}</p>`
        );
        if (emailSent) {
          sentVia = 'email';
          sent = true;
        }
      }
    }

    if (!sent) {
      sentVia = 'app';
      // アプリ内通知のみ（ログに記録）
      console.log(`[アプリ内通知] ${data.title}: ${data.message}`);
    }

    // 通知ログに記録
    await pool.query(
      `INSERT INTO notification_logs (
        store_id, owner_id, notification_type, title, message,
        sent_via, status, sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.storeId,
        data.ownerId,
        data.notificationType,
        data.title,
        data.message,
        sentVia,
        sent ? 'sent' : 'pending',
        sent ? new Date() : null,
      ]
    );
    } catch (error) {
      console.error('Error sending notification:', error);
      // エラーログも記録
      try {
        await pool.query(
          `INSERT INTO notification_logs (
            store_id, owner_id, notification_type, title, message,
            status, error_message
          ) VALUES ($1, $2, $3, $4, $5, 'failed', $6)`,
          [
            data.storeId,
            data.ownerId,
            data.notificationType,
            data.title,
            data.message,
            error instanceof Error ? error.message : 'Unknown error',
          ]
        );
      } catch (logError) {
        console.error('Error logging notification failure:', logError);
      }
      throw error; // エラーを再スローして呼び出し元で処理できるようにする
    }
}

/**
 * 予約リマインド通知を送信（予約前日に実行）
 */
export async function sendReservationReminders(): Promise<void> {
  try {
    // 通知設定を取得（リマインドが有効な店舗のみ）
    const settingsResult = await pool.query(
      `SELECT * FROM notification_settings WHERE reminder_before_visit = true`
    );

    for (const settings of settingsResult.rows) {
      const daysBefore = settings.reminder_before_visit_days || 1;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBefore);

      // 該当日の予約を取得
      const reservationsResult = await pool.query(
        `SELECT r.*, d.owner_id, d.name as dog_name, o.name as owner_name
         FROM reservations r
         JOIN dogs d ON r.dog_id = d.id
         JOIN owners o ON d.owner_id = o.id
         WHERE r.store_id = $1
           AND r.reservation_date = $2
           AND r.status != 'キャンセル'
           AND o.deleted_at IS NULL`,
        [settings.store_id, targetDate.toISOString().split('T')[0]]
      );

      for (const reservation of reservationsResult.rows) {
        await sendNotification({
          storeId: settings.store_id,
          ownerId: reservation.owner_id,
          notificationType: 'reminder',
          title: '予約リマインド',
          message: `${reservation.dog_name}ちゃんの予約が${daysBefore}日後（${targetDate.toISOString().split('T')[0]}）です。`,
        });
      }
    }
  } catch (error) {
    console.error('Error sending reservation reminders:', error);
  }
}

/**
 * 日誌通知を送信
 */
export async function sendJournalNotification(
  storeId: number,
  ownerId: number,
  dogName: string,
  journalDate: string
): Promise<void> {
  await sendNotification({
    storeId,
    ownerId,
    notificationType: 'journal',
    title: '日誌が更新されました',
    message: `${dogName}ちゃんの${journalDate}の日誌が更新されました。`,
  });
}

/**
 * ワクチンアラート通知を送信
 */
export async function sendVaccineAlerts(): Promise<void> {
  try {
    // 通知設定を取得（ワクチンアラートが有効な店舗のみ）
    const settingsResult = await pool.query(
      `SELECT * FROM notification_settings WHERE vaccine_alert = true`
    );

    for (const settings of settingsResult.rows) {
      const alertDays = settings.vaccine_alert_days || 14;
      const alertDate = new Date();
      alertDate.setDate(alertDate.getDate() + alertDays);

      // ワクチン期限切れ間近の犬を取得
      const dogsResult = await pool.query(
        `SELECT d.*, o.id as owner_id, o.name as owner_name,
                dh.mixed_vaccine_date, dh.rabies_vaccine_date
         FROM dogs d
         JOIN owners o ON d.owner_id = o.id
         LEFT JOIN dog_health dh ON d.id = dh.dog_id
         WHERE o.store_id = $1
           AND o.deleted_at IS NULL
           AND d.deleted_at IS NULL
           AND (
             (dh.mixed_vaccine_date IS NOT NULL AND dh.mixed_vaccine_date <= $2)
             OR (dh.rabies_vaccine_date IS NOT NULL AND dh.rabies_vaccine_date <= $2)
           )`,
        [settings.store_id, alertDate.toISOString().split('T')[0]]
      );

      for (const dog of dogsResult.rows) {
        const alerts: string[] = [];
        if (dog.mixed_vaccine_date && new Date(dog.mixed_vaccine_date) <= alertDate) {
          alerts.push('混合ワクチン');
        }
        if (dog.rabies_vaccine_date && new Date(dog.rabies_vaccine_date) <= alertDate) {
          alerts.push('狂犬病ワクチン');
        }

        if (alerts.length > 0) {
          await sendNotification({
            storeId: settings.store_id,
            ownerId: dog.owner_id,
            notificationType: 'vaccine_alert',
            title: 'ワクチン期限切れ間近',
            message: `${dog.name}ちゃんの${alerts.join('・')}の期限が${alertDays}日以内に切れます。`,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error sending vaccine alerts:', error);
  }
}
