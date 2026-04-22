import express from 'express';
import authRoutes from './auth.js';
import ownerRoutes from './owner.js';
import reservationsRoutes from './reservations.js';
import preVisitInputsRoutes from './preVisitInputs.js';
import recordsRoutes from './records.js';
import checkinRoutes from './checkin.js';
import announcementsRoutes from './announcements.js';
import dashboardRoutes from './dashboard.js';
import intakeRoutes from './intake.js';

const router = express.Router();

// LIFF API は no-store を強制し ETag も削除する。
// Vercel Edge が自動で ETag を付与するため、ブラウザが If-None-Match を送って
// 304 Not Modified が返り、axios が throw → SWR エラーになる問題を防ぐ。
router.use((_req, res, next) => {
  res.removeHeader('ETag');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

router.use(authRoutes);
router.use(ownerRoutes);
router.use(reservationsRoutes);
router.use(preVisitInputsRoutes);
router.use(recordsRoutes);
router.use(checkinRoutes);
router.use(announcementsRoutes);
router.use(dashboardRoutes);
router.use(intakeRoutes);

export default router;
