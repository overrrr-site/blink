import { type Page, type Locator } from '@playwright/test';

export class CustomersPage {
  constructor(private page: Page) {}

  get heading(): Locator { return this.page.getByRole('heading', { name: '顧客管理' }).first(); }
  get searchInput(): Locator { return this.page.getByPlaceholder('名前、電話番号、犬種で検索...'); }
  get ownersTab(): Locator { return this.page.getByRole('button', { name: '飼い主一覧を表示' }); }
  get dogsTab(): Locator { return this.page.getByRole('button', { name: /ワンちゃん一覧/ }); }
  get registerOwnerButton(): Locator { return this.page.getByRole('button', { name: '飼い主を登録' }); }
  get emptyState(): Locator { return this.page.getByText('飼い主が登録されていません').first(); }

  async goto() {
    await this.page.goto('/customers');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1500);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }
}
