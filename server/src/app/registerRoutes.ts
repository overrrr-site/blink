import type { Express, Router } from 'express';
import authRoutes from '../routes/auth.js';
import trialRoutes from '../routes/trial.js';
import ownersRoutes from '../routes/owners.js';
import dogsRoutes from '../routes/dogs.js';
import reservationsRoutes from '../routes/reservations/index.js';
import recordsRoutes from '../routes/records/index.js';
import preVisitInputsRoutes from '../routes/preVisitInputs.js';
import contractsRoutes from '../routes/contracts.js';
import inspectionRecordsRoutes from '../routes/inspectionRecords.js';
import dashboardRoutes from '../routes/dashboard.js';
import aiRoutes from '../routes/ai.js';
import storesRoutes from '../routes/stores.js';
import storeSettingsRoutes from '../routes/storeSettings.js';
import staffRoutes from '../routes/staff.js';
import onboardingRoutes from '../routes/onboarding.js';
import courseMastersRoutes from '../routes/courseMasters.js';
import trainingMastersRoutes from '../routes/trainingMasters.js';
import trainingProfilesRoutes from '../routes/trainingProfiles.js';
import groomingMenusRoutes from '../routes/groomingMenus.js';
import hotelPricesRoutes from '../routes/hotelPrices.js';
import hotelRoomsRoutes from '../routes/hotelRooms.js';
import liffRoutes from '../routes/liff/index.js';
import googleCalendarRoutes from '../routes/googleCalendar.js';
import uploadsRoutes from '../routes/uploads.js';
import notificationsRoutes from '../routes/notifications.js';
import billingRoutes from '../routes/billing.js';
import announcementsRoutes from '../routes/announcements.js';
import exportsRoutes from '../routes/exports.js';
import uxEventsRoutes from '../routes/uxEvents.js';
import cronRoutes from '../routes/cron.js';

interface RouteDefinition {
  path: string;
  router: Router;
}

function registerRouteGroup(app: Express, routes: RouteDefinition[]): void {
  routes.forEach(({ path, router }) => {
    app.use(path, router);
  });
}

function registerHealthRoute(app: Express): void {
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
}

function registerAuthRoutes(app: Express): void {
  registerRouteGroup(app, [
    { path: '/api/auth', router: authRoutes },
    { path: '/api/trial', router: trialRoutes },
  ]);
}

function registerCoreRoutes(app: Express): void {
  registerRouteGroup(app, [
    { path: '/api/owners', router: ownersRoutes },
    { path: '/api/dogs', router: dogsRoutes },
    { path: '/api/reservations', router: reservationsRoutes },
    { path: '/api/records', router: recordsRoutes },
    { path: '/api/pre-visit-inputs', router: preVisitInputsRoutes },
    { path: '/api/contracts', router: contractsRoutes },
    { path: '/api/inspection-records', router: inspectionRecordsRoutes },
  ]);
}

function registerDashboardRoutes(app: Express): void {
  registerRouteGroup(app, [
    { path: '/api/dashboard', router: dashboardRoutes },
    { path: '/api/ai', router: aiRoutes },
  ]);
}

function registerManagementRoutes(app: Express): void {
  registerRouteGroup(app, [
    { path: '/api/stores', router: storesRoutes },
    { path: '/api/store-settings', router: storeSettingsRoutes },
    { path: '/api/staff/me/onboarding', router: onboardingRoutes },
    { path: '/api/staff', router: staffRoutes },
    { path: '/api/course-masters', router: courseMastersRoutes },
    { path: '/api/training-masters', router: trainingMastersRoutes },
    { path: '/api/grooming-menus', router: groomingMenusRoutes },
    { path: '/api/hotel-prices', router: hotelPricesRoutes },
    { path: '/api/hotel-rooms', router: hotelRoomsRoutes },
    { path: '/api/training-profiles', router: trainingProfilesRoutes },
  ]);
}

function registerLiffRoutes(app: Express): void {
  registerRouteGroup(app, [
    { path: '/api/liff', router: liffRoutes },
  ]);
}

function registerIntegrationRoutes(app: Express): void {
  registerRouteGroup(app, [
    { path: '/api/google-calendar', router: googleCalendarRoutes },
    { path: '/api/uploads', router: uploadsRoutes },
    { path: '/api/notifications', router: notificationsRoutes },
    { path: '/api/billing', router: billingRoutes },
    { path: '/api/announcements', router: announcementsRoutes },
    { path: '/api/exports', router: exportsRoutes },
    { path: '/api/ux-events', router: uxEventsRoutes },
  ]);
}

function registerCronRoutes(app: Express): void {
  registerRouteGroup(app, [
    { path: '/api/cron', router: cronRoutes },
  ]);
}

export function registerRoutes(app: Express): void {
  registerHealthRoute(app);
  registerAuthRoutes(app);
  registerCoreRoutes(app);
  registerDashboardRoutes(app);
  registerManagementRoutes(app);
  registerLiffRoutes(app);
  registerIntegrationRoutes(app);
  registerCronRoutes(app);
}
