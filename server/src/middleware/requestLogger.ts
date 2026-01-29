import { Request, Response, NextFunction } from 'express';

const SLOW_REQUEST_THRESHOLD = 500; // ミリ秒

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > SLOW_REQUEST_THRESHOLD) {
      console.warn(
        `[SLOW] ${req.method} ${req.originalUrl} - ${duration}ms (status: ${res.statusCode})`
      );
    }
  });

  next();
}
