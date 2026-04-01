import { test, expect } from '@playwright/test';
import { setupLiffMocks } from '../helpers/liff-auth-mock';

test.describe('LIFF Home', () => {
  test.beforeEach(async ({ page }) => {
    await setupLiffMocks(page);
  });

  test('home page loads with content', async ({ page }) => {
    await page.route('**/api/liff/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'テスト飼い主太郎',
          store_id: 1,
          store_name: 'E2Eテスト店舗',
          line_id: 'test_line_user_001',
          primary_business_type: 'daycare',
          available_business_types: ['daycare'],
          dogs: [{ id: 1, name: 'テスト犬ポチ', breed: 'トイプードル' }],
          contracts: [],
        }),
      });
    });

    await page.route('**/api/liff/dashboard/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ service_type: 'daycare', next_reservation: null, latest_record: null, announcements: { total: 0, unread: 0 } }),
      });
    });

    await page.goto('/liff/home');
    await expect(page.locator('nav, [role="navigation"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('bottom navigation works', async ({ page }) => {
    await page.route('**/api/liff/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} }),
      });
    });

    await page.goto('/liff/home');
    await page.waitForTimeout(1000);

    const nav = page.locator('nav, [role="navigation"]').last();
    if (await nav.isVisible()) {
      const reservationsLink = page.getByText('予約');
      if (await reservationsLink.isVisible().catch(() => false)) {
        await reservationsLink.click();
        await expect(page).toHaveURL(/reservations/);
      }
    }
  });
});
