import pool from '../../db/connection.js';
import { processRecordPhotos } from '../../services/recordPhotos.js';
import type { BusinessType } from '../../utils/businessTypes.js';
import { buildRecordUpdateStatement, type RecordUpdateInput } from './queries.js';
import { serializeJsonOrNull } from './utils.js';

export async function fetchRecordDetail(id: string, storeId: number) {
  const result = await pool.query(
    `SELECT r.*,
            d.name as dog_name, d.photo_url as dog_photo, d.breed as dog_breed,
            d.birth_date as dog_birth_date, d.gender as dog_gender,
            o.name as owner_name, o.id as owner_id,
            s.name as staff_name
     FROM records r
     JOIN dogs d ON r.dog_id = d.id
     JOIN owners o ON d.owner_id = o.id
     LEFT JOIN staff s ON r.staff_id = s.id
     WHERE r.id = $1 AND r.store_id = $2 AND r.deleted_at IS NULL`,
    [id, storeId],
  );

  return result.rows[0] ?? null;
}

interface CreateRecordInput {
  storeId: number;
  userId?: number;
  dogId: number;
  reservationId?: number | null;
  recordType: BusinessType;
  recordDate: string;
  groomingData?: unknown;
  daycareData?: unknown;
  hotelData?: unknown;
  photos?: unknown;
  notes?: unknown;
  condition?: unknown;
  healthCheck?: unknown;
  aiGeneratedText?: string | null;
  aiSuggestions?: unknown;
  status?: string;
}

export async function createRecord(input: CreateRecordInput) {
  const processedPhotos = input.photos ? await processRecordPhotos(input.photos) : null;
  const result = await pool.query(
    `INSERT INTO records (
      store_id, dog_id, reservation_id, staff_id,
      record_type, record_date,
      grooming_data, daycare_data, hotel_data,
      photos, notes, condition, health_check,
      ai_generated_text, ai_suggestions, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      input.storeId,
      input.dogId,
      input.reservationId || null,
      input.userId,
      input.recordType,
      input.recordDate,
      serializeJsonOrNull(input.groomingData),
      serializeJsonOrNull(input.daycareData),
      serializeJsonOrNull(input.hotelData),
      serializeJsonOrNull(processedPhotos),
      serializeJsonOrNull(input.notes),
      serializeJsonOrNull(input.condition),
      serializeJsonOrNull(input.healthCheck),
      input.aiGeneratedText || null,
      serializeJsonOrNull(input.aiSuggestions),
      input.status || 'draft',
    ],
  );

  return result.rows[0];
}

export async function recordExists(id: string, storeId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM records
     WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
    [id, storeId],
  );

  return result.rows.length > 0;
}

interface UpdateRecordArgs {
  id: string;
  storeId: number;
  input: RecordUpdateInput;
}

export async function updateRecord({ id, storeId, input }: UpdateRecordArgs) {
  const { setClauses, params } = buildRecordUpdateStatement(input);
  let paramIndex = params.length + 1;

  if (input.photos !== undefined) {
    const processedPhotos = input.photos ? await processRecordPhotos(input.photos) : null;
    setClauses.push(`photos = $${paramIndex}::jsonb`);
    params.push(serializeJsonOrNull(processedPhotos));
    paramIndex += 1;
  }

  if (setClauses.length === 0) {
    return { record: null, updated: false };
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);
  params.push(storeId);

  const result = await pool.query(
    `UPDATE records SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex} AND store_id = $${paramIndex + 1} AND deleted_at IS NULL
     RETURNING *`,
    params,
  );

  return {
    record: result.rows[0] ?? null,
    updated: true,
  };
}

export async function softDeleteRecord(id: string, storeId: number) {
  const result = await pool.query(
    `UPDATE records SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [id, storeId],
  );

  return result.rows[0] ?? null;
}

export async function fetchShareTarget(id: string, storeId: number) {
  const result = await pool.query(
    `SELECT record_type, grooming_data
     FROM records
     WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
    [id, storeId],
  );

  return result.rows[0] ?? null;
}
