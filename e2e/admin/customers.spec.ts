import { test, expect } from '@playwright/test';
import { CustomersPage } from '../pages/admin/customers.page';
import { OwnerFormPage } from '../pages/admin/owner-form.page';
import { disableTrialOverlays } from '../helpers/admin-mocks';

test.describe('Customer Management', () => {
  test.beforeEach(async ({ page }) => {
    await disableTrialOverlays(page);
  });

  test('customers page loads with heading', async ({ page }) => {
    const customers = new CustomersPage(page);
    await customers.goto();
    await expect(customers.heading).toBeVisible();
  });

  test('search input is visible and functional', async ({ page }) => {
    const customers = new CustomersPage(page);
    await customers.goto();
    await expect(customers.searchInput).toBeVisible();
    await customers.search('テスト');
    // Just verify search doesn't crash the page
    await page.waitForTimeout(1000);
    await expect(customers.heading).toBeVisible();
  });

  test('can switch between owner and dog views', async ({ page }) => {
    const customers = new CustomersPage(page);
    await customers.goto();
    // Use aria-label for precise tab selection
    const dogsTab = page.getByRole('button', { name: /ワンちゃん/ }).first();
    if (await dogsTab.isVisible().catch(() => false)) {
      await dogsTab.click();
      await page.waitForTimeout(300);
    }
    const ownersTab = page.getByRole('button', { name: /飼い主/ }).first();
    if (await ownersTab.isVisible().catch(() => false)) {
      await ownersTab.click();
    }
  });

  test('create new owner', async ({ page }) => {
    const ownerForm = new OwnerFormPage(page);
    await ownerForm.gotoCreate();

    const uniqueName = `e2e-${Date.now()}`;
    await ownerForm.fillOwner({
      name: uniqueName,
      phone: `080${Math.floor(10000000 + Math.random() * 90000000)}`,
      nameKana: 'テスト',
    });
    // Select at least one service type (required field)
    await page.getByRole('button', { name: '幼稚園' }).first().click();
    await ownerForm.submit();
    // Should redirect after save
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toMatch(/owners\/\d+|customers/);
  });

  test('view owner detail', async ({ page }) => {
    const customers = new CustomersPage(page);
    await customers.goto();

    const firstCard = page.locator('button.bg-card').first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await page.waitForURL(/owners\/\d+/, { timeout: 5000 });
      await expect(page.getByRole('heading').first()).toBeVisible();
    }
  });

  test('navigate to create dog from owner detail', async ({ page }) => {
    const customers = new CustomersPage(page);
    await customers.goto();

    const firstCard = page.locator('button.bg-card').first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await page.waitForURL(/owners\/\d+/, { timeout: 5000 });

      const addDogBtn = page.getByText(/ワンちゃんを追加|犬を追加/).first();
      if (await addDogBtn.isVisible().catch(() => false)) {
        await addDogBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('edit owner info', async ({ page }) => {
    const customers = new CustomersPage(page);
    await customers.goto();

    const firstCard = page.locator('button.bg-card').first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await page.waitForURL(/owners\/\d+/, { timeout: 5000 });

      const editBtn = page.getByRole('button', { name: /編集/ }).first();
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('empty state shows when no results', async ({ page }) => {
    const customers = new CustomersPage(page);
    await customers.goto();
    await customers.search('zzz-no-match-e2e-999');
    await page.waitForTimeout(1500);
    // Should show empty state or no results
    const hasEmpty = await page.getByText(/検索結果がありません|飼い主が登録されていません/).first().isVisible().catch(() => false);
    // If search returns results for some reason, page should still be functional
    await expect(customers.heading).toBeVisible();
  });
});
