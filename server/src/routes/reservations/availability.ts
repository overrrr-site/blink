import express from 'express';
import pool from '../../db/connection.js';
import { AuthRequest } from '../../middleware/auth.js';
import {
  requireStoreId,
  sendBadRequest,
  sendServerError,
} from '../../utils/response.js';
import { isNonEmptyString, isNumberLike } from '../../utils/validation.js';

const router = express.Router();

// ホテル部屋空き状況取得
router.get('/hotel-availability', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { checkin_datetime, checkout_datetime, exclude_reservation_id } = req.query as {
      checkin_datetime?: string;
      checkout_datetime?: string;
      exclude_reservation_id?: string;
    };

    if (!isNonEmptyString(checkin_datetime) || !isNonEmptyString(checkout_datetime)) {
      sendBadRequest(res, 'checkin_datetimeとcheckout_datetimeが必要です');
      return;
    }

    const startDate = new Date(checkin_datetime);
    const endDate = new Date(checkout_datetime);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
      sendBadRequest(res, 'チェックイン・チェックアウト日時が不正です');
      return;
    }

    const excludeId = isNumberLike(exclude_reservation_id) ? Number(exclude_reservation_id) : null;

    const result = await pool.query(
      `SELECT hr.id,
              hr.room_name,
              hr.room_size,
              hr.capacity,
              hr.display_order,
              c.id as conflict_reservation_id
       FROM hotel_rooms hr
       LEFT JOIN LATERAL (
         SELECT r.id
         FROM reservations r
         WHERE r.store_id = $1
           AND r.room_id = hr.id
           AND r.status != 'キャンセル'
           AND ($4::int IS NULL OR r.id != $4)
           AND COALESCE(r.end_datetime, (r.reservation_date::timestamp + r.reservation_time::time + INTERVAL '1 day')) > $2::timestamp
           AND (r.reservation_date::timestamp + r.reservation_time::time) < $3::timestamp
         ORDER BY r.reservation_date, r.reservation_time
         LIMIT 1
       ) c ON true
       WHERE hr.store_id = $1
         AND hr.enabled = TRUE
       ORDER BY hr.display_order ASC, hr.id ASC`,
      [req.storeId, checkin_datetime, checkout_datetime, excludeId]
    );

    const rooms = result.rows.map((row) => ({
      id: row.id,
      room_name: row.room_name,
      room_size: row.room_size,
      capacity: row.capacity,
      is_available: !row.conflict_reservation_id,
      conflict_reservation_id: row.conflict_reservation_id ?? null,
    }));

    res.json(rooms);
  } catch (error) {
    sendServerError(res, 'ホテル部屋の空き状況取得に失敗しました', error);
  }
});

export default router;
