import { test, expect } from '@playwright/test';
import { setupLiffMocks } from '../helpers/liff-auth-mock';

test.describe('LIFF MyPage', () => {
  test.beforeEach(async ({ page }) => {
    await setupLiffMocks(page);
  });

  test('mypage shows profile info', async ({ page }) => {
    await page.route('**/api/liff/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'テスト飼い主太郎',
          phone: '09000000001',
          email: 'e2e-owner@test.blink.pet',
          store_id: 1,
          store_name: 'E2Eテスト店舗',
          line_id: 'test_line_user_001',
          primary_business_type: 'daycare',
          available_business_types: ['daycare'],
          created_at: '2024-01-01T00:00:00Z',
          dogs: [
            { id: 1, name: 'テスト犬ポチ', breed: 'トイプードル', gender: 'male' },
            { id: 2, name: 'テスト犬モモ', breed: '柴犬', gender: 'female' },
          ],
          contracts: [],
        }),
      });
    });

    await page.goto('/liff/home/mypage');
    await expect(page.getByRole('heading', { name: 'テスト飼い主太郎' })).toBeVisible({ timeout: 15000 });
  });

  test('mypage shows registered dogs', async ({ page }) => {
    await page.route('**/api/liff/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'テスト飼い主太郎',
          phone: '09000000001',
          store_id: 1,
          store_name: 'E2Eテスト店舗',
          line_id: 'test_line_user_001',
          primary_business_type: 'daycare',
          available_business_types: ['daycare'],
          created_at: '2024-01-01T00:00:00Z',
          dogs: [
            { id: 1, name: 'テスト犬ポチ', breed: 'トイプードル', gender: 'male' },
          ],
          contracts: [],
        }),
      });
    });

    await page.goto('/liff/home/mypage');
    await expect(page.getByText('テスト犬ポチ')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('トイプードル')).toBeVisible({ timeout: 5000 });
  });
});
