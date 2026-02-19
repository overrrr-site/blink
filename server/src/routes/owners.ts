import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  requireStoreId,
  sendBadRequest,
  sendNotFound,
  sendServerError,
} from '../utils/response.js';
import { buildPaginatedResponse, extractTotalCount, parsePaginationParams, PaginationParams } from '../utils/pagination.js';
import { isNonEmptyString } from '../utils/validation.js';
import type { BusinessType } from '../utils/businessTypes.js';
import { isBusinessType, parseBusinessTypeInput } from '../utils/businessTypes.js';
import { cacheControl } from '../middleware/cache.js';

function buildOwnersListQuery(params: {
  storeId: number;
  search?: string;
  serviceType?: BusinessType;
  hasOwnerBusinessTypes: boolean;
  pagination: PaginationParams;
}): { query: string; params: Array<string | number> } {
  const { storeId, search, serviceType, hasOwnerBusinessTypes, pagination } = params;
  let query = `
      SELECT o.*,
             json_agg(json_build_object(
               'id', d.id,
               'name', d.name,
               'breed', d.breed,
               'photo_url', d.photo_url
             )) FILTER (WHERE d.id IS NOT NULL AND d.deleted_at IS NULL) as dogs,
             last_res.last_reservation_date,
             COUNT(*) OVER() as total_count
      FROM owners o
      LEFT JOIN dogs d ON o.id = d.owner_id AND d.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT MAX(r.reservation_date) as last_reservation_date
        FROM reservations r
        JOIN dogs d2 ON r.dog_id = d2.id
        WHERE d2.owner_id = o.id
          AND r.status != 'キャンセル'
          AND r.store_id = o.store_id
          AND r.deleted_at IS NULL
      ) last_res ON true
      WHERE o.store_id = $1 AND o.deleted_at IS NULL
    `;
  const queryParams: Array<string | number> = [storeId];

  // 業種フィルタ:
  // - owners.business_types カラムが存在する環境では、カラム値＋予約実績で判定
  // - カラム未適用の環境では、予約実績のみで後方互換フィルタ
  if (serviceType) {
    queryParams.push(serviceType);
    const serviceTypeParam = `$${queryParams.length}`;

    if (hasOwnerBusinessTypes) {
      query += ` AND (
        o.business_types IS NULL
        OR cardinality(o.business_types) = 0
        OR ${serviceTypeParam} = ANY(o.business_types)
        OR o.business_types = ARRAY['daycare']::text[]
        OR EXISTS (
          SELECT 1
          FROM dogs d_filter
          JOIN reservations r_filter ON r_filter.dog_id = d_filter.id
          WHERE d_filter.owner_id = o.id
            AND d_filter.deleted_at IS NULL
            AND r_filter.store_id = o.store_id
            AND r_filter.deleted_at IS NULL
            AND r_filter.status != 'キャンセル'
            AND r_filter.service_type = ${serviceTypeParam}
        )
      )`;
    } else {
      query += ` AND (
        NOT EXISTS (
          SELECT 1
          FROM dogs d_any
          JOIN reservations r_any ON r_any.dog_id = d_any.id
          WHERE d_any.owner_id = o.id
            AND d_any.deleted_at IS NULL
            AND r_any.store_id = o.store_id
            AND r_any.deleted_at IS NULL
            AND r_any.status != 'キャンセル'
        )
        OR EXISTS (
          SELECT 1
          FROM dogs d_filter
          JOIN reservations r_filter ON r_filter.dog_id = d_filter.id
          WHERE d_filter.owner_id = o.id
            AND d_filter.deleted_at IS NULL
            AND r_filter.store_id = o.store_id
            AND r_filter.deleted_at IS NULL
            AND r_filter.status != 'キャンセル'
            AND r_filter.service_type = ${serviceTypeParam}
        )
      )`;
    }
  }

  if (search) {
    const searchParam = `%${search}%`;
    query += ` AND (o.name ILIKE $${queryParams.length + 1} OR o.name_kana ILIKE $${queryParams.length + 1} OR o.phone ILIKE $${queryParams.length + 1}
               OR EXISTS (SELECT 1 FROM dogs d_s WHERE d_s.owner_id = o.id AND d_s.deleted_at IS NULL
                          AND (d_s.name ILIKE $${queryParams.length + 1} OR d_s.breed ILIKE $${queryParams.length + 1})))`;
    queryParams.push(searchParam);
  }

  query += ` GROUP BY o.id, last_res.last_reservation_date ORDER BY o.created_at DESC`;
  query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  queryParams.push(pagination.limit, pagination.offset);

  return { query, params: queryParams };
}

const router = express.Router();
router.use(authenticate);

let hasOwnersBusinessTypesColumnCache: boolean | null = null;
let hasOwnersBusinessTypesColumnInFlight: Promise<boolean> | null = null;

function normalizeBusinessTypesInput(value: unknown): BusinessType[] | null {
  if (!Array.isArray(value)) return null;
  const normalized = value.filter((item): item is BusinessType => isBusinessType(item));
  return normalized.length > 0 ? normalized : null;
}

async function hasOwnersBusinessTypesColumn(): Promise<boolean> {
  if (hasOwnersBusinessTypesColumnCache !== null) {
    return hasOwnersBusinessTypesColumnCache;
  }
  if (hasOwnersBusinessTypesColumnInFlight) {
    return hasOwnersBusinessTypesColumnInFlight;
  }

  hasOwnersBusinessTypesColumnInFlight = pool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'owners'
         AND column_name = 'business_types'
     ) AS has_column`
  )
    .then((result) => {
      const hasColumn = Boolean(result.rows[0]?.has_column);
      hasOwnersBusinessTypesColumnCache = hasColumn;
      return hasColumn;
    })
    .finally(() => {
      hasOwnersBusinessTypesColumnInFlight = null;
    });

  return hasOwnersBusinessTypesColumnInFlight;
}

async function ensureOwnersBusinessTypesColumn(): Promise<void> {
  await pool.query(
    `ALTER TABLE owners
     ADD COLUMN IF NOT EXISTS business_types TEXT[] DEFAULT NULL`
  );
  hasOwnersBusinessTypesColumnCache = true;
  hasOwnersBusinessTypesColumnInFlight = null;
}

// 飼い主一覧取得
router.get('/', cacheControl(0, 30), async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const queryParams = req.query as { search?: string | string[]; filter?: string | string[]; page?: string | string[]; limit?: string | string[]; service_type?: string | string[] };
    const { search, service_type } = queryParams;
    const pagination = parsePaginationParams({ page: queryParams.page, limit: queryParams.limit });
    const searchValue = Array.isArray(search) ? search[0] : search;
    const hasOwnerBusinessTypes = await hasOwnersBusinessTypesColumn();
    const { value: serviceTypeValue, error: serviceTypeError } = parseBusinessTypeInput(service_type, 'service_type');
    if (serviceTypeError) {
      sendBadRequest(res, serviceTypeError);
      return;
    }
    const { query, params } = buildOwnersListQuery({
      storeId: req.storeId,
      search: searchValue,
      serviceType: serviceTypeValue,
      hasOwnerBusinessTypes,
      pagination,
    });
    const result = await pool.query(query, params);
    const { data, total } = extractTotalCount(result.rows as Record<string, unknown>[]);
    res.json(buildPaginatedResponse(data, total, pagination));
  } catch (error) {
    sendServerError(res, '飼い主一覧の取得に失敗しました', error);
  }
});

// 飼い主詳細取得
router.get('/:id', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { id } = req.params;

    const ownerResult = await pool.query(
      `SELECT * FROM owners WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
      [id, req.storeId]
    );

    if (ownerResult.rows.length === 0) {
      sendNotFound(res, '飼い主が見つかりません');
      return;
    }

    const dogsResult = await pool.query(
      `SELECT * FROM dogs WHERE owner_id = $1 AND deleted_at IS NULL`,
      [id]
    );

    res.json({
      ...ownerResult.rows[0],
      dogs: dogsResult.rows,
    });
  } catch (error) {
    sendServerError(res, '飼い主情報の取得に失敗しました', error);
  }
});

// 飼い主作成
router.post('/', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const {
      name,
      name_kana,
      phone,
      email,
      address,
      emergency_contact,
      emergency_picker,
      line_id,
      memo,
      business_types,
    } = req.body;

    if (!isNonEmptyString(name) || !isNonEmptyString(phone)) {
      sendBadRequest(res, '名前と電話番号は必須です');
      return;
    }

    let hasOwnerBusinessTypes = await hasOwnersBusinessTypesColumn();
    if (!hasOwnerBusinessTypes && Array.isArray(business_types)) {
      await ensureOwnersBusinessTypesColumn();
      hasOwnerBusinessTypes = true;
    }
    const businessTypesValue = hasOwnerBusinessTypes ? normalizeBusinessTypesInput(business_types) : null;

    const result = hasOwnerBusinessTypes
      ? await pool.query(
        `INSERT INTO owners (
          store_id, name, name_kana, phone, email, address,
          emergency_contact, emergency_picker, line_id, memo, business_types
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          req.storeId,
          name,
          name_kana,
          phone,
          email,
          address,
          emergency_contact,
          emergency_picker,
          line_id,
          memo,
          businessTypesValue,
        ]
      )
      : await pool.query(
        `INSERT INTO owners (
          store_id, name, name_kana, phone, email, address,
          emergency_contact, emergency_picker, line_id, memo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          req.storeId,
          name,
          name_kana,
          phone,
          email,
          address,
          emergency_contact,
          emergency_picker,
          line_id,
          memo,
        ]
      );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '飼い主の登録に失敗しました', error);
  }
});

// 飼い主更新
router.put('/:id', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { id } = req.params;
    const {
      name,
      name_kana,
      phone,
      email,
      address,
      emergency_contact,
      emergency_picker,
      line_id,
      memo,
      business_types,
    } = req.body;

    let hasOwnerBusinessTypes = await hasOwnersBusinessTypesColumn();
    if (!hasOwnerBusinessTypes && Array.isArray(business_types)) {
      await ensureOwnersBusinessTypesColumn();
      hasOwnerBusinessTypes = true;
    }
    const businessTypesValue = hasOwnerBusinessTypes ? normalizeBusinessTypesInput(business_types) : null;

    const result = hasOwnerBusinessTypes
      ? await pool.query(
        `UPDATE owners SET
          name = $1, name_kana = $2, phone = $3, email = $4,
          address = $5, emergency_contact = $6, emergency_picker = $7,
          line_id = $8, memo = $9, business_types = $10, updated_at = CURRENT_TIMESTAMP
        WHERE id = $11 AND store_id = $12
        RETURNING *`,
        [
          name,
          name_kana,
          phone,
          email,
          address,
          emergency_contact,
          emergency_picker,
          line_id,
          memo,
          businessTypesValue,
          id,
          req.storeId,
        ]
      )
      : await pool.query(
        `UPDATE owners SET
          name = $1, name_kana = $2, phone = $3, email = $4,
          address = $5, emergency_contact = $6, emergency_picker = $7,
          line_id = $8, memo = $9, updated_at = CURRENT_TIMESTAMP
        WHERE id = $10 AND store_id = $11
        RETURNING *`,
        [
          name,
          name_kana,
          phone,
          email,
          address,
          emergency_contact,
          emergency_picker,
          line_id,
          memo,
          id,
          req.storeId,
        ]
      );

    if (result.rows.length === 0) {
      sendNotFound(res, '飼い主が見つかりません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '飼い主情報の更新に失敗しました', error);
  }
});

// 飼い主削除（論理削除）
router.delete('/:id', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { id } = req.params;

    // 5年以内のデータは削除不可
    const ownerCheck = await pool.query(
      `SELECT * FROM owners WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
      [id, req.storeId]
    );

    if (ownerCheck.rows.length === 0) {
      sendNotFound(res, '飼い主が見つかりません');
      return;
    }

    const owner = ownerCheck.rows[0];
    const createdAt = new Date(owner.created_at);
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    if (createdAt > fiveYearsAgo) {
      // 論理削除
      await pool.query(
        `UPDATE owners SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );

      // 関連する犬も論理削除
      await pool.query(
        `UPDATE dogs SET deleted_at = CURRENT_TIMESTAMP WHERE owner_id = $1 AND deleted_at IS NULL`,
        [id]
      );

      res.json({ message: '飼い主情報を削除しました（論理削除）' });
    } else {
      // 5年以上前のデータは物理削除可能
      await pool.query(`DELETE FROM owners WHERE id = $1`, [id]);

      res.json({ message: '飼い主情報を完全に削除しました' });
    }
  } catch (error) {
    sendServerError(res, '飼い主の削除に失敗しました', error);
  }
});

export default router;
