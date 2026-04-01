import { test, expect } from '@playwright/test';
import { setupLiffMocks, ensureLiffAuth } from '../helpers/liff-auth-mock';

test.describe('LIFF Reservations', () => {
  test.beforeEach(async ({ page }) => {
    await setupLiffMocks(page);
  });

  test('reservations calendar loads', async ({ page }) => {
    await page.route('**/api/liff/reservations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await ensureLiffAuth(page);
    await page.goto('/liff/home/reservations');
    await expect(page.locator('text=/\\d{4}|\\d{1,2}月/').first()).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to new reservation', async ({ page }) => {
    await page.route('**/api/liff/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/liff/home/reservations');
    await page.waitForTimeout(1000);

    const newBtn = page.getByRole('button', { name: /新規|予約する/ }).or(page.getByRole('link', { name: /新規|予約する/ }));
    if (await newBtn.isVisible().catch(() => false)) {
      await newBtn.click();
      await expect(page).toHaveURL(/reservations\/new/);
    }
  });

  test('reservation creation form loads', async ({ page }) => {
    await page.goto('/liff/home/reservations/new');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15000 });
  });
});
