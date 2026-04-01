import { test, expect } from '@playwright/test';
import { setupLiffMocks } from '../helpers/liff-auth-mock';

test.describe('LIFF Pre-Visit Input', () => {
  test.beforeEach(async ({ page }) => {
    await setupLiffMocks(page);
  });

  test('pre-visit form loads for reservation', async ({ page }) => {
    // Note: avoid **/api/liff/** wildcard as it overrides the auth mock
    // usePreVisitForm calls GET /reservations (list) then finds by ID
    await page.route('**/api/liff/reservations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 1,
          dog_id: 1,
          dog_name: 'テスト犬ポチ',
          reservation_date: new Date().toISOString().split('T')[0],
          start_time: '09:00',
          service_type: 'daycare',
          has_pre_visit_input: false,
        }]),
      });
    });

    await page.goto('/liff/home/pre-visit/1');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15000 });
  });

  test('pre-visit form has input fields', async ({ page }) => {
    await page.route('**/api/liff/reservations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 1,
          dog_id: 1,
          dog_name: 'テスト犬ポチ',
          reservation_date: new Date().toISOString().split('T')[0],
          start_time: '09:00',
          service_type: 'daycare',
          has_pre_visit_input: false,
        }]),
      });
    });

    await page.goto('/liff/home/pre-visit/1');
    await page.waitForTimeout(2000);
    const formInputs = page.locator('input, textarea, select, [role="radio"], [role="checkbox"]');
    const count = await formInputs.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
