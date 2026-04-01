import pool from '../db/connection.js';
import { appendBusinessTypeFilter, type BusinessType } from '../utils/businessTypes.js';
import { sendRecordNotification } from './notificationService.js';

type ShareRecordSuccess = {
  ok: true;
  record: Record<string, unknown>;
};

type ShareRecordNotFound = {
  ok: false;
  kind: 'not_found';
};

type ShareRecordNotificationFailure = {
  ok: false;
  kind: 'notification_failed';
  code: 'RECORD_SHARE_NOTIFICATION_FAILED';
  reason: string;
};

export type ShareRecordResult =
  | ShareRecordSuccess
  | ShareRecordNotFound
  | ShareRecordNotificationFailure;

export async function ensureDogBelongsToStore(dogId: number, storeId: number): Promise<boolean> {
  const dogCheck = await pool.query(
    `SELECT o.store_id FROM dogs d
     JOIN owners o ON d.owner_id = o.id
     WHERE d.id = $1 AND o.store_id = $2`,
    [dogId, storeId]
  );
  return dogCheck.rows.length > 0;
}

export async function fetchLatestRecordForDog(
  dogId: number,
  storeId: number,
  recordType?: BusinessType
): Promise<Record<string, unknown> | null> {
  let query = `
    SELECT r.*
    FROM records r
    WHERE r.dog_id = $1 AND r.store_id = $2 AND r.deleted_at IS NULL
  `;
  const params: Array<string | number> = [dogId, storeId];

  query += appendBusinessTypeFilter(params, 'r.record_type', recordType);
  query += ` ORDER BY r.record_date DESC, r.created_at DESC LIMIT 1`;

  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

export async function shareRecordForOwner(storeId: number, recordId: number): Promise<ShareRecordResult> {
  const recordResult = await pool.query(
    `SELECT r.*, d.name as dog_name, o.id as owner_id, o.store_id
     FROM records r
     JOIN dogs d ON r.dog_id = d.id
     JOIN owners o ON d.owner_id = o.id
     WHERE r.id = $1 AND r.store_id = $2 AND r.deleted_at IS NULL`,
    [recordId, storeId]
  );

  if (recordResult.rows.length === 0) {
    return { ok: false, kind: 'not_found' };
  }

  const originalRecord = recordResult.rows[0];
  const updateResult = await pool.query(
    `UPDATE records SET status = 'shared', shared_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND store_id = $2
     RETURNING *`,
    [recordId, storeId]
  );

  const photos = originalRecord.photos
    ? (typeof originalRecord.photos === 'string' ? JSON.parse(originalRecord.photos) : originalRecord.photos)
    : null;
  const notificationResult = await sendRecordNotification(
    storeId,
    originalRecord.owner_id,
    {
      id: originalRecord.id,
      record_date: originalRecord.record_date,
      record_type: originalRecord.record_type,
      dog_name: originalRecord.dog_name,
      report_text: originalRecord.report_text,
      photos,
    }
  );

  if (!(notificationResult.sent && (notificationResult.sentVia === 'line' || notificationResult.sentVia === 'email'))) {
    await pool.query(
      `UPDATE records
       SET status = $3, shared_at = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND store_id = $2`,
      [recordId, storeId, originalRecord.status, originalRecord.shared_at ?? null]
    );
    return {
      ok: false,
      kind: 'notification_failed',
      code: 'RECORD_SHARE_NOTIFICATION_FAILED',
      reason: notificationResult.reason ?? '通知の送信に失敗しました',
    };
  }

  return { ok: true, record: updateResult.rows[0] };
}
