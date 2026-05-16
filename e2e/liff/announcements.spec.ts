import { test, expect } from '@playwright/test';
import { setupLiffMocks } from '../helpers/liff-auth-mock';

test.describe('LIFF Announcements', () => {
  test.beforeEach(async ({ page }) => {
    await setupLiffMocks(page);
  });

  test('announcement image opens and closes photo viewer', async ({ page }) => {
    const imageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lwH8VwAAAABJRU5ErkJggg==';

    await page.route('**/api/liff/announcements', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            title: '画像付きのお知らせ',
            content: 'お知らせ本文です',
            image_url: imageUrl,
            is_important: false,
            is_read: false,
            published_at: '2026-05-01T00:00:00.000Z',
            created_at: '2026-05-01T00:00:00.000Z',
          },
        ]),
      });
    });

    await page.goto('/liff/home/announcements');

    await page.getByRole('button', { name: /画像付きのお知らせ/ }).click();
    const imageButton = page.getByRole('button', { name: '画像を拡大表示' });
    await expect(imageButton).toBeVisible({ timeout: 15000 });

    await imageButton.click();

    await expect(page.getByText('画像付きのお知らせ').last()).toBeVisible();
    const closeButton = page.getByRole('button', { name: '閉じる' });
    await expect(closeButton).toBeVisible();

    await closeButton.click();

    await expect(closeButton).toBeHidden();
  });
});
