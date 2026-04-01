import pool from '../db/connection.js';
import {
  sendLineMessageDetailed,
  sendLineFlexMessageDetailed,
} from './lineMessagingService.js';
import { sendEmail } from './emailService.js';
import {
  createReservationReminderFlexMessage,
  createRecordNotificationLegacyFlexMessage,
  createRecordNotificationFlexMessage,
  getReservationReminderCopy,
  createVaccineAlertFlexMessage,
} from './lineFlexMessages.js';
import { type BusinessType } from '../utils/businessTypes.js';
import type { FlexMessage } from '@line/bot-sdk';
import { getDaysAgoJST } from '../utils/date.js';

export type OwnerContact = { lineId: string | null; email: string | null };

export interface NotificationData {
  storeId: number;
  ownerId: number;
  notificationType: 'reminder' | 'record' | 'vaccine_alert';
  title: string;
  message: string;
}

type NotificationSettingsRow = {
  reminder_before_visit?: boolean;
  record_notification?: boolean;
  vaccine_alert?: boolean;
  line_notification_enabled?: boolean;
  email_notification_enabled?: boolean;
};

export interface NotificationSendResult {
  sent: boolean;
  sentVia: 'line' | 'email' | 'app' | null;
  reason?: string;
}

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
    case 'record':
      return settings.record_notification === true;
    case 'vaccine_alert':
      return settings.vaccine_alert === true;
    default:
      return false;
  }
}

async function insertNotificationLog(params: {
  data: NotificationData;
  sentVia: NotificationSendResult['sentVia'];
  sent: boolean;
  errorMessage?: string;
}): Promise<void> {
  const { data, sentVia, sent, errorMessage } = params;

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
      sent ? 'sent' : 'failed',
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
}): Promise<NotificationSendResult> {
  const { storeId, settings, contact, title, message, flexMessage } = params;
  const lineId = contact?.lineId ?? null;
  const email = contact?.email ?? null;
  const failures: string[] = [];

  if (settings.line_notification_enabled) {
    if (!lineId) {
      failures.push('LINE連携済みの飼い主ではありません');
    } else {
      const lineResult = flexMessage
        ? await sendLineFlexMessageDetailed(storeId, lineId, flexMessage)
        : await sendLineMessageDetailed(storeId, lineId, `${title}\n\n${message}`);
      if (lineResult.sent) {
        return { sent: true, sentVia: 'line' };
      }
      failures.push(lineResult.reason ?? 'LINE送信に失敗しました');
    }
  } else {
    failures.push('LINE通知が無効です');
  }

  if (settings.email_notification_enabled) {
    if (!email) {
      failures.push('メールアドレスが登録されていません');
    } else {
      const emailSent = await sendEmail(
        email,
        title,
        message,
        `<h2>${title}</h2><p>${message.replace(/\n/g, '<br>')}</p>`
      );
      if (emailSent) {
        return { sent: true, sentVia: 'email' };
      }
      failures.push('メール送信に失敗しました');
    }
  } else {
    failures.push('メール通知が無効です');
  }

  console.log(`[アプリ内通知] ${title}: ${message}`);
  return {
    sent: false,
    sentVia: 'app',
    reason: failures.find(Boolean) ?? '通知の送信先がありません',
  };
}

function buildSettingsDisabledResult(
  type: NotificationData['notificationType']
): NotificationSendResult {
  const labels: Record<NotificationData['notificationType'], string> = {
    reminder: '登園前リマインド',
    record: '日誌送信通知',
    vaccine_alert: 'ワクチン期限アラート',
  };

  return {
    sent: false,
    sentVia: null,
    reason: `${labels[type]}が無効です`,
  };
}

/**
 * 設定・連絡先を渡して通知送信（設定取得・owner検索をスキップしI/O削減）
 */
export async function sendNotificationWithSettings(
  data: NotificationData,
  settings: NotificationSettingsRow,
  contact?: OwnerContact | null
): Promise<NotificationSendResult> {
  if (!shouldSendByType(settings, data.notificationType)) {
    console.log(`通知が無効です: type=${data.notificationType}, store_id=${data.storeId}`);
    const result = buildSettingsDisabledResult(data.notificationType);
    await insertNotificationLog({
      data,
      sentVia: result.sentVia,
      sent: result.sent,
      errorMessage: result.reason,
    });
    return result;
  }

  const result = await deliverNotification({
    storeId: data.storeId,
    settings,
    contact: contact ?? null,
    title: data.title,
    message: data.message,
  });

  await insertNotificationLog({
    data,
    sentVia: result.sentVia,
    sent: result.sent,
    errorMessage: result.reason,
  });

  return result;
}

/**
 * 通知を送信する（ログに記録）
 * 単発呼び出し用。バッチ時は sendNotificationWithSettings + getOwnerContactBatch を推奨。
 */
export async function sendNotification(data: NotificationData): Promise<NotificationSendResult> {
  try {
    const settingsResult = await pool.query<NotificationSettingsRow>(
      `SELECT reminder_before_visit, record_notification, vaccine_alert,
              line_notification_enabled, email_notification_enabled
       FROM notification_settings WHERE store_id = $1`,
      [data.storeId]
    );

    if (settingsResult.rows.length === 0) {
      console.warn(`通知設定が見つかりません: store_id=${data.storeId}`);
      const result: NotificationSendResult = {
        sent: false,
        sentVia: null,
        reason: '通知設定が見つかりません',
      };
      await insertNotificationLog({
        data,
        sentVia: result.sentVia,
        sent: result.sent,
        errorMessage: result.reason,
      });
      return result;
    }

    const settings = settingsResult.rows[0];
    const contactMap = await getOwnerContactBatch([data.ownerId]);
    const contact = contactMap.get(data.ownerId) ?? null;

    return await sendNotificationWithSettings(data, settings, contact);
  } catch (error) {
    console.error('Error sending notification:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    try {
      await insertNotificationLog({
        data,
        sentVia: null,
        sent: false,
        errorMessage: message,
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
      const targetDateStr = getDaysAgoJST(-daysBefore);

      const reservationsResult = await pool.query<{
        id: number;
        owner_id: number;
        dog_name: string;
        reservation_date: string;
        reservation_time: string;
        service_type: BusinessType | null;
      }>(
        `SELECT r.id, d.owner_id, d.name as dog_name, r.reservation_date, r.reservation_time,
                COALESCE(r.service_type, 'daycare') as service_type
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
        const copy = getReservationReminderCopy(reservation.service_type);
        const message = `${reservation.dog_name}ちゃんの${copy.checkInLabel}予定が${daysBefore}日後（${targetDateStr}）です。`;

        const flexMessage = createReservationReminderFlexMessage({
          id: reservation.id,
          reservation_date: reservation.reservation_date,
          reservation_time: reservation.reservation_time,
          dog_name: reservation.dog_name,
          service_type: copy.serviceType,
        });

        const result = await deliverNotification({
          storeId: settings.store_id,
          settings,
          contact,
          title,
          message: `${message}\n\n${copy.guideText.replace('ご入力ください。', 'アプリからご入力ください。')}`,
          flexMessage,
        });

        if (result.sent) { sent++; } else { failed++; }

        await insertNotificationLog({
          data: { storeId: settings.store_id, ownerId: reservation.owner_id, notificationType: 'reminder', title, message },
          sentVia: result.sentVia,
          sent: result.sent,
          errorMessage: result.reason,
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
export async function sendRecordNotificationLegacy(
  storeId: number,
  ownerId: number,
  dogName: string,
  recordDate: string,
  recordId?: number,
  comment?: string | null,
  photos?: string[] | null
): Promise<NotificationSendResult> {
  const title = '記録が更新されました';
  const message = `${dogName}ちゃんの${recordDate}の記録が更新されました。`;

  try {
    const settingsResult = await pool.query<NotificationSettingsRow>(
      `SELECT record_notification, line_notification_enabled, email_notification_enabled
       FROM notification_settings WHERE store_id = $1`,
      [storeId]
    );

    if (settingsResult.rows.length === 0) {
      const result: NotificationSendResult = {
        sent: false,
        sentVia: null,
        reason: '通知設定が見つかりません',
      };
      await insertNotificationLog({
        data: { storeId, ownerId, notificationType: 'record', title, message },
        sentVia: result.sentVia,
        sent: result.sent,
        errorMessage: result.reason,
      });
      return result;
    }

    const settings = settingsResult.rows[0];
    if (!settings.record_notification) {
      const result: NotificationSendResult = {
        sent: false,
        sentVia: null,
        reason: '日誌送信通知が無効です',
      };
      await insertNotificationLog({
        data: { storeId, ownerId, notificationType: 'record', title, message },
        sentVia: result.sentVia,
        sent: result.sent,
        errorMessage: result.reason,
      });
      return result;
    }

    const contactMap = await getOwnerContactBatch([ownerId]);
    const contact = contactMap.get(ownerId) ?? null;
    const flexMessage = recordId
      ? createRecordNotificationLegacyFlexMessage({ id: recordId, record_date: recordDate, dog_name: dogName, comment, photos })
      : undefined;

    const result = await deliverNotification({
      storeId,
      settings,
      contact,
      title,
      message: `${message}\n\nアプリから詳細をご確認ください。`,
      flexMessage,
    });

    await insertNotificationLog({
      data: { storeId, ownerId, notificationType: 'record', title, message },
      sentVia: result.sentVia,
      sent: result.sent,
      errorMessage: result.reason,
    });

    return result;
  } catch (error) {
    console.error('Error sending record notification:', error);
    const result: NotificationSendResult = {
      sent: false,
      sentVia: null,
      reason: error instanceof Error ? error.message : 'カルテ通知の送信に失敗しました',
    };
    await insertNotificationLog({
      data: { storeId, ownerId, notificationType: 'record', title, message },
      sentVia: result.sentVia,
      sent: result.sent,
      errorMessage: result.reason,
    });
    return result;
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
): Promise<NotificationSendResult> {
  const typeLabels: Record<string, string> = {
    grooming: 'トリミングカルテ',
    daycare: 'デイケアカルテ',
    hotel: 'ホテルカルテ',
  };
  const typeLabel = typeLabels[record.record_type] ?? 'カルテ';
  const title = `${typeLabel}が届きました`;
  const message = `${record.dog_name}ちゃんの${typeLabel}が共有されました。`;

  try {
    const settingsResult = await pool.query<NotificationSettingsRow>(
      `SELECT record_notification, line_notification_enabled, email_notification_enabled
       FROM notification_settings WHERE store_id = $1`,
      [storeId]
    );

    let settings: NotificationSettingsRow;
    if (settingsResult.rows.length === 0) {
      console.log(`通知設定をデフォルト作成します: store_id=${storeId}`);
      await pool.query(
        `INSERT INTO notification_settings (store_id, record_notification, line_notification_enabled)
         VALUES ($1, TRUE, TRUE)
         ON CONFLICT DO NOTHING`,
        [storeId]
      );
      settings = { record_notification: true, line_notification_enabled: true, email_notification_enabled: false };
    } else {
      settings = settingsResult.rows[0];
    }

    if (!settings.record_notification) {
      const result: NotificationSendResult = {
        sent: false,
        sentVia: null,
        reason: '日誌送信通知が無効です',
      };
      await insertNotificationLog({
        data: { storeId, ownerId, notificationType: 'record', title, message },
        sentVia: result.sentVia,
        sent: result.sent,
        errorMessage: result.reason,
      });
      return result;
    }

    const contactMap = await getOwnerContactBatch([ownerId]);
    const contact = contactMap.get(ownerId) ?? null;
    const flexMessage = createRecordNotificationFlexMessage(record);

    const result = await deliverNotification({
      storeId,
      settings,
      contact,
      title,
      message: `${message}\n\nアプリから詳細をご確認ください。`,
      flexMessage,
    });

    await insertNotificationLog({
      data: { storeId, ownerId, notificationType: 'record', title, message },
      sentVia: result.sentVia,
      sent: result.sent,
      errorMessage: result.reason,
    });

    return result;
  } catch (error) {
    console.error('Error sending record notification:', error);
    const result: NotificationSendResult = {
      sent: false,
      sentVia: null,
      reason: error instanceof Error ? error.message : 'カルテ通知の送信に失敗しました',
    };
    await insertNotificationLog({
      data: { storeId, ownerId, notificationType: 'record', title, message },
      sentVia: result.sentVia,
      sent: result.sent,
      errorMessage: result.reason,
    });
    return result;
  }
}

/**
 * 店舗オーナー向けの決済失敗通知を送信（主にメール）。
 */
export async function sendStoreOwnerPaymentFailedNotification(params: {
  storeId: number;
  storeName: string;
  failureReason?: string | null;
}): Promise<void> {
  const { storeId, storeName, failureReason } = params;

  try {
    const staffResult = await pool.query<{ email: string | null; name: string | null }>(
      `SELECT s.email, s.name
       FROM staff s
       JOIN staff_stores ss ON s.id = ss.staff_id
       WHERE ss.store_id = $1 AND s.is_owner = true
       ORDER BY s.created_at ASC`,
      [storeId]
    );

    if (staffResult.rows.length === 0) {
      console.warn(`決済失敗通知: スタッフが見つかりません (store_id=${storeId})`);
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const subject = '【Blink】お支払いに失敗しました';
    const reasonLine = failureReason ? `\n理由: ${failureReason}` : '';
    const message = `${storeName}のお支払いが失敗しました。カード情報を更新してください。${reasonLine}\n\n更新しない場合、サービスが一時停止される場合があります。`;
    const actionUrl = `${frontendUrl}/billing`;

    const htmlMessage = `<h2>${subject}</h2><p>${message.replace(/\n/g, '<br>')}</p><p><a href="${actionUrl}">カード情報を更新する</a></p><hr><p style=\"color:#999;font-size:12px\">Blink - ペットサロン管理システム</p>`;

    for (const staff of staffResult.rows) {
      if (!staff.email) continue;
      await sendEmail(staff.email, subject, `${message}\n\n${actionUrl}`, htmlMessage);
    }
  } catch (error) {
    console.error('Failed to notify payment failure:', error);
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
      const alertDateStr = getDaysAgoJST(-alertDays);

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
          errorMessage: result.reason,
        });
      }
    }
  } catch (error) {
    console.error('Error sending vaccine alerts:', error);
  }
  return { sent, failed };
}
