import { test, expect } from '@playwright/test';
import { setupLiffMocks } from '../helpers/liff-auth-mock';

test.describe('LIFF MyPage', () => {
  test.beforeEach(async ({ page }) => {
    await setupLiffMocks(page);
  });

  const multiDogOwner = {
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
    contracts: [
      {
        id: 101,
        dog_id: 1,
        course_name: 'ポチ月謝プラン',
        contract_type: '月謝制',
        start_date: '2026-01-01',
        end_date: null,
        monthly_sessions: 8,
        total_sessions: null,
        remaining_sessions: null,
        calculated_remaining: null,
        price: 33000,
      },
      {
        id: 102,
        dog_id: 2,
        course_name: 'モモチケットプラン',
        contract_type: 'チケット制',
        start_date: '2026-01-01',
        end_date: null,
        monthly_sessions: null,
        total_sessions: 10,
        remaining_sessions: 6,
        calculated_remaining: 6,
        price: 44000,
      },
    ],
  };

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

  test('multi-dog cards switch selected contract by dog', async ({ page }) => {
    await page.route('**/api/liff/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(multiDogOwner),
      });
    });

    await page.goto('/liff/home/mypage');

    const pochiCard = page.getByRole('button', { name: /テスト犬ポチ/ });
    const momoCard = page.getByRole('button', { name: /テスト犬モモ/ });
    await expect(page.getByText('ポチ月謝プラン')).toBeVisible({ timeout: 15000 });
    await expect(pochiCard).toHaveAttribute('aria-pressed', 'true');
    await expect(momoCard).toHaveAttribute('aria-pressed', 'false');

    await momoCard.click();

    await expect(momoCard).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('モモチケットプラン')).toBeVisible();
    await expect(page.getByText('6 回')).toBeVisible();
    await expect(page.getByText('ポチ月謝プラン')).toBeHidden();
  });

  test('single-dog card does not show selected highlight styling', async ({ page }) => {
    await page.route('**/api/liff/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...multiDogOwner,
          dogs: [
            { id: 1, name: 'テスト犬ポチ', breed: 'トイプードル', gender: 'male' },
          ],
          contracts: [
            {
              id: 101,
              dog_id: 1,
              course_name: 'ポチ月謝プラン',
              contract_type: '月謝制',
              start_date: '2026-01-01',
              end_date: null,
              monthly_sessions: 8,
              total_sessions: null,
              remaining_sessions: null,
              calculated_remaining: null,
              price: 33000,
            },
          ],
        }),
      });
    });

    await page.goto('/liff/home/mypage');

    const dogCard = page.getByRole('button', { name: /テスト犬ポチ/ });
    await expect(dogCard).toBeVisible({ timeout: 15000 });
    await expect(dogCard).not.toHaveClass(/border-primary bg-primary\/5/);
    await expect(page.getByText('ポチ月謝プラン')).toBeVisible();
  });
});
