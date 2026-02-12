import express from 'express';
import pool from '../../db/connection.js';
import { parseBusinessTypeInput } from '../../utils/businessTypes.js';
import { sendBadRequest, sendServerError } from '../../utils/response.js';
import { requireOwnerToken } from './common.js';

const router = express.Router();

router.get('/dashboard/summary', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { value: requestedServiceType, error: serviceTypeError } = parseBusinessTypeInput(
      req.query.service_type,
      'service_type'
    );
    if (serviceTypeError) {
      sendBadRequest(res, serviceTypeError);
      return;
    }

    const serviceType = requestedServiceType || 'daycare';
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const [nextReservationResult, latestRecordResult, announcementCountResult, latestAnnouncementResult] = await Promise.all([
      pool.query(
        `SELECT r.id,
                r.reservation_date,
                r.reservation_time,
                r.status,
                r.checked_in_at,
                r.checked_out_at,
                d.name as dog_name,
                d.photo_url as dog_photo,
                CASE WHEN pvi.id IS NOT NULL THEN true ELSE false END as has_pre_visit_input
         FROM reservations r
         JOIN dogs d ON r.dog_id = d.id
         LEFT JOIN pre_visit_inputs pvi ON r.id = pvi.reservation_id
         WHERE d.owner_id = $1
           AND r.store_id = $2
           AND r.reservation_date >= $3
           AND r.status != 'キャンセル'
           AND r.deleted_at IS NULL
           AND COALESCE(r.service_type, 'daycare') = $4
         ORDER BY r.reservation_date ASC, r.reservation_time ASC
         LIMIT 1`,
        [decoded.ownerId, decoded.storeId, today, serviceType]
      ),
      pool.query(
        `SELECT r.id,
                r.record_date,
                d.name as dog_name,
                d.photo_url as dog_photo,
                COALESCE(r.notes->>'report_text', '') as excerpt,
                (
                  COALESCE(jsonb_array_length(COALESCE(r.photos->'regular', '[]'::jsonb)), 0) +
                  COALESCE(jsonb_array_length(COALESCE(r.photos->'concerns', '[]'::jsonb)), 0)
                )::int as photo_count
         FROM records r
         JOIN dogs d ON r.dog_id = d.id
         WHERE d.owner_id = $1
           AND r.store_id = $2
           AND r.status = 'shared'
           AND r.deleted_at IS NULL
           AND r.record_type = $3
         ORDER BY r.record_date DESC, r.created_at DESC
         LIMIT 1`,
        [decoded.ownerId, decoded.storeId, serviceType]
      ),
      pool.query(
        `SELECT COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE oar.announcement_id IS NULL)::int as unread
         FROM store_announcements sa
         LEFT JOIN owner_announcement_reads oar
           ON oar.announcement_id = sa.id
          AND oar.owner_id = $2
         WHERE sa.store_id = $1
           AND sa.published_at IS NOT NULL
           AND sa.published_at <= $3
           AND (sa.expires_at IS NULL OR sa.expires_at > $3)`,
        [decoded.storeId, decoded.ownerId, now]
      ),
      pool.query(
        `SELECT id, title, published_at, is_important
         FROM store_announcements
         WHERE store_id = $1
           AND published_at IS NOT NULL
           AND published_at <= $2
           AND (expires_at IS NULL OR expires_at > $2)
         ORDER BY is_important DESC, published_at DESC
         LIMIT 1`,
        [decoded.storeId, now]
      ),
    ]);

    const nextReservation = nextReservationResult.rows[0] || null;
    const latestRecord = latestRecordResult.rows[0] || null;
    const announcementCounts = announcementCountResult.rows[0] || { total: 0, unread: 0 };
    const latestAnnouncement = latestAnnouncementResult.rows[0] || null;

    res.json({
      service_type: serviceType,
      next_reservation: nextReservation,
      latest_record: latestRecord
        ? {
            ...latestRecord,
            excerpt: latestRecord.excerpt || null,
          }
        : null,
      announcements: {
        total: Number(announcementCounts.total || 0),
        unread: Number(announcementCounts.unread || 0),
        latest: latestAnnouncement,
      },
    });
  } catch (error: unknown) {
    sendServerError(res, 'ダッシュボード情報の取得に失敗しました', error);
  }
});

export default router;
