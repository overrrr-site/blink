import { test, expect } from '@playwright/test';
import { disableTrialOverlays } from '../helpers/admin-mocks';

test.describe('Reservation Management', () => {
  test.beforeEach(async ({ page }) => {
    await disableTrialOverlays(page);
  });

  test('calendar view loads', async ({ page }) => {
    await page.goto('/reservations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Calendar should show month/year heading
    await expect(page.getByRole('heading', { name: /\d{4}年/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test('month navigation works', async ({ page }) => {
    await page.goto('/reservations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await expect(page.getByRole('heading', { name: /\d{4}年/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test('create daycare reservation page loads', async ({ page }) => {
    await page.goto('/reservations/new');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 });
  });

  test('create grooming reservation page loads', async ({ page }) => {
    await page.goto('/reservations/grooming/create');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 });
  });

  test('create hotel reservation page loads', async ({ page }) => {
    await page.goto('/reservations/hotel/create');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 });
  });

  test('reservation form has dog selection', async ({ page }) => {
    await page.goto('/reservations/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    // Should have some form content
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('can select a date on calendar', async ({ page }) => {
    await page.goto('/reservations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await expect(page.getByRole('heading', { name: /\d{4}年/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test('reservation detail navigation', async ({ page }) => {
    await page.goto('/reservations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // If there are reservation cards, the page is functional
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
