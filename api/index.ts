// Vercel Serverless Function entry point
// ExpressアプリをVercelの形式に適合
import type { VercelRequest, VercelResponse } from '@vercel/node';

// 動的インポートを使用（ビルド時に解決）
let app: any = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 初回のみインポート（コールドスタート対策）
  if (!app) {
    try {
      const module = await import('../server/dist/index.js');
      app = module.default;
    } catch (error) {
      console.error('Failed to import server:', error);
      return res.status(500).json({ error: 'Server initialization failed' });
    }
  }

  // ExpressアプリをVercelの形式で実行
  // VercelのRequest/ResponseをExpressの形式に変換
  return new Promise((resolve) => {
    app(req as any, res as any, () => {
      resolve(undefined);
    });
  });
}
