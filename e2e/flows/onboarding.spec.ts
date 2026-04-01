import { test, expect } from '@playwright/test';

test.describe('New Store Onboarding', () => {
  test('login page accessible and functional', async ({ browser }) => {
    // Use fresh context (no storageState) to simulate new user
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.goto('/login');
    await expect(page.getByText('スタッフログイン')).toBeVisible();

    // Can switch to register mode
    await page.getByText('新しい店舗を登録する').click();
    await expect(page.getByText('新規店舗登録')).toBeVisible();

    // Register form fields are present
    await expect(page.getByPlaceholder('店舗名を入力')).toBeVisible();
    await expect(page.getByPlaceholder('管理者のお名前')).toBeVisible();
    await expect(page.getByPlaceholder('example@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('8文字以上で入力')).toBeVisible();

    await context.close();
  });
});
