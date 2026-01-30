import express from 'express';
import authRoutes from './auth.js';
import ownerRoutes from './owner.js';
import reservationsRoutes from './reservations.js';
import preVisitInputsRoutes from './preVisitInputs.js';
import journalsRoutes from './journals.js';
import checkinRoutes from './checkin.js';
import announcementsRoutes from './announcements.js';

const router = express.Router();

router.use(authRoutes);
router.use(ownerRoutes);
router.use(reservationsRoutes);
router.use(preVisitInputsRoutes);
router.use(journalsRoutes);
router.use(checkinRoutes);
router.use(announcementsRoutes);

export default router;
