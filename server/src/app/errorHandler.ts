import type { NextFunction, Request, Response } from 'express';
import * as Sentry from '@sentry/node';

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
      staffData?: { email?: string };
    };
    if (authReq.userId) {
      scope.setUser({
        id: authReq.userId.toString(),
        email: authReq.staffData?.email,
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

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'サーバーエラーが発生しました' });
}
