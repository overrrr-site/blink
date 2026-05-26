import type { VercelRequest, VercelResponse } from '@vercel/node';

type ExpressApp = (req: unknown, res: VercelResponse, next: (error?: unknown) => void) => void;

let app: ExpressApp | null = null;

async function loadApp(): Promise<ExpressApp> {
  if (app) return app;

  const module = await import('../server/dist/index.js');
  app = module.default;
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const expressApp = await loadApp();
    await new Promise<void>((resolve, reject) => {
      expressApp(req, res, (error?: unknown) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    if (!res.writableEnded && !res.headersSent) {
      res.status(404).json({ error: 'Not Found' });
    }
  } catch (error) {
    console.error('Failed to initialize server:', error);
    res.status(500).json({ error: 'Server initialization failed' });
  }
}
