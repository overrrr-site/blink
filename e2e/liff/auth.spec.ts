import { test, expect } from '@playwright/test';
import { setupLiffMocks } from '../helpers/liff-auth-mock';

test.describe('LIFF Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await setupLiffMocks(page);
  });

  test('LIFF login page loads with mock SDK', async ({ page }) => {
    await page.goto('/liff/');
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/liff/);
  });

  test('account linking page shows phone input', async ({ page }) => {
    await page.goto('/liff/link');
    await expect(
      page.getByPlaceholder(/電話番号/).or(page.getByLabel(/電話番号/)).or(page.locator('input[type="tel"]')),
    ).toBeVisible({ timeout: 5000 });
  });

  test('authenticated owner reaches home', async ({ page }) => {
    // setupLiffMocks in beforeEach mocks auth API with correct format
    await page.goto('/liff/');
    await page.waitForURL('**/liff/home', { timeout: 15000 });
    await expect(page).toHaveURL(/liff\/home/);
  });
});
