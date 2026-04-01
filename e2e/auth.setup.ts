import { test as setup, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: 'e2e/.env.test' });

import path from 'path';
const ADMIN_AUTH_FILE = path.resolve(__dirname, '.auth/admin.json');

setup('authenticate as admin', async ({ page }) => {
  const email = process.env.TEST_STAFF_EMAIL || 'e2e-staff@test.blink.pet';
  const password = process.env.TEST_STAFF_PASSWORD || 'TestPassword123!';

  // Navigate to login page
  await page.goto('/login');

  // Fill login form
  await page.getByPlaceholder('example@email.com').fill(email);
  await page.getByPlaceholder('パスワードを入力').fill(password);

  // Submit
  await page.getByRole('button', { name: 'ログイン' }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Verify we're authenticated
  await expect(page).toHaveURL(/dashboard/);

  // Save storage state (includes Supabase auth token in localStorage)
  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});
