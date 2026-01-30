import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { cacheControl } from '../middleware/cache.js';
import { requireStoreId, sendServerError } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

// ダッシュボードデータ取得
router.get('/', cacheControl(), async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    // 未入力日誌の検索範囲を過去30日に制限（パフォーマンス改善）
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 5つのクエリを並列実行（パフォーマンス改善）
    const queryStart = Date.now();
    const timedQuery = async (label: string, queryFn: () => Promise<any>) => {
      const s = Date.now();
      const result = await queryFn();
      console.log(`[DASHBOARD] ${label}: ${Date.now() - s}ms`);
      return result;
    };

    const [
      reservationsResult,
      incompleteJournalsResult,
      alertsResult,
      inspectionRecordResult,
      announcementStatsResult
    ] = await Promise.all([
      timedQuery('reservations', () => pool.query(
        `SELECT r.*,
                d.name as dog_name, d.photo_url as dog_photo,
                o.name as owner_name,
                pvi.morning_urination, pvi.morning_defecation,
                pvi.afternoon_urination, pvi.afternoon_defecation,
                pvi.breakfast_status, pvi.health_status, pvi.notes,
                CASE WHEN j.id IS NOT NULL AND j.comment IS NOT NULL AND j.comment != '' THEN true ELSE false END as has_journal
         FROM reservations r
         JOIN dogs d ON r.dog_id = d.id
         JOIN owners o ON d.owner_id = o.id
         LEFT JOIN pre_visit_inputs pvi ON r.id = pvi.reservation_id
         LEFT JOIN journals j ON r.id = j.reservation_id
         WHERE r.store_id = $1 AND r.reservation_date = $2
         ORDER BY r.reservation_time`,
        [req.storeId, today]
      )),

      timedQuery('incompleteJournals', () => pool.query(
        `SELECT r.id as reservation_id,
                r.reservation_date,
                r.reservation_date as journal_date,
                r.reservation_time,
                r.dog_id,
                d.name as dog_name,
                d.photo_url as dog_photo,
                o.name as owner_name,
                j.id as journal_id,
                j.comment
         FROM reservations r
         JOIN dogs d ON r.dog_id = d.id
         JOIN owners o ON d.owner_id = o.id
         LEFT JOIN journals j ON r.id = j.reservation_id
         WHERE r.store_id = $1
           AND r.reservation_date BETWEEN $2 AND $3
           AND r.status IN ('登園済', '降園済')
           AND (j.id IS NULL OR j.comment IS NULL OR j.comment = '')
         ORDER BY r.reservation_date DESC
         LIMIT 10`,
        [req.storeId, thirtyDaysAgo, today]
      )),

      timedQuery('alerts', () => pool.query(
        `SELECT d.id as dog_id, d.name as dog_name, d.gender as dog_gender, o.name as owner_name,
                CASE
                  WHEN dh.mixed_vaccine_date < CURRENT_DATE - INTERVAL '365 days' THEN 'mixed_vaccine_expired'
                  WHEN dh.rabies_vaccine_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days' THEN 'rabies_vaccine_expiring'
                END as alert_type,
                CASE
                  WHEN dh.mixed_vaccine_date < CURRENT_DATE - INTERVAL '365 days' THEN dh.mixed_vaccine_date
                  ELSE dh.rabies_vaccine_date
                END as mixed_vaccine_date
         FROM dogs d
         JOIN owners o ON d.owner_id = o.id
         JOIN dog_health dh ON d.id = dh.dog_id
         WHERE o.store_id = $1
           AND d.deleted_at IS NULL
           AND (
             dh.mixed_vaccine_date < CURRENT_DATE - INTERVAL '365 days'
             OR dh.rabies_vaccine_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
           )
         ORDER BY mixed_vaccine_date ASC
         LIMIT 20`,
        [req.storeId]
      )),

      timedQuery('inspectionRecord', () => pool.query(
        `SELECT * FROM inspection_records
         WHERE store_id = $1 AND inspection_date = $2`,
        [req.storeId, today]
      )),

      timedQuery('announcements', () => pool.query(
        `SELECT
          COUNT(*) FILTER (
            WHERE published_at IS NOT NULL
              AND published_at <= $2
              AND (expires_at IS NULL OR expires_at > $2)
          ) as published_count,
          COUNT(*) FILTER (
            WHERE published_at IS NULL OR published_at > $2
          ) as draft_count
         FROM store_announcements
         WHERE store_id = $1`,
        [req.storeId, now]
      ))
    ]);
    console.log(`[DASHBOARD] total queries: ${Date.now() - queryStart}ms`);

    res.json({
      todayReservations: reservationsResult.rows,
      incompleteJournals: incompleteJournalsResult.rows,
      alerts: alertsResult.rows,
      todayInspectionRecord: inspectionRecordResult.rows[0] || null,
      announcementStats: {
        published: parseInt(announcementStatsResult.rows[0]?.published_count || '0'),
        draft: parseInt(announcementStatsResult.rows[0]?.draft_count || '0'),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    sendServerError(res, 'ダッシュボードデータの取得に失敗しました', error);
  }
});

export default router;
