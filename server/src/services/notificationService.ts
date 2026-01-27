import pool from '../db/connection.js';
import { sendLineMessage, sendLineFlexMessage } from './lineMessagingService.js';
import { sendEmail } from './emailService.js';
import { createReservationReminderFlexMessage } from './lineFlexMessages.js';

export type OwnerContact = { lineId: string | null; email: string | null };

/**
 * 飼い主のLINE ID・メールを一括取得（ループ内I/O削減用）
 */
export async function getOwnerContactBatch(
  ownerIds: number[]
): Promise<Map<number, OwnerContact>> {
  const map = new Map<number, OwnerContact>();
  if (ownerIds.length === 0) return map;

  try {
    const uniq = [...new Set(ownerIds)];
    const result = await pool.query<{ id: number; line_id: string | null; email: string | null }>(
      `SELECT id, line_id, email FROM owners WHERE id = ANY($1::int[])`,
      [uniq]
    );

    for (const row of result.rows) {
      map.set(row.id, {
        lineId: row.line_id && row.line_id.trim() !== '' ? row.line_id : null,
        email: row.email && row.email.trim() !== '' ? row.email : null,
      });
    }
    for (const id of uniq) {
      if (!map.has(id)) map.set(id, { lineId: null, email: null });
    }
    return map;
  } catch (error) {
    console.error('Error fetching owner contacts batch:', error);
    return map;
  }
}

export interface NotificationData {
  storeId: number;
  ownerId: number;
  notificationType: 'reminder' | 'journal' | 'vaccine_alert';
  title: string;
  message: string;
}

type NotificationSettingsRow = {
  reminder_before_visit?: boolean;
  journal_notification?: boolean;
  vaccine_alert?: boolean;
  line_notification_enabled?: boolean;
  email_notification_enabled?: boolean;
};

function shouldSendByType(
  settings: NotificationSettingsRow,
  type: NotificationData['notificationType']
): boolean {
  switch (type) {
    case 'reminder':
      return settings.reminder_before_visit === true;
    case 'journal':
      return settings.journal_notification === true;
    case 'vaccine_alert':
      return settings.vaccine_alert === true;
    default:
      return false;
  }
}

async function insertNotificationLog(params: {
  data: NotificationData;
  sentVia: string | null;
  sent: boolean;
  errorMessage?: string;
}): Promise<void> {
  const { data, sentVia, sent, errorMessage } = params;
  if (errorMessage) {
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
        errorMessage,
      ]
    );
    return;
  }
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
}

/**
 * 設定・連絡先を渡して通知送信（設定取得・owner検索をスキップしI/O削減）
 */
export async function sendNotificationWithSettings(
  data: NotificationData,
  settings: NotificationSettingsRow,
  contact?: OwnerContact | null
): Promise<void> {
  if (!shouldSendByType(settings, data.notificationType)) {
    console.log(`通知が無効です: type=${data.notificationType}, store_id=${data.storeId}`);
    return;
  }

  let sent = false;
  let sentVia: string | null = null;
  const lineId = contact?.lineId ?? null;
  const email = contact?.email ?? null;

  if (settings.line_notification_enabled && lineId) {
    const lineSent = await sendLineMessage(
      data.storeId,
      lineId,
      `${data.title}\n\n${data.message}`
    );
    if (lineSent) {
      sentVia = 'line';
      sent = true;
    }
  }

  if (!sent && settings.email_notification_enabled && email) {
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

  if (!sent) {
    sentVia = 'app';
    console.log(`[アプリ内通知] ${data.title}: ${data.message}`);
  }

  await insertNotificationLog({ data, sentVia, sent });
}

/**
 * 通知を送信する（ログに記録）
 * 単発呼び出し用。バッチ時は sendNotificationWithSettings + getOwnerContactBatch を推奨。
 */
export async function sendNotification(data: NotificationData): Promise<void> {
  try {
    const settingsResult = await pool.query<NotificationSettingsRow>(
      `SELECT reminder_before_visit, journal_notification, vaccine_alert,
              line_notification_enabled, email_notification_enabled
       FROM notification_settings WHERE store_id = $1`,
      [data.storeId]
    );

    if (settingsResult.rows.length === 0) {
      console.warn(`通知設定が見つかりません: store_id=${data.storeId}`);
      return;
    }

    const settings = settingsResult.rows[0];
    const contactMap = await getOwnerContactBatch([data.ownerId]);
    const contact = contactMap.get(data.ownerId) ?? null;

    await sendNotificationWithSettings(data, settings, contact);
  } catch (error) {
    console.error('Error sending notification:', error);
    try {
      await insertNotificationLog({
        data,
        sentVia: null,
        sent: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      console.error('Error logging notification failure:', logError);
    }
    throw error;
  }
}

/**
 * 予約リマインド通知を送信（予約前日に実行）
 * 店舗ごとに設定1回・予約1回・owner連絡先1括取得でI/O削減
 * LINE通知の場合はFlexメッセージ（登園前入力ボタン付き）を使用
 */
export async function sendReservationReminders(): Promise<void> {
  try {
    const settingsResult = await pool.query<NotificationSettingsRow & { store_id: number; reminder_before_visit_days?: number }>(
      `SELECT store_id, reminder_before_visit, reminder_before_visit_days,
              line_notification_enabled, email_notification_enabled
       FROM notification_settings WHERE reminder_before_visit = true`
    );

    for (const settings of settingsResult.rows) {
      const daysBefore = settings.reminder_before_visit_days ?? 1;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBefore);
      const targetDateStr = targetDate.toISOString().slice(0, 10);

      const reservationsResult = await pool.query<{
        id: number;
        owner_id: number;
        dog_name: string;
        reservation_date: string;
        reservation_time: string;
      }>(
        `SELECT r.id, d.owner_id, d.name as dog_name, r.reservation_date, r.reservation_time
         FROM reservations r
         JOIN dogs d ON r.dog_id = d.id
         JOIN owners o ON d.owner_id = o.id
         WHERE r.store_id = $1
           AND r.reservation_date = $2
           AND r.status != 'キャンセル'
           AND o.deleted_at IS NULL`,
        [settings.store_id, targetDateStr]
      );

      const rows = reservationsResult.rows;
      if (rows.length === 0) continue;

      const ownerIds = [...new Set(rows.map((r) => r.owner_id))];
      const contactMap = await getOwnerContactBatch(ownerIds);

      for (const r of rows) {
        const contact = contactMap.get(r.owner_id) ?? null;
        const lineId = contact?.lineId ?? null;
        const email = contact?.email ?? null;

        let sent = false;
        let sentVia: string | null = null;

        // LINE通知が有効な場合はFlexメッセージを送信
        if (settings.line_notification_enabled && lineId) {
          const flexMessage = createReservationReminderFlexMessage({
            id: r.id,
            reservation_date: r.reservation_date,
            reservation_time: r.reservation_time,
            dog_name: r.dog_name,
          });

          const lineSent = await sendLineFlexMessage(settings.store_id, lineId, flexMessage);
          if (lineSent) {
            sentVia = 'line';
            sent = true;
          }
        }

        // LINEで送信できなかった場合はメール通知
        if (!sent && settings.email_notification_enabled && email) {
          const title = '予約リマインド';
          const message = `${r.dog_name}ちゃんの予約が${daysBefore}日後（${targetDateStr}）です。\n\n登園前に体調や食事の情報をアプリからご入力ください。`;
          const emailSent = await sendEmail(
            email,
            title,
            message,
            `<h2>${title}</h2><p>${message.replace(/\n/g, '<br>')}</p>`
          );
          if (emailSent) {
            sentVia = 'email';
            sent = true;
          }
        }

        // ログ記録
        const notificationData = {
          storeId: settings.store_id,
          ownerId: r.owner_id,
          notificationType: 'reminder' as const,
          title: '予約リマインド',
          message: `${r.dog_name}ちゃんの予約が${daysBefore}日後（${targetDateStr}）です。`,
        };

        await pool.query(
          `INSERT INTO notification_logs (
            store_id, owner_id, notification_type, title, message,
            sent_via, status, sent_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            notificationData.storeId,
            notificationData.ownerId,
            notificationData.notificationType,
            notificationData.title,
            notificationData.message,
            sentVia ?? 'app',
            sent ? 'sent' : 'pending',
            sent ? new Date() : null,
          ]
        );
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
 * 店舗ごとに設定1回・犬一覧1回・owner連絡先1括取得でI/O削減
 */
export async function sendVaccineAlerts(): Promise<void> {
  try {
    const settingsResult = await pool.query<
      NotificationSettingsRow & { store_id: number; vaccine_alert_days?: number }
    >(
      `SELECT store_id, vaccine_alert, vaccine_alert_days,
              line_notification_enabled, email_notification_enabled
       FROM notification_settings WHERE vaccine_alert = true`
    );

    for (const settings of settingsResult.rows) {
      const alertDays = settings.vaccine_alert_days ?? 14;
      const alertDate = new Date();
      alertDate.setDate(alertDate.getDate() + alertDays);
      const alertDateStr = alertDate.toISOString().slice(0, 10);

      const dogsResult = await pool.query<{
        id: number;
        name: string;
        owner_id: number;
        mixed_vaccine_date: string | null;
        rabies_vaccine_date: string | null;
      }>(
        `SELECT d.id, d.name, o.id as owner_id,
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
        [settings.store_id, alertDateStr]
      );

      const rows = dogsResult.rows;
      if (rows.length === 0) continue;

      const ownerIds = [...new Set(rows.map((d) => d.owner_id))];
      const contactMap = await getOwnerContactBatch(ownerIds);

      for (const dog of rows) {
        const alerts: string[] = [];
        if (dog.mixed_vaccine_date && dog.mixed_vaccine_date <= alertDateStr) {
          alerts.push('混合ワクチン');
        }
        if (dog.rabies_vaccine_date && dog.rabies_vaccine_date <= alertDateStr) {
          alerts.push('狂犬病ワクチン');
        }

        if (alerts.length > 0) {
          await sendNotificationWithSettings(
            {
              storeId: settings.store_id,
              ownerId: dog.owner_id,
              notificationType: 'vaccine_alert',
              title: 'ワクチン期限切れ間近',
              message: `${dog.name}ちゃんの${alerts.join('・')}の期限が${alertDays}日以内に切れます。`,
            },
            settings,
            contactMap.get(dog.owner_id) ?? null
          );
        }
      }
    }
  } catch (error) {
    console.error('Error sending vaccine alerts:', error);
  }
}
