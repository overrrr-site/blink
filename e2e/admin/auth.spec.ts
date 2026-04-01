import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/admin/login.page';

const email = process.env.TEST_STAFF_EMAIL || 'e2e-staff@test.blink.pet';
const password = process.env.TEST_STAFF_PASSWORD || 'TestPassword123!';

test.describe('Admin Authentication', () => {
  test('staff can log in with email and password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(email, password);
    await loginPage.expectDashboard();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('wrong@test.com', 'wrongpassword');
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('unauthenticated user sees login page', async ({ browser }) => {
    // Use fresh context without storageState
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/login');
    await expect(page.getByText('スタッフログイン')).toBeVisible();
    await context.close();
  });

  test('login page shows correct heading', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(loginPage.heading).toContainText('スタッフログイン');
  });

  test('can switch to register mode', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.switchToRegister.click();
    await expect(loginPage.heading).toContainText('新規店舗登録');
    await expect(loginPage.storeNameInput).toBeVisible();
    await expect(loginPage.ownerNameInput).toBeVisible();
  });
});
