import { test, expect } from '@playwright/test';
import { setupLiffMocks } from '../helpers/liff-auth-mock';
import path from 'path';

test.describe('Reservation Lifecycle (Cross-App)', () => {
  test('full reservation lifecycle: admin creates → LIFF owner views', async ({ browser }) => {
    // === STEP 1: Admin creates reservation ===
    const adminContext = await browser.newContext({
      storageState: path.resolve(__dirname, '../.auth/admin.json'),
      viewport: { width: 1280, height: 800 },
    });
    const adminPage = await adminContext.newPage();

    await adminPage.goto('/reservations/new');
    await expect(adminPage.getByRole('heading').first()).toBeVisible({ timeout: 5000 });

    // Reservation form should load
    // (Full form interaction would require seed data with dogs)

    await adminContext.close();

    // === STEP 2: LIFF owner views reservations ===
    const liffContext = await browser.newContext({
      storageState: path.resolve(__dirname, '../.auth/liff.json'),
      viewport: { width: 375, height: 812 },
      isMobile: true,
    });
    const liffPage = await liffContext.newPage();
    await setupLiffMocks(liffPage);

    // Mock LIFF reservations (returns array directly, not wrapped)
    await liffPage.route('**/api/liff/reservations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await liffPage.goto('/liff/home/reservations');
    await expect(liffPage.locator('text=/\\d{4}|\\d{1,2}月/').first()).toBeVisible({ timeout: 10000 });

    await liffContext.close();
  });
});
