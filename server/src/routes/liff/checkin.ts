import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../../db/connection.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';
import { sendBadRequest, sendForbidden, sendNotFound, sendServerError } from '../../utils/response.js';
import { requireOwnerToken } from './common.js';

const router = express.Router();

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

export default router;
