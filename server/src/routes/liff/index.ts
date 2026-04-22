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

// LIFF API は 304 Not Modified を完全に発生させない。
//   ブラウザに既にキャッシュされた ETag がある状態で If-None-Match が送られると、
//   Express の fresh() が true を返し自動で 304 になってしまう（body 空）。
//   axios / SWR がこれをエラー扱いするため、予約・日誌表示が失敗する事象が出ていた。
//
// 対処：
//   1) 受信リクエストから If-None-Match / If-Modified-Since を削除（304判定を発動させない）
//   2) レスポンス側で ETag を削除し Cache-Control: no-store を強制（以降ブラウザはキャッシュしない）
router.use((req, res, next) => {
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];
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
