import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireStoreId, sendServerError } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

// ダッシュボードデータ取得
router.get('/', async function(req: AuthRequest, res): Promise<void> {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // 今日の予約
    const reservationsResult = await pool.query(
      `SELECT r.*, 
              d.name as dog_name, d.photo_url as dog_photo,
              o.name as owner_name,
              pvi.morning_urination, pvi.morning_defecation, 
              pvi.afternoon_urination, pvi.afternoon_defecation,
              pvi.breakfast_status, pvi.health_status, pvi.notes
       FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       JOIN owners o ON d.owner_id = o.id
       LEFT JOIN pre_visit_inputs pvi ON r.id = pvi.reservation_id
       WHERE r.store_id = $1 AND r.reservation_date = $2
       ORDER BY r.reservation_time`,
      [req.storeId, today]
    );

    // 未入力の日誌（日誌が作成されていない、または内容が空の予約）
    const incompleteJournalsResult = await pool.query(
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
         AND r.reservation_date <= $2
         AND r.status IN ('登園済', '退園済')
         AND (j.id IS NULL OR j.comment IS NULL OR j.comment = '')
       ORDER BY r.reservation_date DESC
       LIMIT 10`,
      [req.storeId, today]
    );

    // アラート（ワクチン期限切れ等）
    // 最適化: UNION ALLをやめて1回のスキャンでアラートを取得
    const alertsResult = await pool.query(
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
    );

    // 今日の点検記録
    const inspectionRecordResult = await pool.query(
      `SELECT * FROM inspection_records
       WHERE store_id = $1 AND inspection_date = $2`,
      [req.storeId, today]
    );

    // お知らせ件数（公開中/下書き）
    const now = new Date().toISOString();
    const announcementStatsResult = await pool.query(
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
    );

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
