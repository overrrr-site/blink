import pool from '../db/connection.js';
import { appendBusinessTypeFilter, type BusinessType } from '../utils/businessTypes.js';
import { sendRecordNotification } from './notificationService.js';

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

export async function shareRecordForOwner(storeId: number, recordId: number) {
  const recordResult = await pool.query(
    `SELECT r.*, d.name as dog_name, o.id as owner_id, o.store_id
     FROM records r
     JOIN dogs d ON r.dog_id = d.id
     JOIN owners o ON d.owner_id = o.id
     WHERE r.id = $1 AND r.store_id = $2 AND r.deleted_at IS NULL`,
    [recordId, storeId]
  );

  if (recordResult.rows.length === 0) {
    return null;
  }

  const updateResult = await pool.query(
    `UPDATE records SET status = 'shared', shared_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND store_id = $2
     RETURNING *`,
    [recordId, storeId]
  );

  const record = recordResult.rows[0];
  const photos = record.photos ? (typeof record.photos === 'string' ? JSON.parse(record.photos) : record.photos) : null;
  sendRecordNotification(
    storeId,
    record.owner_id,
    {
      id: record.id,
      record_date: record.record_date,
      record_type: record.record_type,
      dog_name: record.dog_name,
      report_text: record.report_text,
      photos,
    }
  ).catch((err) => console.error('Record notification error:', err));

  return updateResult.rows[0];
}
