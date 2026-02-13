import express from 'express';
import pool from '../../db/connection.js';
import { sendNotFound, sendServerError } from '../../utils/response.js';
import { requireOwnerToken } from './common.js';
import { isBusinessType, normalizeBusinessTypes, type BusinessType } from '../../utils/businessTypes.js';

const router = express.Router();

// 飼い主情報取得（認証済み）
router.get('/me', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const queryStart = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const timedQuery = async (label: string, queryFn: () => Promise<any>) => {
      const s = Date.now();
      const result = await queryFn();
      console.log(`[LIFF /me] ${label}: ${Date.now() - s}ms`);
      return result;
    };

    // パフォーマンス改善: 飼い主情報と犬情報を並列取得
    const [ownerResult, dogsResult, nextReservationResult, contractsResult] = await Promise.all([
      // 飼い主情報と店舗情報を取得（業態情報含む）
      timedQuery('owner', () => pool.query(
        `SELECT o.*, s.name as store_name, s.address as store_address,
                s.primary_business_type, s.business_types as store_business_types
         FROM owners o
         JOIN stores s ON o.store_id = s.id
         WHERE o.id = $1 AND o.store_id = $2`,
        [decoded.ownerId, decoded.storeId]
      )),
      // 登録犬を取得（reservation_countはJOINで取得）
      timedQuery('dogs', () => pool.query(
        `SELECT d.*,
                dh.mixed_vaccine_date, dh.rabies_vaccine_date,
                COALESCE(rc.cnt, 0) as reservation_count
         FROM dogs d
         LEFT JOIN dog_health dh ON d.id = dh.dog_id
         LEFT JOIN (
           SELECT dog_id, COUNT(*) as cnt
           FROM reservations
           WHERE status != 'キャンセル'
           GROUP BY dog_id
         ) rc ON rc.dog_id = d.id
         WHERE d.owner_id = $1
         ORDER BY d.created_at DESC`,
        [decoded.ownerId]
      )),
      // 次回予約を取得（登園前入力の有無も含める）
      timedQuery('nextReservation', () => pool.query(
        `SELECT r.*, d.name as dog_name, d.photo_url as dog_photo,
                CASE WHEN pvi.id IS NOT NULL THEN true ELSE false END as has_pre_visit_input
         FROM reservations r
         JOIN dogs d ON r.dog_id = d.id
         LEFT JOIN pre_visit_inputs pvi ON r.id = pvi.reservation_id
         WHERE d.owner_id = $1
           AND r.reservation_date >= $2
           AND r.status != 'キャンセル'
         ORDER BY r.reservation_date ASC, r.reservation_time ASC
         LIMIT 1`,
        [decoded.ownerId, today]
      )),
      // 契約情報を取得（犬情報への依存を排除）
      timedQuery('contracts', () => pool.query(
        `SELECT c.*,
                CASE
                  WHEN c.contract_type = '月謝制' THEN NULL
                  ELSE GREATEST(0, COALESCE(c.total_sessions, 0) - COALESCE(usage.used_count, 0))
                END as calculated_remaining
         FROM contracts c
         JOIN dogs d ON c.dog_id = d.id
         LEFT JOIN LATERAL (
           SELECT COUNT(*) as used_count
           FROM reservations r
           WHERE r.dog_id = c.dog_id
             AND r.status IN ('登園済', '降園済', '予定')
             AND COALESCE(r.service_type, 'daycare') = 'daycare'
             AND r.reservation_date >= c.created_at
             AND r.reservation_date <= COALESCE(c.valid_until, $2::date + INTERVAL '1 year')
         ) usage ON true
         WHERE d.owner_id = $1`,
        [decoded.ownerId, today]
      ))
    ]);
    console.log(`[LIFF /me] total queries: ${Date.now() - queryStart}ms`);

    if (ownerResult.rows.length === 0) {
      sendNotFound(res, '飼い主が見つかりません');
      return;
    }

    const owner = ownerResult.rows[0];
    const ownerBusinessTypes = normalizeBusinessTypes(owner.business_types);
    const storeBusinessTypes = normalizeBusinessTypes(owner.store_business_types);
    const fallbackPrimary = isBusinessType(owner.primary_business_type)
      ? owner.primary_business_type
      : 'daycare';
    const availableBusinessTypes = ownerBusinessTypes.length > 0
      ? ownerBusinessTypes
      : storeBusinessTypes.length > 0
        ? storeBusinessTypes
        : [fallbackPrimary];

    const contracts = contractsResult.rows;

    res.json({
      ...owner,
      primary_business_type: fallbackPrimary,
      available_business_types: availableBusinessTypes,
      dogs: dogsResult.rows,
      contracts,
      nextReservation: nextReservationResult.rows[0] || null,
    });
  } catch (error: any) {
    sendServerError(res, '飼い主情報の取得に失敗しました', error);
  }
});

export default router;
