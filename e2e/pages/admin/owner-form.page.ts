import { type Page, type Locator } from '@playwright/test';

export class OwnerFormPage {
  constructor(private page: Page) {}

  get nameInput(): Locator { return this.page.getByPlaceholder('田中 花子'); }
  get nameKanaInput(): Locator { return this.page.getByPlaceholder('タナカ ハナコ'); }
  get phoneInput(): Locator { return this.page.getByPlaceholder('09012345678'); }
  get emailInput(): Locator { return this.page.getByPlaceholder('example@email.com'); }
  get addressInput(): Locator { return this.page.getByPlaceholder('東京都渋谷区...'); }
  get emergencyNameInput(): Locator { return this.page.getByPlaceholder('田中 太郎（夫）'); }
  get emergencyPhoneInput(): Locator { return this.page.getByPlaceholder('08098765432'); }
  get memoInput(): Locator { return this.page.getByPlaceholder('特記事項があれば入力'); }
  get submitButton(): Locator { return this.page.locator('button[type="submit"]').first(); }
  get backButton(): Locator { return this.page.locator('button').filter({ hasText: /戻る/ }).first(); }

  async gotoCreate() {
    await this.page.goto('/owners/new');
  }

  async gotoEdit(ownerId: number) {
    await this.page.goto(`/owners/${ownerId}/edit`);
  }

  async fillOwner(data: { name: string; phone: string; nameKana?: string; email?: string; address?: string }) {
    await this.nameInput.fill(data.name);
    await this.phoneInput.fill(data.phone);
    if (data.nameKana) await this.nameKanaInput.fill(data.nameKana);
    if (data.email) await this.emailInput.fill(data.email);
    if (data.address) await this.addressInput.fill(data.address);
  }

  async submit() {
    await this.submitButton.click();
  }
}
