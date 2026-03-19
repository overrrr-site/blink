import express from 'express';
import pool from '../../db/connection.js';
import { AuthRequest } from '../../middleware/auth.js';
import {
  requireStoreId,
  sendBadRequest,
  sendServerError,
} from '../../utils/response.js';
import { isNonEmptyString, isNumberLike } from '../../utils/validation.js';
import { appendBusinessTypeFilter, parseBusinessTypeInput } from '../../utils/businessTypes.js';
import { logExportAction } from '../../services/exportLogService.js';
import { getMonthDateRange, buildCsv } from './utils.js';

const router = express.Router();

// 予約履歴をCSV形式でエクスポート
router.get('/export.csv', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { date_from, date_to, service_type, status, dog_id } = req.query as {
      date_from?: string;
      date_to?: string;
      service_type?: string;
      status?: string;
      dog_id?: string;
    };

    const { value: serviceType, error: serviceTypeError } = parseBusinessTypeInput(service_type, 'service_type');
    if (serviceTypeError) {
      sendBadRequest(res, serviceTypeError);
      return;
    }

    let query = `
      SELECT r.id,
             r.reservation_date,
             r.reservation_time,
             r.end_datetime,
             r.status,
             r.service_type,
             d.name AS dog_name,
             o.name AS owner_name,
             hr.room_name,
             r.memo,
             r.created_at
      FROM reservations r
      JOIN dogs d ON r.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      LEFT JOIN hotel_rooms hr ON r.room_id = hr.id
      WHERE r.store_id = $1
    `;
    const params: Array<string | number> = [req.storeId!];

    query += appendBusinessTypeFilter(params, 'r.service_type', serviceType);

    if (isNonEmptyString(date_from)) {
      query += ` AND r.reservation_date >= $${params.length + 1}`;
      params.push(date_from);
    }
    if (isNonEmptyString(date_to)) {
      query += ` AND r.reservation_date <= $${params.length + 1}`;
      params.push(date_to);
    }
    if (isNonEmptyString(status)) {
      query += ` AND r.status = $${params.length + 1}`;
      params.push(status);
    }
    if (isNumberLike(dog_id)) {
      query += ` AND r.dog_id = $${params.length + 1}`;
      params.push(Number(dog_id));
    }

    query += ` ORDER BY r.reservation_date DESC, r.reservation_time DESC, r.id DESC`;

    const result = await pool.query(query, params);
    const headers = [
      '予約ID',
      '予約日',
      '予約時刻',
      '終了予定',
      'ステータス',
      '業態',
      '犬名',
      '飼い主名',
      '部屋',
      'メモ',
      '作成日時',
    ];
    const rows = result.rows.map((row) => [
      row.id,
      row.reservation_date ? new Date(row.reservation_date).toISOString().slice(0, 10) : '',
      row.reservation_time ? String(row.reservation_time).slice(0, 5) : '',
      row.end_datetime ? new Date(row.end_datetime).toISOString().slice(0, 16).replace('T', ' ') : '',
      row.status,
      row.service_type,
      row.dog_name,
      row.owner_name,
      row.room_name ?? '',
      row.memo ?? '',
      row.created_at ? new Date(row.created_at).toISOString().slice(0, 16).replace('T', ' ') : '',
    ]);

    await logExportAction({
      storeId: req.storeId!,
      staffId: req.userId,
      exportType: 'reservations',
      outputFormat: 'csv',
      filters: { date_from, date_to, service_type: serviceType ?? null, status: status ?? null, dog_id: dog_id ?? null },
    });

    const csv = buildCsv(headers, rows);
    const filename = `reservations-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    sendServerError(res, '予約CSVエクスポートに失敗しました', error);
  }
});

// 予約をiCS形式でエクスポート
router.get('/export.ics', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { month, date } = req.query;

    // 店舗情報を取得
    const storeResult = await pool.query(
      `SELECT name, address FROM stores WHERE id = $1`,
      [req.storeId]
    );
    const store = storeResult.rows[0] || { name: '店舗', address: '' };

    let query = `
      SELECT r.*, d.name as dog_name, o.name as owner_name
      FROM reservations r
      JOIN dogs d ON r.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      WHERE r.store_id = $1 AND r.status != 'キャンセル'
    `;
    const params: (string | number)[] =[req.storeId];

    if (date) {
      query += ` AND r.reservation_date = $2`;
      params.push(String(date));
    } else if (month) {
      const range = getMonthDateRange(String(month));
      if (range) {
        query += ` AND r.reservation_date >= $2 AND r.reservation_date < $3`;
        params.push(range.start, range.end);
      }
    }

    query += ` ORDER BY r.reservation_date, r.reservation_time`;

    const result = await pool.query(query, params);

    // iCS形式に変換
    const icsLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PetCarte//Admin//JP',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${store.name} 予約一覧`,
    ];

    for (const reservation of result.rows) {
      const dateStr = reservation.reservation_date.toISOString().split('T')[0].replace(/-/g, '');
      const startTime = (reservation.reservation_time || '09:00').replace(':', '') + '00';
      const endTime = (reservation.pickup_time || '17:00').replace(':', '') + '00';

      const uid = `reservation-${reservation.id}@petcarte`;
      const summary = `${reservation.dog_name}（${reservation.owner_name}様）`;
      const description = [
        `予約ID: ${reservation.id}`,
        `犬名: ${reservation.dog_name}`,
        `飼い主: ${reservation.owner_name}`,
        `ステータス: ${reservation.status || '予定'}`,
        reservation.memo ? `メモ: ${reservation.memo}` : '',
      ].filter(Boolean).join('\\n');

      icsLines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTSTART;TZID=Asia/Tokyo:${dateStr}T${startTime}`,
        `DTEND;TZID=Asia/Tokyo:${dateStr}T${endTime}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        store.address ? `LOCATION:${store.address}` : '',
        'END:VEVENT'
      );
    }

    icsLines.push('END:VCALENDAR');
    const icsContent = icsLines.filter(Boolean).join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reservations.ics"');
    res.send(icsContent);
  } catch (error) {
    sendServerError(res, 'カレンダーエクスポートに失敗しました', error);
  }
});

export default router;
