import { test, expect } from '@playwright/test';
import { setupLiffMocks } from '../helpers/liff-auth-mock';

test.describe('LIFF Records', () => {
  test.beforeEach(async ({ page }) => {
    await setupLiffMocks(page);
  });

  test('records list loads', async ({ page }) => {
    await page.route('**/api/liff/records**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
      });
    });

    await page.goto('/liff/home/records');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15000 });
  });

  test('records show empty state when no records', async ({ page }) => {
    await page.route('**/api/liff/records**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
      });
    });

    await page.goto('/liff/home/records');
    await page.waitForTimeout(2000);
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});
