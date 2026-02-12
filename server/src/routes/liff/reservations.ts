import express from 'express';
import pool from '../../db/connection.js';
import {
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
} from '../../utils/response.js';
import { buildPaginatedResponse, extractTotalCount, parsePaginationParams } from '../../utils/pagination.js';
import { parseBusinessTypeInput } from '../../utils/businessTypes.js';
import { requireOwnerToken } from './common.js';

const router = express.Router();

// 飼い主の予約一覧取得
router.get('/reservations', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const queryParams = req.query as {
      month?: string | string[];
      page?: string | string[];
      limit?: string | string[];
      service_type?: string | string[];
    };
    const { month, service_type } = queryParams;
    const pagination = parsePaginationParams({ page: queryParams.page, limit: queryParams.limit });
    const { value: serviceType, error: serviceTypeError } = parseBusinessTypeInput(service_type, 'service_type');
    if (serviceTypeError) {
      sendBadRequest(res, serviceTypeError);
      return;
    }

    let query = `
      SELECT r.*, d.name as dog_name, d.photo_url as dog_photo,
             pvi.morning_urination, pvi.morning_defecation,
             pvi.afternoon_urination, pvi.afternoon_defecation,
             pvi.breakfast_status, pvi.health_status, pvi.notes as pre_visit_notes,
             pvi.meal_data, pvi.service_type as pre_visit_service_type,
             pvi.grooming_data, pvi.hotel_data,
             CASE WHEN pvi.id IS NOT NULL THEN true ELSE false END as has_pre_visit_input,
             COUNT(*) OVER() as total_count
      FROM reservations r
      JOIN dogs d ON r.dog_id = d.id
      LEFT JOIN pre_visit_inputs pvi ON r.id = pvi.reservation_id
      WHERE d.owner_id = $1 AND r.store_id = $2
    `;
    const params: Array<string | number> = [decoded.ownerId, decoded.storeId];

    if (month) {
      query += ` AND r.reservation_date >= $${params.length + 1}::date AND r.reservation_date < ($${params.length + 1}::date + INTERVAL '1 month')`;
      const monthValue = Array.isArray(month) ? month[0] : month;
      params.push(`${monthValue}-01`);
    }

    if (serviceType) {
      query += ` AND COALESCE(r.service_type, 'daycare') = $${params.length + 1}`;
      params.push(serviceType);
    }

    query += ` ORDER BY r.reservation_date DESC, r.reservation_time DESC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(pagination.limit, pagination.offset);

    const result = await pool.query(query, params);
    const { data, total } = extractTotalCount(result.rows as Record<string, unknown>[]);
    res.json(buildPaginatedResponse(data, total, pagination));
  } catch (error: any) {
    sendServerError(res, '予約情報の取得に失敗しました', error);
  }
});

// 予約をiCS形式でエクスポート
router.get('/reservations/export.ics', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { month, reservation_id, service_type } = req.query;
    const { value: serviceType, error: serviceTypeError } = parseBusinessTypeInput(service_type, 'service_type');
    if (serviceTypeError) {
      sendBadRequest(res, serviceTypeError);
      return;
    }

    // 店舗情報を取得
    const storeResult = await pool.query(
      `SELECT name, address FROM stores WHERE id = $1`,
      [decoded.storeId]
    );
    const store = storeResult.rows[0] || { name: '店舗', address: '' };

    let query = `
      SELECT r.*, d.name as dog_name
      FROM reservations r
      JOIN dogs d ON r.dog_id = d.id
      WHERE d.owner_id = $1 AND r.store_id = $2 AND r.status != 'キャンセル'
    `;
    const params: (string | number)[] = [decoded.ownerId, decoded.storeId];

    if (reservation_id) {
      query += ` AND r.id = $3`;
      params.push(String(reservation_id));
    } else if (month) {
      query += ` AND r.reservation_date >= $3::date AND r.reservation_date < ($3::date + INTERVAL '1 month')`;
      params.push(`${month}-01`);
    }

    if (serviceType) {
      query += ` AND COALESCE(r.service_type, 'daycare') = $${params.length + 1}`;
      params.push(serviceType);
    }

    query += ` ORDER BY r.reservation_date, r.reservation_time`;

    const result = await pool.query(query, params);

    // iCS形式に変換
    const icsLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PetCarte//LIFF//JP',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${store.name} 予約`,
    ];

    for (const reservation of result.rows) {
      const dateStr = reservation.reservation_date.toISOString().split('T')[0].replace(/-/g, '');
      const startTime = (reservation.reservation_time || '09:00').replace(':', '') + '00';
      const endTime = (reservation.pickup_time || '17:00').replace(':', '') + '00';
      const uid = `reservation-${reservation.id}@petcarte`;
      const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      icsLines.push('BEGIN:VEVENT');
      icsLines.push(`UID:${uid}`);
      icsLines.push(`DTSTAMP:${now}`);
      icsLines.push(`DTSTART;TZID=Asia/Tokyo:${dateStr}T${startTime}`);
      icsLines.push(`DTEND;TZID=Asia/Tokyo:${dateStr}T${endTime}`);
      icsLines.push(`SUMMARY:${reservation.dog_name} - ${store.name}`);
      if (store.address) {
        icsLines.push(`LOCATION:${store.address}`);
      }
      if (reservation.notes) {
        icsLines.push(`DESCRIPTION:${reservation.notes.replace(/\n/g, '\\n')}`);
      }
      icsLines.push(`STATUS:CONFIRMED`);
      icsLines.push('END:VEVENT');
    }

    icsLines.push('END:VCALENDAR');

    const icsContent = icsLines.join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reservations.ics"');
    res.send(icsContent);
  } catch (error: any) {
    sendServerError(res, 'カレンダーエクスポートに失敗しました', error);
  }
});

// 飼い主の予約詳細取得
router.get('/reservations/:id', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*, d.name as dog_name, d.photo_url as dog_photo,
              CASE WHEN pvi.id IS NOT NULL THEN true ELSE false END as has_pre_visit_input
       FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       LEFT JOIN pre_visit_inputs pvi ON r.id = pvi.reservation_id
       WHERE r.id = $1 AND d.owner_id = $2 AND r.store_id = $3`,
      [id, decoded.ownerId, decoded.storeId]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, '予約が見つかりません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    sendServerError(res, '予約情報の取得に失敗しました', error);
  }
});

// 空き状況取得
router.get('/availability', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { month } = req.query; // 形式: "2026-01"

    if (!month) {
      sendBadRequest(res, '月の指定が必要です（例: 2026-01）');
      return;
    }

    // 店舗設定を取得（定員）
    const settingsResult = await pool.query(
      `SELECT max_capacity FROM store_settings WHERE store_id = $1`,
      [decoded.storeId]
    );
    const maxCapacity = settingsResult.rows[0]?.max_capacity || 15;

    // 店舗情報を取得（営業時間・定休日）
    const storeResult = await pool.query(
      `SELECT business_hours, closed_days FROM stores WHERE id = $1`,
      [decoded.storeId]
    );
    const businessHours = storeResult.rows[0]?.business_hours || {};
    const closedDays = storeResult.rows[0]?.closed_days || [];

    // 指定月の各日の予約数を取得
    const startDate = `${month}-01`;
    const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1))
      .toISOString().split('T')[0];

    const reservationsResult = await pool.query(
      `SELECT 
        reservation_date,
        COUNT(*) as reservation_count
       FROM reservations
       WHERE store_id = $1
         AND reservation_date >= $2
         AND reservation_date < $3
         AND status != 'キャンセル'
         AND deleted_at IS NULL
       GROUP BY reservation_date
       ORDER BY reservation_date`,
      [decoded.storeId, startDate, endDate]
    );

    // 日付ごとの予約数をマップに変換
    const reservationMap = new Map<string, number>();
    reservationsResult.rows.forEach((row: any) => {
      reservationMap.set(row.reservation_date, parseInt(row.reservation_count));
    });

    // 月の全日付を生成
    const availability: Array<{
      date: string;
      available: number;
      capacity: number;
      isClosed: boolean;
    }> = [];

    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate < end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay(); // 0=日曜, 1=月曜, ...
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];

      const reservationCount = reservationMap.get(dateStr) || 0;
      const isClosed = closedDays.includes(dayName);

      availability.push({
        date: dateStr,
        available: Math.max(0, maxCapacity - reservationCount),
        capacity: maxCapacity,
        isClosed,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      month,
      availability,
      businessHours,
      closedDays,
    });
  } catch (error: any) {
    sendServerError(res, '空き状況の取得に失敗しました', error);
  }
});

// 飼い主の予約作成
router.post('/reservations', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { dog_id, reservation_date, reservation_time, notes, service_type } = req.body;

    if (!dog_id || !reservation_date) {
      sendBadRequest(res, '犬IDと予約日は必須です');
      return;
    }
    const { value: serviceType, error: serviceTypeError } = parseBusinessTypeInput(service_type, 'service_type');
    if (serviceTypeError) {
      sendBadRequest(res, serviceTypeError);
      return;
    }
    if (!serviceType) {
      sendBadRequest(res, 'service_typeは必須です');
      return;
    }

    // 犬がこの飼い主のものか確認
    const dogCheck = await pool.query(
      `SELECT id FROM dogs WHERE id = $1 AND owner_id = $2`,
      [dog_id, decoded.ownerId]
    );

    if (dogCheck.rows.length === 0) {
      sendForbidden(res, 'この犬を予約する権限がありません');
      return;
    }

    // 定員チェック
    const settingsResult = await pool.query(
      `SELECT max_capacity FROM store_settings WHERE store_id = $1`,
      [decoded.storeId]
    );
    const maxCapacity = settingsResult.rows[0]?.max_capacity || 15;

    const existingReservationsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM reservations
       WHERE store_id = $1
         AND reservation_date = $2
         AND status != 'キャンセル'
         AND deleted_at IS NULL`,
      [decoded.storeId, reservation_date]
    );

    const existingCount = parseInt(existingReservationsResult.rows[0].count);
    if (existingCount >= maxCapacity) {
      return res.status(400).json({
        error: 'この日は定員に達しています',
      });
    }

    // 契約残数チェックは幼稚園予約のみ適用
    if (serviceType === 'daycare') {
      const contractResult = await pool.query(
        `SELECT contract_type, remaining_sessions
         FROM contracts
         WHERE dog_id = $1
           AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
         ORDER BY created_at DESC
         LIMIT 1`,
        [dog_id]
      );

      if (contractResult.rows.length > 0) {
        const contract = contractResult.rows[0];
        if (contract.contract_type === 'チケット制') {
          if (!contract.remaining_sessions || contract.remaining_sessions <= 0) {
            return res.status(400).json({
              error: 'チケットの残数がありません。追加購入が必要です。',
            });
          }
        }
      }
    }

    const result = await pool.query(
      `INSERT INTO reservations (
        store_id, dog_id, reservation_date, reservation_time, memo, service_type
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        decoded.storeId,
        dog_id,
        reservation_date,
        reservation_time || '09:00',
        notes || null,
        serviceType,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    sendServerError(res, '予約の作成に失敗しました', error);
  }
});

// 飼い主の予約更新
router.put('/reservations/:id', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { id } = req.params;
    const { reservation_date, reservation_time, notes } = req.body;

    // 予約がこの飼い主のものか確認
    const reservationCheck = await pool.query(
      `SELECT r.* FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       WHERE r.id = $1 AND d.owner_id = $2 AND r.store_id = $3 AND r.status != 'キャンセル'`,
      [id, decoded.ownerId, decoded.storeId]
    );

    if (reservationCheck.rows.length === 0) {
      sendNotFound(res, '予約が見つかりません');
      return;
    }

    const result = await pool.query(
      `UPDATE reservations SET
        reservation_date = COALESCE($1, reservation_date),
        reservation_time = COALESCE($2, reservation_time),
        memo = COALESCE($3, memo),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *`,
      [reservation_date, reservation_time, notes, id]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    sendServerError(res, '予約の更新に失敗しました', error);
  }
});

// 飼い主の予約キャンセル
router.put('/reservations/:id/cancel', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { id } = req.params;

    // 予約がこの飼い主のものか確認
    const reservationCheck = await pool.query(
      `SELECT r.* FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       WHERE r.id = $1 AND d.owner_id = $2 AND r.store_id = $3`,
      [id, decoded.ownerId, decoded.storeId]
    );

    if (reservationCheck.rows.length === 0) {
      sendNotFound(res, '予約が見つかりません');
      return;
    }

    const result = await pool.query(
      `UPDATE reservations SET status = 'キャンセル', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    sendServerError(res, '予約のキャンセルに失敗しました', error);
  }
});

export default router;
