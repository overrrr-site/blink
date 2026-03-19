import express from 'express';
import pool from '../../db/connection.js';
import { AuthRequest } from '../../middleware/auth.js';
import {
  requireStoreId,
  sendBadRequest,
  sendServerError,
} from '../../utils/response.js';
import { appendBusinessTypeFilter, parseBusinessTypeInput } from '../../utils/businessTypes.js';
import { logExportAction } from '../../services/exportLogService.js';
import { isNonEmptyString, isNumberLike } from '../../utils/validation.js';
import { buildCsv } from './utils.js';

const router = express.Router();

// カルテ履歴をCSV形式でエクスポート
router.get('/export.csv', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const {
      record_type,
      dog_id,
      staff_id,
      status,
      date_from,
      date_to,
      search,
    } = req.query as {
      record_type?: string;
      dog_id?: string;
      staff_id?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
      search?: string;
    };

    const { value: recordType, error: recordTypeError } = parseBusinessTypeInput(record_type, 'record_type');
    if (recordTypeError) {
      sendBadRequest(res, recordTypeError);
      return;
    }

    let query = `
      SELECT r.id,
             r.record_date,
             r.status,
             r.record_type,
             d.name AS dog_name,
             o.name AS owner_name,
             s.name AS staff_name,
             r.notes,
             r.created_at
      FROM records r
      JOIN dogs d ON r.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      LEFT JOIN staff s ON r.staff_id = s.id
      WHERE r.store_id = $1
        AND r.deleted_at IS NULL
    `;
    const params: Array<string | number> = [req.storeId!];

    query += appendBusinessTypeFilter(params, 'r.record_type', recordType);

    if (isNumberLike(dog_id)) {
      query += ` AND r.dog_id = $${params.length + 1}`;
      params.push(Number(dog_id));
    }
    if (isNumberLike(staff_id)) {
      query += ` AND r.staff_id = $${params.length + 1}`;
      params.push(Number(staff_id));
    }
    if (isNonEmptyString(status)) {
      query += ` AND r.status = $${params.length + 1}`;
      params.push(status);
    }
    if (isNonEmptyString(date_from)) {
      query += ` AND r.record_date >= $${params.length + 1}`;
      params.push(date_from);
    }
    if (isNonEmptyString(date_to)) {
      query += ` AND r.record_date <= $${params.length + 1}`;
      params.push(date_to);
    }
    if (isNonEmptyString(search)) {
      query += ` AND (d.name ILIKE $${params.length + 1} OR o.name ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY r.record_date DESC, r.created_at DESC`;

    const result = await pool.query(query, params);
    const headers = [
      'カルテID',
      '記録日',
      'ステータス',
      '業態',
      '犬名',
      '飼い主名',
      '担当スタッフ',
      'レポート',
      '作成日時',
    ];
    const rows = result.rows.map((row) => {
      let reportText = '';
      if (row.notes && typeof row.notes === 'object' && !Array.isArray(row.notes)) {
        const maybeReport = (row.notes as Record<string, unknown>).report_text;
        reportText = typeof maybeReport === 'string' ? maybeReport : '';
      }
      return [
        row.id,
        row.record_date ? new Date(row.record_date).toISOString().slice(0, 10) : '',
        row.status ?? '',
        row.record_type ?? '',
        row.dog_name ?? '',
        row.owner_name ?? '',
        row.staff_name ?? '',
        reportText,
        row.created_at ? new Date(row.created_at).toISOString().slice(0, 16).replace('T', ' ') : '',
      ];
    });

    await logExportAction({
      storeId: req.storeId!,
      staffId: req.userId,
      exportType: 'records',
      outputFormat: 'csv',
      filters: {
        record_type: recordType ?? null,
        dog_id: dog_id ?? null,
        staff_id: staff_id ?? null,
        status: status ?? null,
        date_from: date_from ?? null,
        date_to: date_to ?? null,
        search: search ?? null,
      },
    });

    const csv = buildCsv(headers, rows);
    const filename = `records-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    sendServerError(res, 'カルテCSVエクスポートに失敗しました', error);
  }
});

export default router;
