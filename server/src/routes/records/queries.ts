import { appendBusinessTypeFilter, type BusinessType } from '../../utils/businessTypes.js';
import { isNonEmptyString, isNumberLike } from '../../utils/validation.js';
import { serializeJsonOrNull } from './utils.js';

export interface RecordListFilters {
  recordType?: BusinessType;
  dogId?: string;
  status?: string;
  staffId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export function buildRecordListQuery(
  storeId: number,
  filters: RecordListFilters,
  pagination: { limit: number; offset: number },
): { query: string; params: Array<string | number> } {
  let query = `
    SELECT r.*,
           d.name as dog_name, d.photo_url as dog_photo, d.breed as dog_breed,
           o.name as owner_name, o.id as owner_id,
           s.name as staff_name,
           COUNT(*) OVER() as total_count
    FROM records r
    JOIN dogs d ON r.dog_id = d.id
    JOIN owners o ON d.owner_id = o.id
    LEFT JOIN staff s ON r.staff_id = s.id
    WHERE r.store_id = $1 AND r.deleted_at IS NULL
  `;
  const params: Array<string | number> = [storeId];

  query += appendBusinessTypeFilter(params, 'r.record_type', filters.recordType);

  if (filters.dogId) {
    query += ` AND r.dog_id = $${params.length + 1}`;
    params.push(filters.dogId);
  }

  if (filters.status) {
    query += ` AND r.status = $${params.length + 1}`;
    params.push(filters.status);
  }

  if (filters.staffId && isNumberLike(filters.staffId)) {
    query += ` AND r.staff_id = $${params.length + 1}`;
    params.push(Number(filters.staffId));
  }

  if (isNonEmptyString(filters.dateFrom)) {
    query += ` AND r.record_date >= $${params.length + 1}`;
    params.push(filters.dateFrom);
  }

  if (isNonEmptyString(filters.dateTo)) {
    query += ` AND r.record_date <= $${params.length + 1}`;
    params.push(filters.dateTo);
  }

  if (filters.search) {
    query += ` AND (d.name ILIKE $${params.length + 1} OR o.name ILIKE $${params.length + 1})`;
    params.push(`%${filters.search}%`);
  }

  query += ` ORDER BY r.record_date DESC, r.created_at DESC`;
  query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(pagination.limit, pagination.offset);

  return { query, params };
}

export interface RecordUpdateInput {
  recordType?: BusinessType;
  recordDate?: string;
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

export function buildRecordUpdateStatement(input: RecordUpdateInput): {
  setClauses: string[];
  params: unknown[];
} {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  const addParam = (column: string, value: unknown, isJson = false) => {
    if (value !== undefined) {
      const castSuffix = isJson ? '::jsonb' : '';
      setClauses.push(`${column} = $${paramIndex}${castSuffix}`);
      params.push(isJson ? serializeJsonOrNull(value) : value);
      paramIndex += 1;
    }
  };

  addParam('record_type', input.recordType);
  addParam('record_date', input.recordDate);
  addParam('grooming_data', input.groomingData, true);
  addParam('daycare_data', input.daycareData, true);
  addParam('hotel_data', input.hotelData, true);
  addParam('notes', input.notes, true);
  addParam('condition', input.condition, true);
  addParam('health_check', input.healthCheck, true);
  addParam('ai_generated_text', input.aiGeneratedText);
  addParam('ai_suggestions', input.aiSuggestions, true);
  addParam('status', input.status);

  return {
    setClauses,
    params,
  };
}
