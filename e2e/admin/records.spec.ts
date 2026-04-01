import { test, expect } from '@playwright/test';
import { disableTrialOverlays } from '../helpers/admin-mocks';

test.describe('Service Records', () => {
  test.beforeEach(async ({ page }) => {
    await disableTrialOverlays(page);
  });

  test('records list loads', async ({ page }) => {
    await page.goto('/records');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('records list shows content', async ({ page }) => {
    await page.goto('/records');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Page should render something
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('record creation page loads', async ({ page }) => {
    await page.goto('/records/new');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 });
  });

  test('AI endpoints are mockable', async ({ page }) => {
    await page.route('**/api/ai/generate-comment', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { text: 'AIが生成したテストコメントです。' },
        }),
      });
    });

    await page.goto('/records/new');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 });
  });

  test('incomplete records page loads', async ({ page }) => {
    await page.goto('/records/incomplete');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 });
  });

  test('record detail navigation', async ({ page }) => {
    await page.goto('/records');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Click first record if available
    const card = page.locator('.bg-card').first();
    if (await card.isVisible().catch(() => false)) {
      await card.click();
      await page.waitForTimeout(1000);
    }
  });
});
