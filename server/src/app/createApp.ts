import express from 'express';
import { initializeDatabase } from '../db/init.js';
import { initializeServices } from '../services/initServices.js';
import { configureMiddleware } from './configureMiddleware.js';
import { errorHandler } from './errorHandler.js';
import { registerRoutes } from './registerRoutes.js';

export function createApp() {
  const app = express();

  configureMiddleware(app);

  initializeDatabase().catch(console.error);
  initializeServices().catch(console.error);

  registerRoutes(app);
  app.use(errorHandler);

  return app;
}
