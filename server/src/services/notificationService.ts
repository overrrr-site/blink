import pool from '../db/connection.js';
import { sendLineMessage, sendLineFlexMessage } from './lineMessagingService.js';
import { sendEmail } from './emailService.js';
import {
  createReservationReminderFlexMessage,
  createJournalNotificationFlexMessage,
  createRecordNotificationFlexMessage,
  createVaccineAlertFlexMessage,
} from './lineFlexMessages.js';
import type { FlexMessage } from '@line/bot-sdk';

export type OwnerContact = { lineId: string | null; email: string | null };

export interface NotificationData {
  storeId: number;
  ownerId: number;
  notificationType: 'reminder' | 'journal' | 'record' | 'vaccine_alert';
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

/**
 * 空文字をnullに正規化する
 */
function emptyToNull(value: string | null): string | null {
  return value?.trim() || null;
}

/**
 * 飼い主のLINE ID・メールを一括取得（ループ内I/O削減用）
 */
export async function getOwnerContactBatch(
  ownerIds: number[]
): Promise<Map<number, OwnerContact>> {
  const map = new Map<number, OwnerContact>();
  if (ownerIds.length === 0) return map;

  const uniqueIds = [...new Set(ownerIds)];

  try {
    const result = await pool.query<{ id: number; line_id: string | null; email: string | null }>(
      `SELECT id, line_id, email FROM owners WHERE id = ANY($1::int[])`,
      [uniqueIds]
    );

    for (const row of result.rows) {
      map.set(row.id, { lineId: emptyToNull(row.line_id), email: emptyToNull(row.email) });
    }
  } catch (error) {
    console.error('Error fetching owner contacts batch:', error);
  }

  // 見つからなかったIDにはデフォルト値を設定
  for (const id of uniqueIds) {
    if (!map.has(id)) map.set(id, { lineId: null, email: null });
  }

  return map;
}

function shouldSendByType(
  settings: NotificationSettingsRow,
  type: NotificationData['notificationType']
): boolean {
  switch (type) {
    case 'reminder':
      return settings.reminder_before_visit === true;
    case 'journal':
    case 'record':
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

  let status: string;
  if (errorMessage) {
    status = 'failed';
  } else if (sent) {
    status = 'sent';
  } else {
    status = 'pending';
  }
  await pool.query(
    `INSERT INTO notification_logs (
      store_id, owner_id, notification_type, title, message,
      sent_via, status, sent_at, error_message
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      data.storeId,
      data.ownerId,
      data.notificationType,
      data.title,
      data.message,
      sentVia,
      status,
      sent ? new Date() : null,
      errorMessage ?? null,
    ]
  );
}

/**
 * LINE/メール/アプリ内通知のフォールバック送信を共通化。
 * flexMessage が渡されればLINEはFlex送信、なければテキスト送信。
 */
async function deliverNotification(params: {
  storeId: number;
  settings: NotificationSettingsRow;
  contact: OwnerContact | null;
  title: string;
  message: string;
  flexMessage?: FlexMessage;
}): Promise<{ sent: boolean; sentVia: string }> {
  const { storeId, settings, contact, title, message, flexMessage } = params;
  const lineId = contact?.lineId ?? null;
  const email = contact?.email ?? null;

  // 1. LINE通知を試行
  if (settings.line_notification_enabled && lineId) {
    const lineSent = flexMessage
      ? await sendLineFlexMessage(storeId, lineId, flexMessage)
      : await sendLineMessage(storeId, lineId, `${title}\n\n${message}`);
    if (lineSent) {
      return { sent: true, sentVia: 'line' };
    }
  }

  // 2. LINEで送信できなかった場合はメール通知
  if (settings.email_notification_enabled && email) {
    const emailSent = await sendEmail(
      email,
      title,
      message,
      `<h2>${title}</h2><p>${message.replace(/\n/g, '<br>')}</p>`
    );
    if (emailSent) {
      return { sent: true, sentVia: 'email' };
    }
  }

  // 3. いずれも送信できなかった場合はアプリ内通知
  console.log(`[アプリ内通知] ${title}: ${message}`);
  return { sent: false, sentVia: 'app' };
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

  const { sent, sentVia } = await deliverNotification({
    storeId: data.storeId,
    settings,
    contact: contact ?? null,
    title: data.title,
    message: data.message,
  });

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
export async function sendReservationReminders(): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
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

      for (const reservation of rows) {
        const contact = contactMap.get(reservation.owner_id) ?? null;
        const title = '予約リマインド';
        const message = `${reservation.dog_name}ちゃんの予約が${daysBefore}日後（${targetDateStr}）です。`;

        const flexMessage = createReservationReminderFlexMessage({
          id: reservation.id,
          reservation_date: reservation.reservation_date,
          reservation_time: reservation.reservation_time,
          dog_name: reservation.dog_name,
        });

        const result = await deliverNotification({
          storeId: settings.store_id,
          settings,
          contact,
          title,
          message: `${message}\n\n登園前に体調や食事の情報をアプリからご入力ください。`,
          flexMessage,
        });

        if (result.sent) { sent++; } else { failed++; }

        await insertNotificationLog({
          data: { storeId: settings.store_id, ownerId: reservation.owner_id, notificationType: 'reminder', title, message },
          sentVia: result.sentVia,
          sent: result.sent,
        });
      }
    }
  } catch (error) {
    console.error('Error sending reservation reminders:', error);
  }
  return { sent, failed };
}

/**
 * 日誌通知を送信（Flexメッセージ対応）
 */
export async function sendJournalNotification(
  storeId: number,
  ownerId: number,
  dogName: string,
  journalDate: string,
  journalId?: number,
  comment?: string | null,
  photos?: string[] | null
): Promise<void> {
  try {
    const settingsResult = await pool.query<NotificationSettingsRow>(
      `SELECT journal_notification, line_notification_enabled, email_notification_enabled
       FROM notification_settings WHERE store_id = $1`,
      [storeId]
    );

    if (settingsResult.rows.length === 0) {
      console.warn(`通知設定が見つかりません: store_id=${storeId}`);
      return;
    }

    const settings = settingsResult.rows[0];
    if (!settings.journal_notification) {
      console.log(`日誌通知が無効です: store_id=${storeId}`);
      return;
    }

    const contactMap = await getOwnerContactBatch([ownerId]);
    const contact = contactMap.get(ownerId) ?? null;

    const title = '日誌が更新されました';
    const message = `${dogName}ちゃんの${journalDate}の日誌が更新されました。`;

    const flexMessage = journalId
      ? createJournalNotificationFlexMessage({ id: journalId, journal_date: journalDate, dog_name: dogName, comment, photos })
      : undefined;

    const { sent, sentVia } = await deliverNotification({
      storeId,
      settings,
      contact,
      title,
      message: `${message}\n\nアプリから詳細をご確認ください。`,
      flexMessage,
    });

    await insertNotificationLog({
      data: { storeId, ownerId, notificationType: 'journal', title, message },
      sentVia,
      sent,
    });
  } catch (error) {
    console.error('Error sending journal notification:', error);
  }
}

/**
 * カルテ共有通知を送信（Flexメッセージ対応・業種別カラー）
 */
export async function sendRecordNotification(
  storeId: number,
  ownerId: number,
  record: {
    id: number;
    record_date: string;
    record_type: string;
    dog_name: string;
    report_text?: string | null;
    photos?: string[] | null;
  }
): Promise<void> {
  try {
    const settingsResult = await pool.query<NotificationSettingsRow>(
      `SELECT journal_notification, line_notification_enabled, email_notification_enabled
       FROM notification_settings WHERE store_id = $1`,
      [storeId]
    );

    if (settingsResult.rows.length === 0) {
      console.warn(`通知設定が見つかりません: store_id=${storeId}`);
      return;
    }

    const settings = settingsResult.rows[0];
    if (!settings.journal_notification) {
      console.log(`カルテ通知が無効です: store_id=${storeId}`);
      return;
    }

    const contactMap = await getOwnerContactBatch([ownerId]);
    const contact = contactMap.get(ownerId) ?? null;

    const typeLabels: Record<string, string> = {
      grooming: 'グルーミングカルテ',
      daycare: 'デイケアカルテ',
      hotel: 'ホテルカルテ',
    };
    const typeLabel = typeLabels[record.record_type] ?? 'カルテ';

    const title = `${typeLabel}が届きました`;
    const message = `${record.dog_name}ちゃんの${typeLabel}が共有されました。`;

    const flexMessage = createRecordNotificationFlexMessage(record);

    const { sent, sentVia } = await deliverNotification({
      storeId,
      settings,
      contact,
      title,
      message: `${message}\n\nアプリから詳細をご確認ください。`,
      flexMessage,
    });

    await insertNotificationLog({
      data: { storeId, ownerId, notificationType: 'record', title, message },
      sentVia,
      sent,
    });
  } catch (error) {
    console.error('Error sending record notification:', error);
  }
}

/**
 * ワクチンアラート通知を送信
 * 店舗ごとに設定1回・犬一覧1回・owner連絡先1括取得でI/O削減
 */
export async function sendVaccineAlerts(): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
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
        if (alerts.length === 0) continue;

        const contact = contactMap.get(dog.owner_id) ?? null;
        const title = 'ワクチン期限切れ間近';
        const message = `${dog.name}ちゃんの${alerts.join('・')}の期限が${alertDays}日以内に切れます。`;

        const flexMessage = createVaccineAlertFlexMessage({
          dog_name: dog.name,
          alerts,
          alert_days: alertDays,
        });

        const result = await deliverNotification({
          storeId: settings.store_id,
          settings,
          contact,
          title,
          message: `${message}\n\n早めの接種をお願いいたします。`,
          flexMessage,
        });

        if (result.sent) { sent++; } else { failed++; }

        await insertNotificationLog({
          data: { storeId: settings.store_id, ownerId: dog.owner_id, notificationType: 'vaccine_alert', title, message },
          sentVia: result.sentVia,
          sent: result.sent,
        });
      }
    }
  } catch (error) {
    console.error('Error sending vaccine alerts:', error);
  }
  return { sent, failed };
}
