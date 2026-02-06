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
import { appendBusinessTypeFilter, parseBusinessTypeInput } from '../utils/businessTypes.js';

function buildOwnersListQuery(params: {
  storeId: number;
  search?: string;
  serviceType?: BusinessType;
  pagination: PaginationParams;
}): { query: string; params: Array<string | number> } {
  const { storeId, search, serviceType, pagination } = params;
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

  // 業種フィルタ：選択された業種の予約履歴を持つ飼い主のみ表示
  if (serviceType) {
    query += ` AND EXISTS (
      SELECT 1 FROM reservations r2
      JOIN dogs d2 ON r2.dog_id = d2.id
      WHERE d2.owner_id = o.id
        AND r2.store_id = o.store_id`;
    query += appendBusinessTypeFilter(queryParams, 'r2.service_type', serviceType);
    query += `
    )`;
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

// 飼い主一覧取得
router.get('/', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const queryParams = req.query as { search?: string | string[]; filter?: string | string[]; page?: string | string[]; limit?: string | string[]; service_type?: string | string[] };
    const { search, service_type } = queryParams;
    const pagination = parsePaginationParams({ page: queryParams.page, limit: queryParams.limit });
    const searchValue = Array.isArray(search) ? search[0] : search;
    const { value: serviceTypeValue, error: serviceTypeError } = parseBusinessTypeInput(service_type, 'service_type');
    if (serviceTypeError) {
      sendBadRequest(res, serviceTypeError);
      return;
    }
    const { query, params } = buildOwnersListQuery({
      storeId: req.storeId,
      search: searchValue,
      serviceType: serviceTypeValue,
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
    } = req.body;

    if (!isNonEmptyString(name) || !isNonEmptyString(phone)) {
      sendBadRequest(res, '名前と電話番号は必須です');
      return;
    }

    const result = await pool.query(
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
    } = req.body;

    const result = await pool.query(
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
