import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';

export function requireStoreId(req: AuthRequest, res: Response): boolean {
  if (!req.storeId) {
    res.status(400).json({ error: '店舗IDが設定されていません' });
    return false;
  }
  return true;
}

export function sendNotFound(res: Response, message: string): void {
  res.status(404).json({ error: message });
}

export function sendForbidden(res: Response, message = '権限がありません'): void {
  res.status(403).json({ error: message });
}

export function sendUnauthorized(res: Response, message = '認証が必要です'): void {
  res.status(401).json({ error: message });
}

export function sendBadRequest(res: Response, message: string): void {
  res.status(400).json({ error: message });
}

export function sendServerError(res: Response, message: string, error: unknown): void {
  console.error(`${message}:`, error);
  res.status(500).json({ error: message });
}

export function sendSuccess(res: Response): void {
  res.json({ success: true });
}
