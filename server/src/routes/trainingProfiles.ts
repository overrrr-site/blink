import express from 'express';
import { authenticate } from '../middleware/auth.js';
import categoriesRouter from './trainingProfiles/categories.js';
import achievementLevelsRouter from './trainingProfiles/achievementLevels.js';
import dogsRouter from './trainingProfiles/dogs.js';

const router = express.Router();
router.use(authenticate);
router.use('/categories', categoriesRouter);
router.use('/achievement-levels', achievementLevelsRouter);
router.use('/dogs/:dogId', dogsRouter);

export default router;
