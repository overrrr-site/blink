import { type Page } from '@playwright/test';
import { getLiffMockScript } from './liff-mock';

/**
 * Sets up LIFF auth environment for each test:
 * 1. Blocks CDN LIFF SDK (replaces with mock so window.liff isn't overridden)
 * 2. Injects mock via addInitScript as fallback
 * 3. Mocks /api/liff/auth to return authenticated owner (correct format: { token, owner })
 *    This is needed because PrivateRoute renders with isAuthenticated=false initially,
 *    redirects to Login, and Login calls the auth API before Zustand initialize() runs.
 */
export async function setupLiffMocks(page: Page) {
  // Block the CDN SDK so it doesn't override our mock
  await page.route('https://static.line-scdn.net/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: getLiffMockScript(),
    });
  });

  // Inject mock before any scripts run
  await page.addInitScript({ content: getLiffMockScript() });

  // Fallback: catch all unmocked LIFF API calls to prevent 401 redirect loops.
  // Registered BEFORE auth mock so auth mock (registered after) has higher priority.
  await page.route('**/api/liff/**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    } else if (method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    } else {
      await route.continue();
    }
  });

  // Mock /availability to return correct format (prevents crash in useAvailability hook).
  // Registered AFTER fallback so it takes priority over the fallback.
  await page.route('**/api/liff/availability**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        month: new Date().toISOString().slice(0, 7),
        availability: [],
        businessHours: {},
        closedDays: [],
      }),
    });
  });

  // Mock auth API - Login.tsx expects { token, owner } directly (not { success, data: {...} })
  // Registered AFTER fallback so it takes priority over the fallback for /auth calls.
  await page.route('**/api/liff/auth', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'e2e_test_liff_token',
          owner: {
            id: 1,
            name: 'テスト飼い主太郎',
            storeId: 1,
            storeName: 'E2Eテスト店舗',
            storeAddress: '東京都渋谷区テスト1-2-3',
            lineUserId: 'test_line_user_001',
            primaryBusinessType: 'daycare',
            availableBusinessTypes: ['daycare', 'grooming', 'hotel'],
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Navigates to /liff/ and waits for auth to complete (redirect to /liff/home).
 * Use this before navigating to any protected LIFF route to ensure Zustand
 * isAuthenticated is set to true before PrivateRoute renders.
 */
export async function ensureLiffAuth(page: Page) {
  await page.goto('/liff/');
  await page.waitForURL('**/liff/home', { timeout: 15000 });
}
