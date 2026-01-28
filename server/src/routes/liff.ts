import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db/connection.js';
import { sendEmail } from '../services/emailService.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from '../utils/response.js';

const router = express.Router();

interface OwnerToken {
  ownerId: number;
  storeId: number;
  type: string;
}

function requireOwnerToken(req: express.Request, res: express.Response): OwnerToken | null {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    sendUnauthorized(res, '認証トークンが提供されていません');
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as OwnerToken;
    if (decoded.type !== 'owner') {
      sendForbidden(res, '飼い主専用のエンドポイントです');
      return null;
    }
    return decoded;
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      sendUnauthorized(res, '無効な認証トークンです');
      return null;
    }
    throw error;
  }
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

router.post('/auth', async function(req, res) {
  const startTime = Date.now();
  console.log('🔐 LIFF auth開始');

  try {
    const { lineUserId, displayName, pictureUrl } = req.body;

    if (!lineUserId) {
      sendBadRequest(res, 'LINEユーザーIDが必要です');
      return;
    }

    console.log('🔐 DBクエリ開始:', Date.now() - startTime, 'ms');

    // LINE IDで飼い主を検索（店舗名・住所も含める）
    const ownerResult = await pool.query(
      `SELECT o.*, s.name as store_name, s.address as store_address
       FROM owners o
       JOIN stores s ON o.store_id = s.id
       WHERE o.line_id = $1
       LIMIT 1`,
      [lineUserId]
    );

    console.log('🔐 DBクエリ完了:', Date.now() - startTime, 'ms');

    if (ownerResult.rows.length === 0) {
      // 飼い主が見つからない場合は新規登録が必要
      return res.status(404).json({
        error: 'LINEアカウントが登録されていません',
        requiresRegistration: true
      });
    }

    const owner = ownerResult.rows[0];

    // LINE IDが一致する場合、JWTトークンを発行
    const token = jwt.sign(
      {
        ownerId: owner.id,
        storeId: owner.store_id,
        lineUserId: lineUserId,
        type: 'owner', // スタッフと区別するため
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' } // 飼い主は30日間有効
    );

    console.log('🔐 LIFF auth完了:', Date.now() - startTime, 'ms');

    res.json({
      token,
      owner: {
        id: owner.id,
        name: owner.name,
        storeId: owner.store_id,
        storeName: owner.store_name,
        storeAddress: owner.store_address || '',
        lineUserId: lineUserId,
      },
    });
  } catch (error) {
    console.error('LINE auth error:', error, 'elapsed:', Date.now() - startTime, 'ms');
    sendServerError(res, 'LINE認証に失敗しました', error);
  }
});

// 飼い主情報取得（認証済み）
router.get('/me', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    // パフォーマンス改善: 飼い主情報と犬情報を並列取得
    const [ownerResult, dogsResult, nextReservationResult] = await Promise.all([
      // 飼い主情報と店舗情報を取得
      pool.query(
        `SELECT o.*, s.name as store_name, s.address as store_address
         FROM owners o
         JOIN stores s ON o.store_id = s.id
         WHERE o.id = $1 AND o.store_id = $2`,
        [decoded.ownerId, decoded.storeId]
      ),
      // 登録犬を取得
      pool.query(
        `SELECT d.*,
                dh.mixed_vaccine_date, dh.rabies_vaccine_date,
                (SELECT COUNT(*) FROM reservations r WHERE r.dog_id = d.id AND r.status != 'キャンセル') as reservation_count
         FROM dogs d
         LEFT JOIN dog_health dh ON d.id = dh.dog_id
         WHERE d.owner_id = $1
         ORDER BY d.created_at DESC`,
        [decoded.ownerId]
      ),
      // 次回予約を取得（登園前入力の有無も含める）
      pool.query(
        `SELECT r.*, d.name as dog_name, d.photo_url as dog_photo,
                CASE WHEN pvi.id IS NOT NULL THEN true ELSE false END as has_pre_visit_input
         FROM reservations r
         JOIN dogs d ON r.dog_id = d.id
         LEFT JOIN pre_visit_inputs pvi ON r.id = pvi.reservation_id
         WHERE d.owner_id = $1
           AND r.reservation_date >= CURRENT_DATE
           AND r.status != 'キャンセル'
         ORDER BY r.reservation_date ASC, r.reservation_time ASC
         LIMIT 1`,
        [decoded.ownerId]
      )
    ]);

    if (ownerResult.rows.length === 0) {
      sendNotFound(res, '飼い主が見つかりません');
      return;
    }

    const owner = ownerResult.rows[0];

    // 契約情報を取得（エラーが発生した場合は空配列を返す）
    let contracts: any[] = [];
    try {
      const dogIds = dogsResult.rows.map((d: any) => d.id);
      if (dogIds.length > 0) {
        const contractsResult = await pool.query(
          `SELECT c.*,
                  CASE
                    WHEN c.contract_type = '月謝制' THEN NULL
                    ELSE GREATEST(0, COALESCE(c.total_sessions, 0) - COALESCE(usage.used_count, 0))
                  END as calculated_remaining
           FROM contracts c
           LEFT JOIN LATERAL (
             SELECT COUNT(*) as used_count
             FROM reservations r
             WHERE r.dog_id = c.dog_id
               AND r.status IN ('登園済', '降園済', '予定')
               AND r.reservation_date >= c.created_at
               AND r.reservation_date <= COALESCE(c.valid_until, CURRENT_DATE + INTERVAL '1 year')
           ) usage ON true
           WHERE c.dog_id = ANY($1::int[])`,
          [dogIds]
        );
        contracts = contractsResult.rows;
      }
    } catch (contractError) {
      console.warn('契約情報の取得をスキップしました:', contractError);
    }

    res.json({
      ...owner,
      dogs: dogsResult.rows,
      contracts,
      nextReservation: nextReservationResult.rows[0] || null,
    });
  } catch (error: any) {
    sendServerError(res, '飼い主情報の取得に失敗しました', error);
  }
});

// 飼い主の予約一覧取得
router.get('/reservations', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { month } = req.query;

    let query = `
      SELECT r.*, d.name as dog_name, d.photo_url as dog_photo,
             pvi.morning_urination, pvi.morning_defecation,
             pvi.afternoon_urination, pvi.afternoon_defecation,
             pvi.breakfast_status, pvi.health_status, pvi.notes as pre_visit_notes,
             CASE WHEN pvi.id IS NOT NULL THEN true ELSE false END as has_pre_visit_input
      FROM reservations r
      JOIN dogs d ON r.dog_id = d.id
      LEFT JOIN pre_visit_inputs pvi ON r.id = pvi.reservation_id
      WHERE d.owner_id = $1 AND r.store_id = $2
    `;
    const params: any[] = [decoded.ownerId, decoded.storeId];

    if (month) {
      query += ` AND r.reservation_date >= $3::date AND r.reservation_date < ($3::date + INTERVAL '1 month')`;
      params.push(`${month}-01`);
    }

    query += ` ORDER BY r.reservation_date DESC, r.reservation_time DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    sendServerError(res, '予約情報の取得に失敗しました', error);
  }
});

// 予約をiCS形式でエクスポート
router.get('/reservations/export.ics', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { month, reservation_id } = req.query;

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
    const params: any[] = [decoded.ownerId, decoded.storeId];

    if (reservation_id) {
      query += ` AND r.id = $3`;
      params.push(reservation_id);
    } else if (month) {
      query += ` AND r.reservation_date >= $3::date AND r.reservation_date < ($3::date + INTERVAL '1 month')`;
      params.push(`${month}-01`);
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
    console.error('ICS export error:', error);
    sendServerError(res, 'カレンダーエクスポートに失敗しました', error);
  }
});

// 飼い主の日誌一覧取得
router.get('/journals', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { dog_id } = req.query;

    let query = `
      SELECT j.*, d.name as dog_name, d.photo_url as dog_photo, s.name as staff_name
      FROM journals j
      JOIN dogs d ON j.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      LEFT JOIN staff s ON j.staff_id = s.id
      WHERE d.owner_id = $1 AND o.store_id = $2
    `;
    const params: any[] = [decoded.ownerId, decoded.storeId];

    if (dog_id) {
      query += ` AND d.id = $3`;
      params.push(dog_id);
    }

    query += ` ORDER BY j.journal_date DESC, j.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    sendServerError(res, '日誌情報の取得に失敗しました', error);
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
    console.error('Availability error:', error);
    sendServerError(res, '空き状況の取得に失敗しました', error);
  }
});

// 飼い主の予約作成
router.post('/reservations', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { dog_id, reservation_date, reservation_time, notes } = req.body;

    if (!dog_id || !reservation_date) {
      sendBadRequest(res, '犬IDと予約日は必須です');
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

    // 契約残数チェック（チケット制の場合）
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

    const result = await pool.query(
      `INSERT INTO reservations (
        store_id, dog_id, reservation_date, reservation_time, memo
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        decoded.storeId,
        dog_id,
        reservation_date,
        reservation_time || '09:00',
        notes || null,
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

// 登園前入力（飼い主が入力）
router.post('/pre-visit-inputs', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const {
      reservation_id,
      morning_urination,
      morning_defecation,
      afternoon_urination,
      afternoon_defecation,
      breakfast_status,
      health_status,
      notes,
    } = req.body;

    if (!reservation_id) {
      sendBadRequest(res, '予約IDが必要です');
      return;
    }

    // 予約がこの飼い主のものか確認
    const reservationCheck = await pool.query(
      `SELECT r.* FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       WHERE r.id = $1 AND d.owner_id = $2 AND r.store_id = $3`,
      [reservation_id, decoded.ownerId, decoded.storeId]
    );

    if (reservationCheck.rows.length === 0) {
      sendForbidden(res, '権限がありません');
      return;
    }

    // 既存の入力があるか確認
    const existing = await pool.query(
      `SELECT id FROM pre_visit_inputs WHERE reservation_id = $1`,
      [reservation_id]
    );

    let result;
    if (existing.rows.length > 0) {
      // 更新
      result = await pool.query(
        `UPDATE pre_visit_inputs SET
          morning_urination = $1, morning_defecation = $2,
          afternoon_urination = $3, afternoon_defecation = $4,
          breakfast_status = $5, health_status = $6, notes = $7,
          submitted_at = CURRENT_TIMESTAMP
        WHERE reservation_id = $8
        RETURNING *`,
        [
          morning_urination,
          morning_defecation,
          afternoon_urination,
          afternoon_defecation,
          breakfast_status,
          health_status,
          notes,
          reservation_id,
        ]
      );
    } else {
      // 新規作成
      result = await pool.query(
        `INSERT INTO pre_visit_inputs (
          reservation_id, morning_urination, morning_defecation,
          afternoon_urination, afternoon_defecation,
          breakfast_status, health_status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          reservation_id,
          morning_urination,
          morning_defecation,
          afternoon_urination,
          afternoon_defecation,
          breakfast_status,
          health_status,
          notes,
        ]
      );
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Pre-visit input save error:', error);
    sendServerError(res, '登園前入力の保存に失敗しました', error);
  }
});

router.post('/link/request', async function(req, res) {
  try {
    const { phone, lineUserId } = req.body;

    if (!phone || !lineUserId) {
      sendBadRequest(res, '電話番号とLINEユーザーIDが必要です');
      return;
    }

    // 電話番号で飼い主を検索
    const ownerResult = await pool.query(
      `SELECT o.* FROM owners o WHERE o.phone = $1 LIMIT 1`,
      [phone]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({
        error: 'この電話番号で登録されているアカウントが見つかりません',
      });
    }

    const owner = ownerResult.rows[0];

    // 既にLINE IDが紐付いている場合
    if (owner.line_id && owner.line_id === lineUserId) {
      return res.status(400).json({
        error: 'このLINEアカウントは既に紐付けられています',
      });
    }

    // メールアドレスが登録されていない場合
    if (!owner.email) {
      return res.status(400).json({
        error: 'メールアドレスが登録されていません。店舗にお問い合わせください。',
      });
    }

    // 確認コードを生成
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10分後

    // 既存のコードを削除（同じ電話番号とLINE User IDの組み合わせ）
    await pool.query(
      `DELETE FROM line_link_codes WHERE phone = $1 AND line_user_id = $2`,
      [phone, lineUserId]
    );

    // 確認コードを保存
    await pool.query(
      `INSERT INTO line_link_codes (phone, code, line_user_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [phone, code, lineUserId, expiresAt]
    );

    // メール送信
    const emailSent = await sendEmail(
      owner.email,
      '【Blink】LINEアカウント紐付けの確認コード',
      `確認コード: ${code}\n\nこのコードは10分間有効です。\n\nこのメールに心当たりがない場合は、無視してください。`,
      `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>LINEアカウント紐付けの確認コード</h2>
          <p>以下の確認コードを入力してください：</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #666; font-size: 14px;">このコードは10分間有効です。</p>
          <p style="color: #666; font-size: 14px;">このメールに心当たりがない場合は、無視してください。</p>
        </div>
      `
    );

    if (!emailSent) {
      sendServerError(res, '確認コードの送信に失敗しました', null);
      return;
    }

    res.json({
      message: '確認コードを送信しました',
      maskedEmail: maskEmail(owner.email),
    });
  } catch (error: any) {
    console.error('Link request error:', error);
    sendServerError(res, '紐付けリクエストの処理に失敗しました', error);
  }
});

// LINE ID紐付け確認（確認コード検証）
router.post('/link/verify', async function(req, res) {
  try {
    const { phone, code, lineUserId } = req.body;

    if (!phone || !code || !lineUserId) {
      sendBadRequest(res, '電話番号、確認コード、LINEユーザーIDが必要です');
      return;
    }

    // 確認コードを検証
    const codeResult = await pool.query(
      `SELECT * FROM line_link_codes
       WHERE phone = $1 AND line_user_id = $2 AND code = $3 AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC
       LIMIT 1`,
      [phone, lineUserId, code]
    );

    if (codeResult.rows.length === 0) {
      // 試行回数をカウント
      await pool.query(
        `UPDATE line_link_codes
         SET attempts = attempts + 1
         WHERE phone = $1 AND line_user_id = $2 AND expires_at > CURRENT_TIMESTAMP`,
        [phone, lineUserId]
      );

      return res.status(400).json({
        error: '確認コードが正しくないか、期限切れです',
      });
    }

    const codeRecord = codeResult.rows[0];

    // 試行回数制限（5回）
    if (codeRecord.attempts >= 5) {
      return res.status(400).json({
        error: '試行回数の上限に達しました。再度確認コードをリクエストしてください。',
      });
    }

    // 電話番号で飼い主を取得
    const ownerResult = await pool.query(
      `SELECT o.* FROM owners o WHERE o.phone = $1 LIMIT 1`,
      [phone]
    );

    if (ownerResult.rows.length === 0) {
      sendNotFound(res, '飼い主が見つかりません');
      return;
    }

    const owner = ownerResult.rows[0];

    // LINE User IDを更新
    await pool.query(
      `UPDATE owners SET line_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [lineUserId, owner.id]
    );

    // 使用済み確認コードを削除
    await pool.query(
      `DELETE FROM line_link_codes WHERE phone = $1 AND line_user_id = $2`,
      [phone, lineUserId]
    );

    // JWTトークンを発行
    const token = jwt.sign(
      {
        ownerId: owner.id,
        storeId: owner.store_id,
        lineUserId: lineUserId,
        type: 'owner',
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' }
    );

    res.json({
      token,
      owner: {
        id: owner.id,
        name: owner.name,
        storeId: owner.store_id,
        lineUserId: lineUserId,
      },
      message: 'LINEアカウントの紐付けが完了しました',
    });
  } catch (error: any) {
    console.error('Link verify error:', error);
    sendServerError(res, '紐付け確認の処理に失敗しました', error);
  }
});

// 店舗側: 店舗固定のQRコード生成（店舗認証が必要）
router.get('/qr-code', authenticate, async function(req: AuthRequest, res) {
  try {
    const storeId = req.storeId;
    
    if (!storeId) {
      sendForbidden(res, '店舗が設定されていません');
      return;
    }

    // QRコードに含める情報: store_id のみ（固定）
    const qrData = {
      storeId,
      type: 'checkin',
    };

    // 署名付きトークンを生成（有効期限なし、店舗固定）
    const qrToken = jwt.sign(
      qrData,
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '365d' } // 1年間有効（実質的に固定）
    );

    res.json({
      qrCode: qrToken,
      storeId,
    });
  } catch (error: any) {
    console.error('QR code generation error:', error);
    sendServerError(res, 'QRコードの生成に失敗しました', error);
  }
});

// LIFF側: QRコードによるチェックイン
router.post('/check-in', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { qrCode, reservationId } = req.body;

    if (!qrCode || !reservationId) {
      sendBadRequest(res, 'QRコードと予約IDが必要です');
      return;
    }

    // QRコードの署名を検証
    let qrData: any;
    try {
      qrData = jwt.verify(qrCode, process.env.JWT_SECRET || 'secret') as any;
    } catch (error: any) {
      return res.status(400).json({
        error: '無効なQRコードです',
      });
    }

    // QRコードタイプを確認
    if (qrData.type !== 'checkin') {
      return res.status(400).json({
        error: '無効なQRコードです',
      });
    }

    // 店舗IDを確認
    if (qrData.storeId !== decoded.storeId) {
      return res.status(400).json({
        error: 'このQRコードは別の店舗のものです',
      });
    }

    // 予約を確認
    const reservationCheck = await pool.query(
      `SELECT r.* FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       WHERE r.id = $1 AND d.owner_id = $2 AND r.store_id = $3 AND r.status != 'キャンセル'`,
      [reservationId, decoded.ownerId, decoded.storeId]
    );

    if (reservationCheck.rows.length === 0) {
      sendNotFound(res, '予約が見つかりません');
      return;
    }

    const reservation = reservationCheck.rows[0];

    // 予約日が今日以降であることを確認
    const today = new Date().toISOString().split('T')[0];
    if (reservation.reservation_date < today) {
      return res.status(400).json({
        error: 'この予約は過去の予約です',
      });
    }

    // 既に登園済みか確認
    if (reservation.status === '登園済' || reservation.status === '降園済') {
      return res.status(400).json({
        error: '既に登園済みです',
      });
    }

    // 予約ステータスを「登園済」に更新
    const result = await pool.query(
      `UPDATE reservations 
       SET status = '登園済',
           checked_in_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [reservationId]
    );

    // 契約残数を減算（チケット制の場合）
    const contractResult = await pool.query(
      `SELECT id, contract_type, remaining_sessions
       FROM contracts
       WHERE dog_id = $1
         AND contract_type = 'チケット制'
         AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
         AND remaining_sessions > 0
       ORDER BY created_at DESC
       LIMIT 1`,
      [reservation.dog_id]
    );

    if (contractResult.rows.length > 0) {
      const contract = contractResult.rows[0];
      await pool.query(
        `UPDATE contracts 
         SET remaining_sessions = remaining_sessions - 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [contract.id]
      );
    }

    res.json({
      message: '登園が完了しました',
      reservation: result.rows[0],
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    sendServerError(res, '登園処理に失敗しました', error);
  }
});

// LIFF側: QRコードによるチェックアウト（降園）
router.post('/check-out', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { qrCode, reservationId } = req.body;

    if (!qrCode || !reservationId) {
      sendBadRequest(res, 'QRコードと予約IDが必要です');
      return;
    }

    // QRコードを検証
    try {
      const qrData = jwt.verify(qrCode, process.env.JWT_SECRET || 'secret') as {
        storeId: number;
        type: string;
      };

      if (qrData.type !== 'store_checkin' || qrData.storeId !== decoded.storeId) {
        return res.status(400).json({
          error: 'QRコードが無効です',
        });
      }
    } catch (jwtError) {
      return res.status(400).json({
        error: 'QRコードが無効または期限切れです',
      });
    }

    // 予約を取得・検証
    const reservationResult = await pool.query(
      `SELECT r.*, d.owner_id, d.name as dog_name
       FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       WHERE r.id = $1`,
      [reservationId]
    );

    if (reservationResult.rows.length === 0) {
      return res.status(404).json({
        error: '予約が見つかりません',
      });
    }

    const reservation = reservationResult.rows[0];

    // 飼い主の犬か確認
    if (reservation.owner_id !== decoded.ownerId) {
      return res.status(403).json({
        error: 'この予約にアクセスする権限がありません',
      });
    }

    // 登園済みか確認
    if (reservation.status !== '登園済') {
      return res.status(400).json({
        error: 'まだ登園していません',
      });
    }

    // 既にチェックアウト済みか確認
    if (reservation.checked_out_at) {
      return res.status(400).json({
        error: '既にチェックアウト済みです',
      });
    }

    // 降園時刻とステータスを更新
    const result = await pool.query(
      `UPDATE reservations
       SET status = '降園済',
           checked_out_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [reservationId]
    );

    res.json({
      message: '降園が完了しました',
      reservation: result.rows[0],
    });
  } catch (error: any) {
    console.error('Check-out error:', error);
    sendServerError(res, '退園処理に失敗しました', error);
  }
});

// 公開中のお知らせ一覧取得
router.get('/announcements', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const now = new Date().toISOString();

    const result = await pool.query(
      `SELECT id, title, content, image_url, is_important, published_at, created_at
       FROM store_announcements
       WHERE store_id = $1
         AND published_at IS NOT NULL
         AND published_at <= $2
         AND (expires_at IS NULL OR expires_at > $2)
       ORDER BY is_important DESC, published_at DESC`,
      [decoded.storeId, now]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Announcements fetch error:', error);
    sendServerError(res, 'お知らせの取得に失敗しました', error);
  }
});

// お知らせ詳細取得
router.get('/announcements/:id', async function(req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { id } = req.params;
    const now = new Date().toISOString();

    const result = await pool.query(
      `SELECT id, title, content, image_url, is_important, published_at, created_at
       FROM store_announcements
       WHERE id = $1
         AND store_id = $2
         AND published_at IS NOT NULL
         AND published_at <= $3
         AND (expires_at IS NULL OR expires_at > $3)`,
      [id, decoded.storeId, now]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, 'お知らせが見つかりません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Announcement detail fetch error:', error);
    sendServerError(res, 'お知らせの取得に失敗しました', error);
  }
});

export default router;
