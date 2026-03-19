import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../../db/connection.js';
import { sendEmail } from '../../services/emailService.js';
import { sendBadRequest, sendNotFound, sendServerError } from '../../utils/response.js';
import { generateVerificationCode, maskEmail } from './common.js';

const router = express.Router();

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
      const trialToken = jwt.sign(
        {
          ownerId: trialOwner.id,
          storeId: trialOwner.store_id,
          lineUserId: lineUserId,
          type: 'owner',
        },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '30d' }
      );

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

router.post('/link/request', async function(req, res) {
  try {
    const { phone, lineUserId } = req.body;

    if (!phone || !lineUserId) {
      sendBadRequest(res, '電話番号とLINEユーザーIDが必要です');
      return;
    }

    // 電話番号で飼い主を検索
    const ownerResult = await pool.query(
      `SELECT o.*, s.name as store_name FROM owners o
       JOIN stores s ON o.store_id = s.id
       WHERE o.phone = $1`,
      [phone]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({
        error: 'この電話番号で登録されているアカウントが見つかりません',
      });
    }

    // 同じ電話番号の顧客が複数店舗に存在する場合
    if (ownerResult.rows.length > 1) {
      return res.status(409).json({
        error: 'この電話番号は複数の店舗で登録されています。店舗にお問い合わせください。',
      });
    }

    const owner = ownerResult.rows[0];

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
      `SELECT o.* FROM owners o WHERE o.phone = $1`,
      [phone]
    );

    if (ownerResult.rows.length === 0) {
      sendNotFound(res, '飼い主が見つかりません');
      return;
    }

    if (ownerResult.rows.length > 1) {
      return res.status(409).json({
        error: 'この電話番号は複数の店舗で登録されています。店舗にお問い合わせください。',
      });
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
    sendServerError(res, '紐付け確認の処理に失敗しました', error);
  }
});

export default router;
