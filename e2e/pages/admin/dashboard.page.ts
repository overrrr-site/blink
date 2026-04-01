import { type Page, type Locator } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  get heading(): Locator { return this.page.getByText('本日の予約').first(); }
  get emptyState(): Locator { return this.page.getByText('予約はありません').first(); }
  get alertsButton(): Locator { return this.page.locator('button').filter({ hasText: /アラート|確認/ }).first(); }

  statusFilter(label: string): Locator {
    return this.page.getByRole('button', { name: label }).first();
  }

  get newReservationAction(): Locator { return this.page.getByText('新規予約').first(); }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async waitForData() {
    // Wait for page to settle - don't rely on API response (SWR cache may prevent it)
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);
  }
}
