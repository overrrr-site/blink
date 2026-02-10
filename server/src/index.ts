import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import compression from 'compression';
import * as Sentry from '@sentry/node';
import { initializeDatabase } from './db/init.js';
import { initializeServices } from './services/initServices.js';
import { requestLogger } from './middleware/requestLogger.js';

// Routes - Authentication
import authRoutes from './routes/auth.js';

// Routes - Core CRUD
import ownersRoutes from './routes/owners.js';
import dogsRoutes from './routes/dogs.js';
import reservationsRoutes from './routes/reservations.js';
import journalsRoutes from './routes/journals.js';
import recordsRoutes from './routes/records.js';
import preVisitInputsRoutes from './routes/preVisitInputs.js';
import contractsRoutes from './routes/contracts.js';
import inspectionRecordsRoutes from './routes/inspectionRecords.js';

// Routes - Dashboard & AI
import dashboardRoutes from './routes/dashboard.js';
import aiRoutes from './routes/ai.js';

// Routes - Store & Staff management
import storesRoutes from './routes/stores.js';
import storeSettingsRoutes from './routes/storeSettings.js';
import staffRoutes from './routes/staff.js';
import courseMastersRoutes from './routes/courseMasters.js';
import trainingMastersRoutes from './routes/trainingMasters.js';
import groomingMenusRoutes from './routes/groomingMenus.js';
import hotelPricesRoutes from './routes/hotelPrices.js';
import hotelRoomsRoutes from './routes/hotelRooms.js';

// Routes - LIFF (LINE Front-end Framework)
import liffRoutes from './routes/liff/index.js';
import lineWebhookRoutes from './routes/lineWebhook.js';
import billingWebhookRoutes from './routes/billingWebhook.js';

// Routes - Integrations & utilities
import googleCalendarRoutes from './routes/googleCalendar.js';
import uploadsRoutes from './routes/uploads.js';
import notificationsRoutes from './routes/notifications.js';
import billingRoutes from './routes/billing.js';
import announcementsRoutes from './routes/announcements.js';
import exportsRoutes from './routes/exports.js';

// Routes - Cron (Vercel Cron Jobs)
import cronRoutes from './routes/cron.js';

dotenv.config();

const isVercel = Boolean(process.env.VERCEL);
const sentryDsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,
  enabled: isVercel && Boolean(sentryDsn),
  environment: isVercel ? 'production' : 'development',
  tracesSampleRate: 0.1,
});

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware (order matters)
// ---------------------------------------------------------------------------

app.use(cors());
app.use(requestLogger);

// LINE Webhook は express.text() で raw body を受け取るため、
// express.json() より先に登録する必要がある。
app.use('/api/line/webhook', lineWebhookRoutes);

// PAY.JP Webhook も raw body を受け取るため express.json() より先に登録
app.use('/api/billing/webhook', express.text({ type: '*/*' }));
app.use('/api/billing/webhook', billingWebhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// 静的ファイル配信（ローカル開発時のみ。Vercel環境では外部ストレージを使用）
if (!process.env.VERCEL) {
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
}

// ---------------------------------------------------------------------------
// Database & service initialization
// ---------------------------------------------------------------------------

initializeDatabase().catch(console.error);
initializeServices().catch(console.error);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// API Routes - Authentication
// ---------------------------------------------------------------------------

app.use('/api/auth', authRoutes);

// ---------------------------------------------------------------------------
// API Routes - Core CRUD
// ---------------------------------------------------------------------------

app.use('/api/owners', ownersRoutes);
app.use('/api/dogs', dogsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/journals', journalsRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/pre-visit-inputs', preVisitInputsRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/inspection-records', inspectionRecordsRoutes);

// ---------------------------------------------------------------------------
// API Routes - Dashboard & AI
// ---------------------------------------------------------------------------

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);

// ---------------------------------------------------------------------------
// API Routes - Store & Staff management
// ---------------------------------------------------------------------------

app.use('/api/stores', storesRoutes);
app.use('/api/store-settings', storeSettingsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/course-masters', courseMastersRoutes);
app.use('/api/training-masters', trainingMastersRoutes);
app.use('/api/grooming-menus', groomingMenusRoutes);
app.use('/api/hotel-prices', hotelPricesRoutes);
app.use('/api/hotel-rooms', hotelRoomsRoutes);

// ---------------------------------------------------------------------------
// API Routes - LIFF (LINE Front-end Framework)
// ---------------------------------------------------------------------------

app.use('/api/liff', liffRoutes);

// ---------------------------------------------------------------------------
// API Routes - Integrations & utilities
// ---------------------------------------------------------------------------

app.use('/api/google-calendar', googleCalendarRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/exports', exportsRoutes);

// ---------------------------------------------------------------------------
// API Routes - Cron (独自認証のためauthenticateミドルウェア不要)
// ---------------------------------------------------------------------------

app.use('/api/cron', cronRoutes);

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
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
  },
);

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
