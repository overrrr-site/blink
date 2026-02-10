import express from 'express';
import pool from '../db/connection.js';
import { authenticate, requireOwner, AuthRequest } from '../middleware/auth.js';
import { requireStoreId, sendBadRequest, sendNotFound, sendServerError } from '../utils/response.js';
import { isNonEmptyString, isNumberLike } from '../utils/validation.js';

const VALID_ROOM_SIZES = ['小型', '中型', '大型'] as const;

const router = express.Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const result = await pool.query(
      `SELECT id, room_name, room_size, capacity, enabled, display_order, created_at, updated_at
       FROM hotel_rooms
       WHERE store_id = $1
       ORDER BY display_order ASC, id ASC`,
      [req.storeId]
    );

    res.json(result.rows);
  } catch (error) {
    sendServerError(res, 'ホテル部屋一覧の取得に失敗しました', error);
  }
});

router.post('/', requireOwner, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { room_name, room_size, capacity, enabled, display_order } = req.body as {
      room_name?: string;
      room_size?: string;
      capacity?: number;
      enabled?: boolean;
      display_order?: number;
    };

    if (!isNonEmptyString(room_name)) {
      sendBadRequest(res, 'room_nameは必須です');
      return;
    }
    if (!room_size || !VALID_ROOM_SIZES.includes(room_size as (typeof VALID_ROOM_SIZES)[number])) {
      sendBadRequest(res, 'room_sizeが不正です');
      return;
    }
    if (capacity !== undefined && (!Number.isInteger(capacity) || capacity < 1)) {
      sendBadRequest(res, 'capacityは1以上の整数である必要があります');
      return;
    }

    const result = await pool.query(
      `INSERT INTO hotel_rooms (store_id, room_name, room_size, capacity, enabled, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, room_name, room_size, capacity, enabled, display_order, created_at, updated_at`,
      [
        req.storeId,
        room_name.trim(),
        room_size,
        capacity ?? 1,
        enabled ?? true,
        display_order ?? 0,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'ホテル部屋の作成に失敗しました', error);
  }
});

router.put('/:id', requireOwner, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { id } = req.params;
    if (!isNumberLike(id)) {
      sendBadRequest(res, 'idが不正です');
      return;
    }

    const { room_name, room_size, capacity, enabled, display_order } = req.body as {
      room_name?: string;
      room_size?: string;
      capacity?: number;
      enabled?: boolean;
      display_order?: number;
    };

    if (room_name !== undefined && !isNonEmptyString(room_name)) {
      sendBadRequest(res, 'room_nameが不正です');
      return;
    }
    if (room_size !== undefined && !VALID_ROOM_SIZES.includes(room_size as (typeof VALID_ROOM_SIZES)[number])) {
      sendBadRequest(res, 'room_sizeが不正です');
      return;
    }
    if (capacity !== undefined && (!Number.isInteger(capacity) || capacity < 1)) {
      sendBadRequest(res, 'capacityは1以上の整数である必要があります');
      return;
    }
    if (display_order !== undefined && !Number.isInteger(display_order)) {
      sendBadRequest(res, 'display_orderが不正です');
      return;
    }

    const result = await pool.query(
      `UPDATE hotel_rooms
       SET room_name = COALESCE($1, room_name),
           room_size = COALESCE($2, room_size),
           capacity = COALESCE($3, capacity),
           enabled = COALESCE($4, enabled),
           display_order = COALESCE($5, display_order),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND store_id = $7
       RETURNING id, room_name, room_size, capacity, enabled, display_order, created_at, updated_at`,
      [
        room_name?.trim() ?? null,
        room_size ?? null,
        capacity ?? null,
        enabled ?? null,
        display_order ?? null,
        Number(id),
        req.storeId,
      ]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, 'ホテル部屋が見つかりません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'ホテル部屋の更新に失敗しました', error);
  }
});

router.delete('/:id', requireOwner, async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { id } = req.params;
    if (!isNumberLike(id)) {
      sendBadRequest(res, 'idが不正です');
      return;
    }

    const inUseResult = await pool.query(
      `SELECT id
       FROM reservations
       WHERE store_id = $1 AND room_id = $2 AND status != 'キャンセル'
       LIMIT 1`,
      [req.storeId, Number(id)]
    );

    if (inUseResult.rows.length > 0) {
      sendBadRequest(res, '利用中の部屋は削除できません。無効化してください。');
      return;
    }

    const result = await pool.query(
      `DELETE FROM hotel_rooms
       WHERE id = $1 AND store_id = $2
       RETURNING id`,
      [Number(id), req.storeId]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, 'ホテル部屋が見つかりません');
      return;
    }

    res.json({ success: true });
  } catch (error) {
    sendServerError(res, 'ホテル部屋の削除に失敗しました', error);
  }
});

export default router;
