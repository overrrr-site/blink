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
import type { BusinessType } from '../utils/businessTypes.js';
import {
  idParamSchema,
  ownerCreateSchema,
  ownersListQuerySchema,
  ownerUpdateSchema,
  parseSchema,
} from './schemas.js';
import { cacheControl } from '../middleware/cache.js';
import { fetchLineUserProfile } from '../services/lineMessagingService.js';

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

function buildOwnerUpdates(payload: {
  name?: string | null;
  name_kana?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  emergency_picker?: string | null;
  line_id?: string | null;
  memo?: string | null;
  business_types?: BusinessType[] | null;
}, includeBusinessTypes: boolean): { updates: string[]; values: Array<string | string[] | null> } {
  const updates: string[] = [];
  const values: Array<string | string[] | null> = [];

  const pushUpdate = (column: string, value: string | string[] | null) => {
    updates.push(`${column} = $${values.length + 1}`);
    values.push(value);
  };

  if (payload.name !== undefined) pushUpdate('name', payload.name);
  if (payload.name_kana !== undefined) pushUpdate('name_kana', payload.name_kana);
  if (payload.phone !== undefined) pushUpdate('phone', payload.phone);
  if (payload.email !== undefined) pushUpdate('email', payload.email);
  if (payload.address !== undefined) pushUpdate('address', payload.address);
  if (payload.emergency_contact !== undefined) pushUpdate('emergency_contact', payload.emergency_contact);
  if (payload.emergency_picker !== undefined) pushUpdate('emergency_picker', payload.emergency_picker);
  if (payload.line_id !== undefined) pushUpdate('line_id', payload.line_id);
  if (payload.memo !== undefined) pushUpdate('memo', payload.memo);
  if (includeBusinessTypes && payload.business_types !== undefined) pushUpdate('business_types', payload.business_types);

  return { updates, values };
}

// 飼い主一覧取得
router.get('/', cacheControl(0, 30), async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const parsedQuery = parseSchema(ownersListQuerySchema, req.query);
    if ('error' in parsedQuery) {
      sendBadRequest(res, parsedQuery.error);
      return;
    }

    const queryParams = req.query as { page?: string | string[]; limit?: string | string[] };
    const pagination = parsePaginationParams({ page: queryParams.page, limit: queryParams.limit });
    const hasOwnerBusinessTypes = await hasOwnersBusinessTypesColumn();
    const { query, params } = buildOwnersListQuery({
      storeId: req.storeId,
      search: parsedQuery.data.search,
      serviceType: parsedQuery.data.service_type,
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

    const parsedParams = parseSchema(idParamSchema, req.params);
    if ('error' in parsedParams) {
      sendBadRequest(res, parsedParams.error);
      return;
    }

    const { id } = parsedParams.data;

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

    const parsedBody = parseSchema(ownerCreateSchema, req.body);
    if ('error' in parsedBody) {
      sendBadRequest(res, parsedBody.error);
      return;
    }
    const payload = parsedBody.data;

    let hasOwnerBusinessTypes = await hasOwnersBusinessTypesColumn();
    if (!hasOwnerBusinessTypes && payload.business_types !== undefined) {
      await ensureOwnersBusinessTypesColumn();
      hasOwnerBusinessTypes = true;
    }
    const businessTypesValue = hasOwnerBusinessTypes ? (payload.business_types ?? null) : null;

    const result = hasOwnerBusinessTypes
      ? await pool.query(
        `INSERT INTO owners (
          store_id, name, name_kana, phone, email, address,
          emergency_contact, emergency_picker, line_id, memo, business_types
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          req.storeId,
          payload.name,
          payload.name_kana,
          payload.phone,
          payload.email,
          payload.address,
          payload.emergency_contact,
          payload.emergency_picker,
          payload.line_id,
          payload.memo,
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
          payload.name,
          payload.name_kana,
          payload.phone,
          payload.email,
          payload.address,
          payload.emergency_contact,
          payload.emergency_picker,
          payload.line_id,
          payload.memo,
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

    const parsedParams = parseSchema(idParamSchema, req.params);
    if ('error' in parsedParams) {
      sendBadRequest(res, parsedParams.error);
      return;
    }
    const parsedBody = parseSchema(ownerUpdateSchema, req.body);
    if ('error' in parsedBody) {
      sendBadRequest(res, parsedBody.error);
      return;
    }

    const { id } = parsedParams.data;
    const payload = parsedBody.data;

    let hasOwnerBusinessTypes = await hasOwnersBusinessTypesColumn();
    if (!hasOwnerBusinessTypes && payload.business_types !== undefined) {
      await ensureOwnersBusinessTypesColumn();
      hasOwnerBusinessTypes = true;
    }

    const { updates, values } = buildOwnerUpdates(payload, hasOwnerBusinessTypes);
    values.push(String(id), String(req.storeId));

    const result = await pool.query(
      `UPDATE owners SET
        ${updates.join(', ')},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length - 1} AND store_id = $${values.length}
      RETURNING *`,
      values,
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

// この店舗のLINE紐付け候補一覧を取得（トライアル時: trial_line_links から）
router.get('/:id/line-candidates', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const parsedParams = parseSchema(idParamSchema, req.params);
    if ('error' in parsedParams) {
      sendBadRequest(res, parsedParams.error);
      return;
    }

    const ownerCheck = await pool.query(
      `SELECT id FROM owners WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
      [parsedParams.data.id, req.storeId]
    );
    if (ownerCheck.rows.length === 0) {
      sendNotFound(res, '飼い主が見つかりません');
      return;
    }

    const linksResult = await pool.query<{
      line_user_id: string;
      owner_id: number | null;
      owner_name: string | null;
      linked_owner_id: number | null;
    }>(
      `SELECT tll.line_user_id,
              tll.owner_id,
              linked_o.name AS owner_name,
              linked_o.id AS linked_owner_id
       FROM trial_line_links tll
       LEFT JOIN owners linked_o
         ON linked_o.store_id = tll.store_id
         AND linked_o.line_id = tll.line_user_id
         AND linked_o.deleted_at IS NULL
       WHERE tll.store_id = $1
       ORDER BY tll.created_at DESC`,
      [req.storeId]
    );

    const candidates = await Promise.all(
      linksResult.rows.map(async (row) => {
        const profile = await fetchLineUserProfile(req.storeId!, row.line_user_id);
        return {
          line_user_id: row.line_user_id,
          display_name: profile?.displayName ?? null,
          picture_url: profile?.pictureUrl ?? null,
          linked_owner_id: row.linked_owner_id,
          linked_owner_name: row.owner_name,
        };
      })
    );

    res.json({ candidates });
  } catch (error) {
    sendServerError(res, 'LINE連携候補の取得に失敗しました', error);
  }
});

// 飼い主にLINEアカウントを紐付け（既に他の飼い主に紐付いていれば張り替え）
router.post('/:id/link-line', async function(req: AuthRequest, res): Promise<void> {
  const client = await pool.connect();
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const parsedParams = parseSchema(idParamSchema, req.params);
    if ('error' in parsedParams) {
      sendBadRequest(res, parsedParams.error);
      return;
    }

    const { id } = parsedParams.data;
    const lineUserIdRaw = (req.body as { line_user_id?: unknown }).line_user_id;
    const lineUserId = typeof lineUserIdRaw === 'string' ? lineUserIdRaw.trim() : '';
    if (!lineUserId) {
      sendBadRequest(res, 'line_user_id が必要です');
      return;
    }

    await client.query('BEGIN');

    const ownerCheck = await client.query(
      `SELECT id FROM owners WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
      [id, req.storeId]
    );
    if (ownerCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      sendNotFound(res, '飼い主が見つかりません');
      return;
    }

    // 既に同じ店舗内で他の飼い主が同じ line_id に紐付いている場合はクリア
    await client.query(
      `UPDATE owners SET line_id = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE store_id = $1 AND line_id = $2 AND id <> $3 AND deleted_at IS NULL`,
      [req.storeId, lineUserId, id]
    );

    // 対象の飼い主に紐付け
    const result = await client.query(
      `UPDATE owners SET line_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND store_id = $3
       RETURNING *`,
      [lineUserId, id, req.storeId]
    );

    // trial_line_links の owner_id も追従
    await client.query(
      `UPDATE trial_line_links SET owner_id = $1
       WHERE store_id = $2 AND line_user_id = $3`,
      [id, req.storeId, lineUserId]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    sendServerError(res, 'LINE連携の更新に失敗しました', error);
  } finally {
    client.release();
  }
});

// 飼い主のLINE紐付けを解除
router.delete('/:id/line-link', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const parsedParams = parseSchema(idParamSchema, req.params);
    if ('error' in parsedParams) {
      sendBadRequest(res, parsedParams.error);
      return;
    }

    const { id } = parsedParams.data;

    const result = await pool.query(
      `UPDATE owners SET line_id = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL
       RETURNING id, line_id`,
      [id, req.storeId]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, '飼い主が見つかりません');
      return;
    }

    await pool.query(
      `UPDATE trial_line_links SET owner_id = NULL
       WHERE store_id = $1 AND owner_id = $2`,
      [req.storeId, id]
    );

    res.json({ success: true });
  } catch (error) {
    sendServerError(res, 'LINE連携の解除に失敗しました', error);
  }
});

// 飼い主削除（論理削除）
router.delete('/:id', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const parsedParams = parseSchema(idParamSchema, req.params);
    if ('error' in parsedParams) {
      sendBadRequest(res, parsedParams.error);
      return;
    }

    const { id } = parsedParams.data;

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
