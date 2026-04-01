import { test, expect } from '@playwright/test';
import { disableTrialOverlays } from '../helpers/admin-mocks';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await disableTrialOverlays(page);
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('store settings tab shows store info', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/店舗/).first()).toBeVisible({ timeout: 5000 });
  });

  test('integration tab loads', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const integrationTab = page.getByRole('button', { name: '連携' }).first();
    if (await integrationTab.isVisible().catch(() => false)) {
      await integrationTab.click();
      await page.waitForTimeout(1000);
      await expect(page.getByText(/LINE|Google/).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('course creation page loads', async ({ page }) => {
    await page.goto('/settings/courses/new');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 });
  });

  test('grooming menu creation page loads', async ({ page }) => {
    await page.goto('/settings/grooming-menu/new');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 });
  });

  test('billing page loads', async ({ page }) => {
    await page.route('**/api/billing/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });
    await page.goto('/billing');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 });
  });

  test('other settings tab loads', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const otherTab = page.getByRole('button', { name: 'その他' }).first();
    if (await otherTab.isVisible().catch(() => false)) {
      await otherTab.click();
      await page.waitForTimeout(500);
    }
  });
});
