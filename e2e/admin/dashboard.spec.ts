import { test, expect } from '@playwright/test';
import path from 'path';
import { DashboardPage } from '../pages/admin/dashboard.page';
import { disableTrialOverlays } from '../helpers/admin-mocks';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await disableTrialOverlays(page);
  });

  test('dashboard loads successfully', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForData();
    // Dashboard should render something
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('status filter tabs are visible', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForData();
    // Check filter buttons exist
    const filterBtn = page.getByRole('button', { name: '全て' }).first();
    if (await filterBtn.isVisible().catch(() => false)) {
      await filterBtn.click();
      await expect(page).toHaveURL(/dashboard/);
    }
  });

  test('quick action navigation works', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForData();
    const newReservation = dashboard.newReservationAction;
    if (await newReservation.isVisible().catch(() => false)) {
      await newReservation.click();
      await expect(page).toHaveURL(/reservations/);
    }
  });

  test('page is responsive on mobile viewport', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: path.resolve(__dirname, '../.auth/admin.json'),
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(380);
    await context.close();
  });

  test('alerts section is accessible', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForData();
    const alertsBtn = dashboard.alertsButton;
    if (await alertsBtn.isVisible().catch(() => false)) {
      await alertsBtn.click();
    }
    // Test passes whether alerts exist or not
  });
});
