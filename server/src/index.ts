import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initializeDatabase } from './db/init.js';

// Routes
import authRoutes from './routes/auth.js';
import ownersRoutes from './routes/owners.js';
import dogsRoutes from './routes/dogs.js';
import reservationsRoutes from './routes/reservations.js';
import journalsRoutes from './routes/journals.js';
import preVisitInputsRoutes from './routes/preVisitInputs.js';
import dashboardRoutes from './routes/dashboard.js';
import aiRoutes from './routes/ai.js';
import googleCalendarRoutes from './routes/googleCalendar.js';
import contractsRoutes from './routes/contracts.js';
import storeSettingsRoutes from './routes/storeSettings.js';
import staffRoutes from './routes/staff.js';
import courseMastersRoutes from './routes/courseMasters.js';
import trainingMastersRoutes from './routes/trainingMasters.js';
import storesRoutes from './routes/stores.js';
import liffRoutes from './routes/liff.js';
import uploadsRoutes from './routes/uploads.js';
import notificationsRoutes from './routes/notifications.js';
import billingRoutes from './routes/billing.js';
import inspectionRecordsRoutes from './routes/inspectionRecords.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());

// LINE Webhook: Vercel環境では処理完了後にレスポンスを返す
// express.text()でraw bodyを取得し、署名検証に使用
app.post('/api/line/webhook', express.text({ type: '*/*' }), async (req, res) => {
  try {
    const signature = req.headers['x-line-signature'] as string;
    if (!signature) {
      console.log('LINE Webhook: 署名なし（検証リクエスト）');
      res.status(200).send('OK');
      return;
    }

    // bodyを文字列化（express.text()で取得した場合は文字列）
    let bodyString: string;
    let parsedBody: any;

    if (typeof req.body === 'string') {
      bodyString = req.body;
      try { parsedBody = JSON.parse(req.body); } catch { parsedBody = { events: [] }; }
    } else if (Buffer.isBuffer(req.body)) {
      bodyString = req.body.toString('utf-8');
      try { parsedBody = JSON.parse(bodyString); } catch { parsedBody = { events: [] }; }
    } else if (typeof req.body === 'object' && req.body !== null) {
      bodyString = JSON.stringify(req.body);
      parsedBody = req.body;
    } else {
      console.log('LINE Webhook: body取得失敗 - type:', typeof req.body);
      res.status(200).send('OK');
      return;
    }

    console.log('LINE Webhook: イベント受信, body長:', bodyString.length);

    const events = parsedBody.events || [];
    if (events.length === 0) {
      console.log('LINE Webhook: イベントなし（検証成功）');
      res.status(200).send('OK');
      return;
    }

    console.log('LINE Webhook: イベント数:', events.length, 'タイプ:', events.map((e: any) => e.type).join(','));

    // イベント処理を実行（完了を待つ）
    const { processLineWebhookEvents } = await import('./services/lineBotService.js');
    await processLineWebhookEvents(events, bodyString, signature);

    console.log('LINE Webhook: 処理完了');
    res.status(200).send('OK');

  } catch (error) {
    console.error('LINE Webhook error:', error);
    // エラーでも200を返す（LINEがリトライしないように）
    res.status(200).send('OK');
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静的ファイル配信（アップロードされたファイル）
// Vercel環境では、静的ファイルは別途設定が必要（Supabase Storage推奨）
if (process.env.VERCEL) {
  // Vercel環境では静的ファイル配信をスキップ（外部ストレージを使用）
  console.log('⚠️  Vercel環境: 静的ファイル配信は外部ストレージ（Supabase Storage等）を使用してください');
} else {
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
}

// Initialize database
initializeDatabase().catch(console.error);

// Initialize services
(async () => {
  // Email service
  const { initializeEmailClient } = await import('./services/emailService.js');
  initializeEmailClient();
  console.log('✅ LINE Messaging APIはマルチテナント対応（店舗ごとの認証情報を使用）');
  
  // Supabase Storage
  const { initializeStorageBucket } = await import('./services/storageService.js');
  await initializeStorageBucket();
})();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/owners', ownersRoutes);
app.use('/api/dogs', dogsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/journals', journalsRoutes);
app.use('/api/pre-visit-inputs', preVisitInputsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/google-calendar', googleCalendarRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/store-settings', storeSettingsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/course-masters', courseMastersRoutes);
app.use('/api/training-masters', trainingMastersRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/liff', liffRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/inspection-records', inspectionRecordsRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'サーバーエラーが発生しました' });
});

// Vercel Serverless Functions用のエクスポート
// Vercel環境ではappをエクスポート、ローカル開発時はサーバーを起動
export default app;

// ローカル開発時のみサーバーを起動
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 サーバーが起動しました: http://localhost:${PORT}`);
  });
}
