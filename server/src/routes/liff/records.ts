import express from 'express';
import pool from '../../db/connection.js';
import { sendNotFound, sendServerError } from '../../utils/response.js';
import { buildPaginatedResponse, extractTotalCount, parsePaginationParams } from '../../utils/pagination.js';
import { requireOwnerToken } from './common.js';

const router = express.Router();

// 飼い主のカルテ一覧取得（shared状態のみ）
router.get('/records', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const queryParams = req.query as {
      dog_id?: string | string[];
      record_type?: string | string[];
      page?: string | string[];
      limit?: string | string[];
    };
    const { dog_id, record_type } = queryParams;
    const pagination = parsePaginationParams({ page: queryParams.page, limit: queryParams.limit });

    let query = `
      SELECT r.id, r.record_type, r.record_date, r.photos, r.notes, r.condition,
             r.grooming_data, r.daycare_data, r.hotel_data, r.health_check,
             r.status, r.shared_at, r.created_at,
             d.name as dog_name, d.photo_url as dog_photo,
             s.name as staff_name,
             COUNT(*) OVER() as total_count
      FROM records r
      JOIN dogs d ON r.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      LEFT JOIN staff s ON r.staff_id = s.id
      WHERE d.owner_id = $1 AND o.store_id = $2
        AND r.status = 'shared'
        AND r.deleted_at IS NULL
    `;
    const params: Array<string | number> = [decoded.ownerId, decoded.storeId];

    if (dog_id) {
      query += ` AND d.id = $${params.length + 1}`;
      params.push(Array.isArray(dog_id) ? dog_id[0] : dog_id);
    }

    if (record_type) {
      query += ` AND r.record_type = $${params.length + 1}`;
      params.push(Array.isArray(record_type) ? record_type[0] : record_type);
    }

    query += ` ORDER BY r.record_date DESC, r.created_at DESC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(pagination.limit, pagination.offset);

    const result = await pool.query(query, params);
    const { data, total } = extractTotalCount(result.rows as Record<string, unknown>[]);
    res.json(buildPaginatedResponse(data, total, pagination));
  } catch (error: any) {
    sendServerError(res, 'カルテ情報の取得に失敗しました', error);
  }
});

// カルテ個別取得
router.get('/records/:id', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*, d.name as dog_name, d.photo_url as dog_photo,
              d.breed as dog_breed, d.birth_date as dog_birth_date,
              s.name as staff_name
       FROM records r
       JOIN dogs d ON r.dog_id = d.id
       JOIN owners o ON d.owner_id = o.id
       LEFT JOIN staff s ON r.staff_id = s.id
       WHERE r.id = $1 AND d.owner_id = $2 AND o.store_id = $3
         AND r.status = 'shared'
         AND r.deleted_at IS NULL`,
      [id, decoded.ownerId, decoded.storeId]
    );

    if (result.rows.length === 0) {
      return sendNotFound(res, 'カルテが見つかりません');
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    sendServerError(res, 'カルテの取得に失敗しました', error);
  }
});

export default router;
