import { Request, Response, NextFunction } from 'express';

type ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => void;

export function cacheControl(maxAge: number = 0, staleWhileRevalidate: number = 0): ExpressMiddleware {
  return function (req: Request, res: Response, next: NextFunction): void {
    if (req.method === 'GET') {
      if (maxAge > 0 || staleWhileRevalidate > 0) {
        const directives = ['private', `max-age=${Math.max(0, maxAge)}`];
        if (staleWhileRevalidate > 0) {
          directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
        }
        res.setHeader('Cache-Control', directives.join(', '));
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
    next();
  };
}
