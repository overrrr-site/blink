import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import { createApp } from './app/createApp.js';

dotenv.config();

const isVercel = Boolean(process.env.VERCEL);
const sentryDsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,
  enabled: isVercel && Boolean(sentryDsn),
  environment: isVercel ? 'production' : 'development',
  tracesSampleRate: 0.1,
});

const app = createApp();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Export & server startup
// ---------------------------------------------------------------------------

// Vercel Serverless Functions 用のエクスポート
export default app;

// ローカル開発時のみサーバーを起動
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server started: http://localhost:${PORT}`);
  });
}
