import type { NextFunction, Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { formatErrorForLog } from '../utils/errorLogging.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  Sentry.withScope((scope) => {
    const authReq = req as {
      userId?: number;
      storeId?: number;
      isOwner?: boolean;
    };
    if (authReq.userId) {
      scope.setUser({
        id: authReq.userId.toString(),
      });
    }
    if (authReq.storeId) {
      scope.setTag('store_id', authReq.storeId.toString());
    }
    if (typeof authReq.isOwner !== 'undefined') {
      scope.setTag('is_owner', authReq.isOwner ? 'true' : 'false');
    }
    Sentry.captureException(err);
  });

  console.error('Unhandled error:', formatErrorForLog(err));
  res.status(500).json({ error: 'サーバーエラーが発生しました' });
}
