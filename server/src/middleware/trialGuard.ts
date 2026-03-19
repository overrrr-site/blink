import { Response, NextFunction } from 'express';
import pool from '../db/connection.js';
import { AuthRequest } from './auth.js';

/**
 * トライアルモード中の決済操作をブロックするミドルウェア
 */
export async function blockPaymentInTrial(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.storeId) {
      next();
      return;
    }

    const result = await pool.query(
      'SELECT is_trial FROM stores WHERE id = $1',
      [req.storeId]
    );

    if (result.rows[0]?.is_trial) {
      res.status(403).json({
        success: false,
        error: '決済機能は本契約後にご利用いただけます',
        trial_mode: true,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Trial guard error:', error);
    next();
  }
}
