import express from 'express';
import pool from '../../db/connection.js';
import { sendNotFound, sendServerError } from '../../utils/response.js';
import { buildPaginatedResponse, parsePaginationParams } from '../../utils/pagination.js';
import { requireOwnerToken } from './common.js';

const router = express.Router();

// 飼い主の日誌一覧取得
router.get('/journals', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const queryParams = req.query as { dog_id?: string | string[]; page?: string | string[]; limit?: string | string[] };
    const { dog_id } = queryParams;
    const pagination = parsePaginationParams({ page: queryParams.page, limit: queryParams.limit });

    let query = `
      SELECT j.*, d.name as dog_name, d.photo_url as dog_photo, s.name as staff_name,
             COUNT(*) OVER() as total_count
      FROM journals j
      JOIN dogs d ON j.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      LEFT JOIN staff s ON j.staff_id = s.id
      WHERE d.owner_id = $1 AND o.store_id = $2
    `;
    const params: Array<string | number> = [decoded.ownerId, decoded.storeId];

    if (dog_id) {
      query += ` AND d.id = $${params.length + 1}`;
      params.push(Array.isArray(dog_id) ? dog_id[0] : dog_id);
    }

    query += ` ORDER BY j.journal_date DESC, j.created_at DESC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(pagination.limit, pagination.offset);

    const result = await pool.query(query, params);
    const total = result.rows.length > 0 ? Number((result.rows[0] as { total_count?: number }).total_count ?? 0) : 0;
    const data = result.rows.map((row) => {
      const { total_count, ...rest } = row as Record<string, unknown> & { total_count?: number };
      return rest;
    });
    res.json(buildPaginatedResponse(data, total, pagination));
  } catch (error: any) {
    sendServerError(res, '日誌情報の取得に失敗しました', error);
  }
});

// 日誌個別取得
router.get('/journals/:id', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { id } = req.params;

    const result = await pool.query(
      `SELECT j.*, d.name as dog_name, d.photo_url as dog_photo, s.name as staff_name
       FROM journals j
       JOIN dogs d ON j.dog_id = d.id
       JOIN owners o ON d.owner_id = o.id
       LEFT JOIN staff s ON j.staff_id = s.id
       WHERE j.id = $1 AND d.owner_id = $2 AND o.store_id = $3`,
      [id, decoded.ownerId, decoded.storeId]
    );

    if (result.rows.length === 0) {
      return sendNotFound(res, '日誌が見つかりません');
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    sendServerError(res, '日誌の取得に失敗しました', error);
  }
});

export default router;
