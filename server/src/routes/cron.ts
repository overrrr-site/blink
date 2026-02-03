import express from 'express';
import { sendReservationReminders, sendVaccineAlerts } from '../services/notificationService.js';

const router = express.Router();

/**
 * Cron認証ミドルウェア
 * Vercel CronはAuthorizationヘッダーに Bearer <CRON_SECRET> を付与する
 */
function verifyCronSecret(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET is not configured');
    res.status(500).json({ error: 'Cron not configured' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

router.use(verifyCronSecret);

/**
 * GET /api/cron/daily-notifications
 * 毎日18:00 JSTにVercel Cronから呼び出される
 * - 予約リマインド（前日通知）
 * - ワクチンアラート
 */
router.get('/daily-notifications', async (_req, res) => {
  const startTime = Date.now();

  try {
    const [reminders, vaccines] = await Promise.all([
      sendReservationReminders(),
      sendVaccineAlerts(),
    ]);

    const duration = Date.now() - startTime;

    res.json({
      ok: true,
      duration: `${duration}ms`,
      reminders,
      vaccines,
    });
  } catch (error) {
    console.error('Cron daily-notifications error:', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error',
    });
  }
});

export default router;
