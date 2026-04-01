import { test as setup } from '@playwright/test';
import { getLiffMockScript } from './helpers/liff-mock';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const LIFF_AUTH_FILE = path.resolve(__dirname, '.auth/liff.json');

setup('authenticate as LIFF owner', async ({ page }) => {
  // Block the real LIFF SDK from loading and inject our mock instead
  await page.route('**/liff/edge/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: getLiffMockScript(),
    });
  });

  // Also inject via addInitScript as fallback
  await page.addInitScript({ content: getLiffMockScript() });

  const ownerData = {
    id: parseInt(process.env.E2E_OWNER_ID || '1'),
    name: 'テスト飼い主太郎',
    storeId: parseInt(process.env.E2E_STORE_ID || '1'),
    storeName: 'E2Eテスト店舗',
    storeAddress: '東京都渋谷区テスト1-2-3',
    lineUserId: process.env.TEST_LINE_USER_ID || 'test_line_user_001',
    primaryBusinessType: 'daycare',
    availableBusinessTypes: ['daycare', 'grooming', 'hotel'],
  };

  // Mock the LIFF auth API
  await page.route('**/api/liff/auth', async (route, request) => {
    if (request.method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: 'e2e_test_liff_token_' + Date.now(),
            owner: ownerData,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Block LINE Login redirects
  await page.route('**/access.line.me/**', async (route) => {
    await route.abort();
  });

  await page.goto('/liff/');

  // Wait for auth flow - may redirect to /liff/home or stay on /liff/
  try {
    await page.waitForURL('**/liff/home', { timeout: 10000 });
  } catch {
    // If redirect didn't happen, manually set auth state in localStorage
    await page.evaluate((data) => {
      localStorage.setItem('liff_token', 'e2e_test_liff_token');
      localStorage.setItem('liff_user', JSON.stringify(data));
      localStorage.setItem('liff_selected_business_type', 'daycare');
    }, ownerData);

    // Navigate to home with auth state set
    await page.goto('/liff/home');
    await page.waitForTimeout(2000);
  }

  await page.context().storageState({ path: LIFF_AUTH_FILE });
});
