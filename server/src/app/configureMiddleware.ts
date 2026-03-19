import type { Express } from 'express';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import path from 'path';
import { requestLogger } from '../middleware/requestLogger.js';
import lineWebhookRoutes from '../routes/lineWebhook.js';
import lineWebhookTrialRoutes from '../routes/lineWebhookTrial.js';
import billingWebhookRoutes from '../routes/billingWebhook.js';

export function configureMiddleware(app: Express): void {
  app.use(cors());
  app.use(requestLogger);

  // LINE Webhook は express.text() で raw body を受け取るため、
  // express.json() より先に登録する必要がある。
  app.use('/api/line/webhook', lineWebhookRoutes);
  app.use('/api/line/webhook/trial', lineWebhookTrialRoutes);

  // PAY.JP Webhook も raw body を受け取るため express.json() より先に登録
  app.use('/api/billing/webhook', express.text({ type: '*/*' }));
  app.use('/api/billing/webhook', billingWebhookRoutes);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(compression());

  if (!process.env.VERCEL) {
    app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
  }
}
