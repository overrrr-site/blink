import express from 'express';
import jwt from 'jsonwebtoken';
import { sendForbidden, sendUnauthorized } from '../../utils/response.js';

export interface OwnerToken {
  ownerId: number;
  storeId: number;
  type: string;
  lineUserId?: string;
}

export function requireOwnerToken(req: express.Request, res: express.Response): OwnerToken | null {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    sendUnauthorized(res, '認証トークンが提供されていません');
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as OwnerToken;
    if (decoded.type !== 'owner') {
      sendForbidden(res, '飼い主専用のエンドポイントです');
      return null;
    }
    return decoded;
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      sendUnauthorized(res, '無効な認証トークンです');
      return null;
    }
    throw error;
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}
