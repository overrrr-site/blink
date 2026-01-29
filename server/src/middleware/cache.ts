import { Request, Response, NextFunction } from 'express';

// 秒数を指定してキャッシュヘッダーを付与するミドルウェア
export function cacheControl(maxAge: number = 0, staleWhileRevalidate: number = 0) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') {
      if (maxAge > 0) {
        const swr = staleWhileRevalidate > 0 ? `, stale-while-revalidate=${staleWhileRevalidate}` : '';
        res.setHeader('Cache-Control', `private, max-age=${maxAge}${swr}`);
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
    next();
  };
}
