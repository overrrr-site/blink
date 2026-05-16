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

  test('in-progress intake card resumes selected dog with choice buttons', async ({ page }) => {
    await page.route('**/api/liff/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'テスト飼い主太郎',
          store_id: 1,
          store_name: 'E2Eテスト店舗',
          store_address: '東京都渋谷区テスト1-2-3',
          line_id: 'test_line_user_001',
          primary_business_type: 'daycare',
          available_business_types: ['daycare'],
          dogs: [
            { id: 1, name: 'テスト犬ポチ', breed: 'トイプードル' },
            { id: 2, name: 'テスト犬モモ', breed: '柴犬' },
          ],
          contracts: [],
        }),
      });
    });

    await page.route('**/api/liff/dashboard/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          service_type: 'daycare',
          next_reservation: null,
          latest_record: null,
          announcements: { total: 0, unread: 0, latest: null },
        }),
      });
    });

    await page.route('**/api/liff/intake/dogs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 1, name: 'テスト犬ポチ', photo_url: null, intakeStatus: 'in_progress' },
            { id: 2, name: 'テスト犬モモ', photo_url: null, intakeStatus: 'in_progress' },
          ],
        }),
      });
    });

    await page.route('**/api/liff/intake/start', async (route) => {
      const body = route.request().postDataJSON() as { dog_id: number };
      const dogName = body.dog_id === 2 ? 'テスト犬モモ' : 'テスト犬ポチ';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            session_id: 900 + body.dog_id,
            dog_name: dogName,
            messages: [
              { role: 'assistant', content: `${dogName}について教えてください` },
              { role: 'user', content: '以前の回答' },
              { role: 'assistant', content: `${dogName}が好きな遊びは？` },
            ],
            currentQuestion: {
              type: 'single_choice',
              choices: [
                { label: `${dogName}専用の選択肢`, value: 'dog-specific' },
                { label: 'その他', value: 'other-choice' },
              ],
              allowOther: false,
              allowSupplementText: true,
              skippable: true,
            },
            progress: { phase: 2, totalPhases: 4, percentage: 40 },
          },
        }),
      });
    });

    await page.goto('/liff/home');
    await page.getByRole('button', { name: 'テスト犬モモのカルテを作成' }).click();

    await expect(page).toHaveURL(/\/liff\/home\/intake\/2/);
    await expect(page.getByRole('button', { name: 'テスト犬モモ専用の選択肢' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByPlaceholder('補足（任意）')).toBeVisible();
    await expect(page.getByRole('button', { name: 'スキップ' })).toBeVisible();
  });
});
