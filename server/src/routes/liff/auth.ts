import express from 'express';
import pool from '../../db/connection.js';
import { sendEmail } from '../../services/emailService.js';
import { sendBadRequest, sendNotFound, sendServerError, sendUnauthorized } from '../../utils/response.js';
import { generateVerificationCode, maskEmail } from './common.js';
import {
  SecurityConfigurationError,
  type VerifiedLineIdentity,
  signOwnerToken,
  verifyLineIdentity,
} from './security.js';

const router = express.Router();

type LinkOwnerRow = {
  id: number;
  store_id: number;
  name: string;
  email: string | null;
  line_id: string | null;
  store_name?: string;
};

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

function parseScopedId(value: unknown, fieldName: string): { value: number | null; error?: string } {
  if (value === undefined || value === null || value === '') {
    return { value: null };
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { value: null, error: `${fieldName}が不正です` };
  }

  return { value: parsed };
}

async function findOwnersForLink(params: {
  phone: string;
  ownerId?: number | null;
  storeId?: number | null;
}): Promise<LinkOwnerRow[]> {
  const queryParams: Array<string | number> = [params.phone];
  let query = `
    SELECT o.*, s.name as store_name
    FROM owners o
    JOIN stores s ON o.store_id = s.id
    WHERE o.phone = $1
      AND o.deleted_at IS NULL
  `;

  if (params.ownerId) {
    queryParams.push(params.ownerId);
    query += ` AND o.id = $${queryParams.length}`;
  }

  if (params.storeId) {
    queryParams.push(params.storeId);
    query += ` AND o.store_id = $${queryParams.length}`;
  }

  const result = await pool.query<LinkOwnerRow>(query, queryParams);
  return result.rows;
}

function buildLinkCodeScopeQuery(params: {
  baseQuery: string;
  phone: string;
  lineUserId: string;
  ownerId?: number | null;
  storeId?: number | null;
  code?: string;
}): { query: string; values: Array<string | number> } {
  const values: Array<string | number> = [params.phone, params.lineUserId];
  let query = params.baseQuery;

  if (params.code) {
    values.push(params.code);
    query += ` AND code = $${values.length}`;
  }

  if (params.ownerId) {
    values.push(params.ownerId);
    query += ` AND owner_id = $${values.length}`;
  }

  if (params.storeId) {
    values.push(params.storeId);
    query += ` AND store_id = $${values.length}`;
  }

  return { query, values };
}

function allowInsecureDevLiffAuth(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_INSECURE_LIFF_DEV_AUTH === 'true';
}

async function resolveLineIdentity(
  body: Record<string, unknown>,
  res: express.Response,
): Promise<VerifiedLineIdentity | null> {
  const expectedLineUserId = typeof body.lineUserId === 'string' ? body.lineUserId : undefined;
  const idToken = typeof body.idToken === 'string' ? body.idToken : '';

  if (!idToken) {
    if (allowInsecureDevLiffAuth() && expectedLineUserId) {
      return {
        userId: expectedLineUserId,
        displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
        pictureUrl: typeof body.pictureUrl === 'string' ? body.pictureUrl : undefined,
      };
    }

    sendBadRequest(res, 'LINE ID token が必要です');
    return null;
  }

  try {
    return await verifyLineIdentity(idToken, expectedLineUserId);
  } catch (error) {
    if (error instanceof SecurityConfigurationError) {
      sendServerError(res, 'LINE認証設定に不備があります', error);
      return null;
    }

    sendUnauthorized(res, 'LINE認証の検証に失敗しました');
    return null;
  }
}

router.post('/auth', async function(req, res) {
  const startTime = Date.now();
  console.log('🔐 LIFF auth開始');

  try {
    const lineIdentity = await resolveLineIdentity(req.body as Record<string, unknown>, res);
    if (!lineIdentity) return;
    const lineUserId = lineIdentity.userId;

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
      // trial_line_linksでトライアル店舗の紐付けを確認
      const trialResult = await pool.query(
        `SELECT o.*, s.name as store_name, s.address as store_address
         FROM trial_line_links tll
         JOIN owners o ON o.id = tll.owner_id
         JOIN stores s ON s.id = tll.store_id AND s.is_trial = true
         WHERE tll.line_user_id = $1
         LIMIT 1`,
        [lineUserId]
      );

      if (trialResult.rows.length === 0) {
        // 飼い主が見つからない場合は新規登録が必要
        return res.status(404).json({
          error: 'LINEアカウントが登録されていません',
          requiresRegistration: true
        });
      }

      // トライアル店舗の飼い主として認証
      const trialOwner = trialResult.rows[0];
      const trialToken = signOwnerToken({
        ownerId: trialOwner.id,
        storeId: trialOwner.store_id,
        lineUserId,
      });

      console.log('🔐 LIFF trial auth完了:', Date.now() - startTime, 'ms');

      return res.json({
        token: trialToken,
        owner: {
          id: trialOwner.id,
          name: trialOwner.name,
          storeId: trialOwner.store_id,
          storeName: trialOwner.store_name,
          storeAddress: trialOwner.store_address || '',
          lineUserId: lineUserId,
        },
      });
    }

    const owner = ownerResult.rows[0];

    // LINE IDが一致する場合、JWTトークンを発行
    const token = signOwnerToken({
      ownerId: owner.id,
      storeId: owner.store_id,
      lineUserId,
    });

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

router.post('/link/request', async function(req, res) {
  try {
    const lineIdentity = await resolveLineIdentity(req.body as Record<string, unknown>, res);
    if (!lineIdentity) return;

    const { phone } = req.body;
    const lineUserId = lineIdentity.userId;
    const normalizedPhone = typeof phone === 'string' ? normalizePhone(phone) : '';
    const ownerScope = parseScopedId(req.body.ownerId, 'ownerId');
    const storeScope = parseScopedId(req.body.storeId, 'storeId');

    if (ownerScope.error || storeScope.error) {
      sendBadRequest(res, ownerScope.error || storeScope.error || '紐付け情報が不正です');
      return;
    }

    if (!normalizedPhone || !lineUserId) {
      sendBadRequest(res, '電話番号とLINEユーザーIDが必要です');
      return;
    }

    const owners = await findOwnersForLink({
      phone: normalizedPhone,
      ownerId: ownerScope.value,
      storeId: storeScope.value,
    });

    if (owners.length === 0) {
      return res.status(404).json({
        error: 'この電話番号で登録されているアカウントが見つかりません',
      });
    }

    if (owners.length > 1) {
      return res.status(409).json({
        error: 'この電話番号は複数の店舗で登録されています。店舗にお問い合わせください。',
      });
    }

    const owner = owners[0];

    // 既にLINE IDが紐付いている場合
    if (owner.line_id && owner.line_id === lineUserId) {
      return res.status(400).json({
        error: 'このLINEアカウントは既に紐付けられています',
      });
    }

    // 既に別のLINE IDが紐付いている場合
    if (owner.line_id && owner.line_id !== lineUserId) {
      return res.status(400).json({
        error: '既に別のLINEアカウントが紐付けられています。店舗にお問い合わせください。',
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
      `DELETE FROM line_link_codes WHERE line_user_id = $1 AND owner_id = $2 AND store_id = $3`,
      [lineUserId, owner.id, owner.store_id]
    );

    // 確認コードを保存
    await pool.query(
      `INSERT INTO line_link_codes (phone, code, line_user_id, owner_id, store_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [normalizedPhone, code, lineUserId, owner.id, owner.store_id, expiresAt]
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
  } catch (error: unknown) {
    sendServerError(res, '紐付けリクエストの処理に失敗しました', error);
  }
});

// LINE ID紐付け確認（確認コード検証）
router.post('/link/verify', async function(req, res) {
  try {
    const lineIdentity = await resolveLineIdentity(req.body as Record<string, unknown>, res);
    if (!lineIdentity) return;

    const { phone, code } = req.body;
    const lineUserId = lineIdentity.userId;
    const normalizedPhone = typeof phone === 'string' ? normalizePhone(phone) : '';
    const ownerScope = parseScopedId(req.body.ownerId, 'ownerId');
    const storeScope = parseScopedId(req.body.storeId, 'storeId');

    if (ownerScope.error || storeScope.error) {
      sendBadRequest(res, ownerScope.error || storeScope.error || '紐付け情報が不正です');
      return;
    }

    if (!normalizedPhone || !code || !lineUserId) {
      sendBadRequest(res, '電話番号、確認コード、LINEユーザーIDが必要です');
      return;
    }

    // 確認コードを検証
    const verifyScope = buildLinkCodeScopeQuery({
      baseQuery: `SELECT * FROM line_link_codes
       WHERE phone = $1 AND line_user_id = $2 AND expires_at > CURRENT_TIMESTAMP`,
      phone: normalizedPhone,
      lineUserId,
      code,
      ownerId: ownerScope.value,
      storeId: storeScope.value,
    });
    const codeResult = await pool.query(
      `${verifyScope.query}
       ORDER BY created_at DESC
       LIMIT 1`,
      verifyScope.values
    );

    if (codeResult.rows.length === 0) {
      // 試行回数をカウント
      const attemptScope = buildLinkCodeScopeQuery({
        baseQuery: `UPDATE line_link_codes
         SET attempts = attempts + 1
         WHERE phone = $1 AND line_user_id = $2 AND expires_at > CURRENT_TIMESTAMP`,
        phone: normalizedPhone,
        lineUserId,
        ownerId: ownerScope.value,
        storeId: storeScope.value,
      });
      await pool.query(
        attemptScope.query,
        attemptScope.values
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

    const owners = await findOwnersForLink({
      phone: normalizedPhone,
      ownerId: codeRecord.owner_id ?? ownerScope.value,
      storeId: codeRecord.store_id ?? storeScope.value,
    });

    if (owners.length === 0) {
      sendNotFound(res, '飼い主が見つかりません');
      return;
    }

    if (owners.length > 1) {
      return res.status(409).json({
        error: 'この電話番号は複数の店舗で登録されています。店舗にお問い合わせください。',
      });
    }

    const owner = owners[0];

    if (owner.line_id && owner.line_id !== lineUserId) {
      return res.status(400).json({
        error: '既に別のLINEアカウントが紐付いています。店舗にお問い合わせください。',
      });
    }

    // LINE User IDを更新
    await pool.query(
      `UPDATE owners SET line_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [lineUserId, owner.id]
    );

    // 使用済み確認コードを削除
    await pool.query(
      `DELETE FROM line_link_codes WHERE id = $1`,
      [codeRecord.id]
    );

    // JWTトークンを発行
    const token = signOwnerToken({
      ownerId: owner.id,
      storeId: owner.store_id,
      lineUserId,
    });

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
  } catch (error: unknown) {
    sendServerError(res, '紐付け確認の処理に失敗しました', error);
  }
});

export default router;
