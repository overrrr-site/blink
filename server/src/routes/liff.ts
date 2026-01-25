import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db/connection.js';
import { sendEmail } from '../services/emailService.js';
import {
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from '../utils/response.js';

const router = express.Router();

type OwnerToken = {
  ownerId: number;
  storeId: number;
  type: string;
};

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

// LINE認証（LIFF用）
router.post('/auth', async (req, res) => {
  try {
    const { lineUserId, displayName, pictureUrl } = req.body;

    if (!lineUserId) {
      sendBadRequest(res, 'LINEユーザーIDが必要です');
      return;
    }

    // LINE IDで飼い主を検索
    const ownerResult = await pool.query(
      `SELECT o.*
       FROM owners o
       WHERE o.line_id = $1
       LIMIT 1`,
      [lineUserId]
    );

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

    res.json({
      token,
      owner: {
        id: owner.id,
        name: owner.name,
        storeId: owner.store_id,
        lineUserId: lineUserId,
      },
    });
  } catch (error) {
    console.error('LINE auth error:', error);
    sendServerError(res, 'LINE認証に失敗しました', error);
  }
});

// 飼い主情報取得（認証済み）
router.get('/me', async (req, res) => {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    // 飼い主情報と登録犬を取得
    const ownerResult = await pool.query(
      `SELECT o.* FROM owners o WHERE o.id = $1 AND o.store_id = $2`,
      [decoded.ownerId, decoded.storeId]
    );

    if (ownerResult.rows.length === 0) {
      sendNotFound(res, '飼い主が見つかりません');
      return;
    }

    const owner = ownerResult.rows[0];

    // 登録犬を取得
    const dogsResult = await pool.query(
      `SELECT d.*, 
              dh.mixed_vaccine_date, dh.rabies_vaccine_date,
              (SELECT COUNT(*) FROM reservations r WHERE r.dog_id = d.id AND r.status != 'キャンセル') as reservation_count
       FROM dogs d
       LEFT JOIN dog_health dh ON d.id = dh.dog_id
       WHERE d.owner_id = $1
       ORDER BY d.created_at DESC`,
      [owner.id]
    );

    // 契約情報を取得（エラーが発生した場合は空配列を返す）
    let contractsResult = { rows: [] };
    try {
      contractsResult = await pool.query(
        `SELECT * FROM contracts WHERE dog_id = ANY($1::int[])`,
        [dogsResult.rows.map((d: any) => d.id)]
      );
    } catch (contractError) {
      console.warn('契約情報の取得をスキップしました:', contractError);
    }

    // 次回予約を取得
    const nextReservationResult = await pool.query(
      `SELECT r.*, d.name as dog_name, d.photo_url as dog_photo
       FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
       WHERE d.owner_id = $1 
         AND r.reservation_date >= CURRENT_DATE
         AND r.status != 'キャンセル'
       ORDER BY r.reservation_date ASC, r.reservation_time ASC
       LIMIT 1`,
      [owner.id]
    );

    res.json({
      ...owner,
      dogs: dogsResult.rows,
      contracts: contractsResult.rows,
      nextReservation: nextReservationResult.rows[0] || null,
    });
  } catch (error: any) {
    sendServerError(res, '飼い主情報の取得に失敗しました', error);
  }
});

// 飼い主の予約一覧取得
router.get('/reservations', async (req, res) => {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { month } = req.query;

    let query = `
      SELECT r.*, d.name as dog_name, d.photo_url as dog_photo
      FROM reservations r
      JOIN dogs d ON r.dog_id = d.id
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

// 飼い主の日誌一覧取得
router.get('/journals', async (req, res) => {
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
router.get('/reservations/:id', async (req, res) => {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*, d.name as dog_name, d.photo_url as dog_photo
       FROM reservations r
       JOIN dogs d ON r.dog_id = d.id
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

// 飼い主の予約作成
router.post('/reservations', async (req, res) => {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { dog_id, reservation_date, reservation_time, pickup_time, notes } = req.body;

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

    const result = await pool.query(
      `INSERT INTO reservations (
        store_id, dog_id, reservation_date, reservation_time, pickup_time, status, notes
      ) VALUES ($1, $2, $3, $4, $5, '予約済み', $6)
      RETURNING *`,
      [
        decoded.storeId,
        dog_id,
        reservation_date,
        reservation_time || '09:00',
        pickup_time || '17:00',
        notes || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    sendServerError(res, '予約の作成に失敗しました', error);
  }
});

// 飼い主の予約更新
router.put('/reservations/:id', async (req, res) => {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { id } = req.params;
    const { reservation_date, reservation_time, pickup_time, notes } = req.body;

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
        pickup_time = COALESCE($3, pickup_time),
        notes = COALESCE($4, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *`,
      [reservation_date, reservation_time, pickup_time, notes, id]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    sendServerError(res, '予約の更新に失敗しました', error);
  }
});

// 飼い主の予約キャンセル
router.put('/reservations/:id/cancel', async (req, res) => {
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
router.post('/pre-visit-inputs', async (req, res) => {
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
          updated_at = CURRENT_TIMESTAMP
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
    sendServerError(res, '登園前入力の保存に失敗しました', error);
  }
});

// 確認コード生成（6桁）
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// メールアドレスをマスク表示
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

// LINE ID紐付けリクエスト（確認コード送信）
router.post('/link/request', async (req, res) => {
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
router.post('/link/verify', async (req, res) => {
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
      [phone, code, lineUserId]
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

export default router;
