import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  requireStoreId,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
} from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

// 契約一覧取得（犬ID指定）
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { dog_id } = req.query;

    if (!requireStoreId(req, res)) {
      return;
    }

    let query = `
      SELECT c.*, 
             d.name as dog_name,
             d.owner_id,
             o.name as owner_name,
             o.store_id
      FROM contracts c
      JOIN dogs d ON c.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      WHERE o.store_id = $1
    `;
    const params: (string | number)[] = [req.storeId];

    if (dog_id) {
      query += ` AND c.dog_id = $2`;
      params.push(String(dog_id));
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await pool.query(query, params);

    // 残回数を計算（予約履歴から）
    const contractsWithStats = await Promise.all(
      result.rows.map(async (contract) => {
        if (contract.contract_type === '月謝制') {
          // 月謝制の場合は残回数は計算しない（月ごとにリセット）
          return {
            ...contract,
            used_sessions: 0,
            calculated_remaining: contract.remaining_sessions,
          };
        }

        // チケット制・単発の場合、使用済み回数を計算
        const usedResult = await pool.query(
          `SELECT COUNT(*) as used_count
           FROM reservations r
           WHERE r.dog_id = $1
             AND r.status IN ('登園済', '降園済', '予定')
             AND r.reservation_date >= $2
             AND r.reservation_date <= COALESCE($3, CURRENT_DATE + INTERVAL '1 year')`,
          [
            contract.dog_id,
            contract.created_at,
            contract.valid_until,
          ]
        );

        const usedCount = parseInt(usedResult.rows[0]?.used_count || '0', 10);
        const calculatedRemaining = (contract.total_sessions || 0) - usedCount;

        return {
          ...contract,
          used_sessions: usedCount,
          calculated_remaining: Math.max(0, calculatedRemaining),
        };
      })
    );

    res.json(contractsWithStats);
  } catch (error) {
    sendServerError(res, '契約一覧の取得に失敗しました', error);
  }
});

// 契約詳細取得
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (!requireStoreId(req, res)) {
      return;
    }

    const result = await pool.query(
      `SELECT c.*, 
              d.name as dog_name,
              d.owner_id,
              o.name as owner_name,
              o.store_id
       FROM contracts c
       JOIN dogs d ON c.dog_id = d.id
       JOIN owners o ON d.owner_id = o.id
       WHERE c.id = $1 AND o.store_id = $2`,
      [id, req.storeId]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, '契約が見つかりません');
      return;
    }

    const contract = result.rows[0];

    // 使用履歴を取得
    const usageResult = await pool.query(
      `SELECT r.*, 
              r.reservation_date,
              r.reservation_time,
              r.status
       FROM reservations r
       WHERE r.dog_id = $1 
         AND r.status IN ('チェックイン済', '予定')
         AND r.reservation_date >= $2
       ORDER BY r.reservation_date DESC
       LIMIT 50`,
      [contract.dog_id, contract.created_at]
    );

    // 振替チケットを取得
    const ticketsResult = await pool.query(
      `SELECT * FROM makeup_tickets 
       WHERE dog_id = $1 
       ORDER BY issued_date DESC`,
      [contract.dog_id]
    );

    res.json({
      ...contract,
      usage_history: usageResult.rows,
      makeup_tickets: ticketsResult.rows,
    });
  } catch (error) {
    sendServerError(res, '契約情報の取得に失敗しました', error);
  }
});

// 契約作成
router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      dog_id,
      contract_type,
      course_name,
      total_sessions,
      remaining_sessions,
      valid_until,
      monthly_sessions,
      price,
    } = req.body;

    if (!dog_id || !contract_type) {
      sendBadRequest(res, '必須項目が不足しています');
      return;
    }

    // 犬のstore_idを確認
    const dogCheck = await pool.query(
      `SELECT o.store_id FROM dogs d
       JOIN owners o ON d.owner_id = o.id
       WHERE d.id = $1 AND o.store_id = $2`,
      [dog_id, req.storeId]
    );

    if (dogCheck.rows.length === 0) {
      sendForbidden(res);
      return;
    }

    // 有効期限の計算（チケット制の場合）
    let calculatedValidUntil = valid_until;
    if (contract_type === 'チケット制' && !valid_until && total_sessions) {
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
      calculatedValidUntil = threeMonthsLater.toISOString().split('T')[0];
    }

    const result = await pool.query(
      `INSERT INTO contracts (
        dog_id, contract_type, course_name, total_sessions, 
        remaining_sessions, valid_until, monthly_sessions, price
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        dog_id,
        contract_type,
        course_name || null,
        total_sessions || null,
        remaining_sessions || total_sessions || null,
        calculatedValidUntil || null,
        monthly_sessions || null,
        price || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '契約の作成に失敗しました', error);
  }
});

// 契約更新
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      contract_type,
      course_name,
      total_sessions,
      remaining_sessions,
      valid_until,
      monthly_sessions,
      price,
    } = req.body;

    if (!requireStoreId(req, res)) {
      return;
    }

    // 契約のstore_idを確認
    const contractCheck = await pool.query(
      `SELECT c.id FROM contracts c
       JOIN dogs d ON c.dog_id = d.id
       JOIN owners o ON d.owner_id = o.id
       WHERE c.id = $1 AND o.store_id = $2`,
      [id, req.storeId]
    );

    if (contractCheck.rows.length === 0) {
      sendNotFound(res, '契約が見つかりません');
      return;
    }

    const result = await pool.query(
      `UPDATE contracts SET
        contract_type = COALESCE($1, contract_type),
        course_name = COALESCE($2, course_name),
        total_sessions = COALESCE($3, total_sessions),
        remaining_sessions = COALESCE($4, remaining_sessions),
        valid_until = COALESCE($5, valid_until),
        monthly_sessions = COALESCE($6, monthly_sessions),
        price = COALESCE($7, price),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *`,
      [
        contract_type,
        course_name,
        total_sessions,
        remaining_sessions,
        valid_until,
        monthly_sessions,
        price,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '契約の更新に失敗しました', error);
  }
});

// 契約削除
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (!requireStoreId(req, res)) {
      return;
    }

    // 契約のstore_idを確認
    const contractCheck = await pool.query(
      `SELECT c.id FROM contracts c
       JOIN dogs d ON c.dog_id = d.id
       JOIN owners o ON d.owner_id = o.id
       WHERE c.id = $1 AND o.store_id = $2`,
      [id, req.storeId]
    );

    if (contractCheck.rows.length === 0) {
      sendNotFound(res, '契約が見つかりません');
      return;
    }

    await pool.query(`DELETE FROM contracts WHERE id = $1`, [id]);

    res.json({ success: true });
  } catch (error) {
    sendServerError(res, '契約の削除に失敗しました', error);
  }
});

export default router;
