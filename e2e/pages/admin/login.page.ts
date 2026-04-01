import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  get emailInput(): Locator { return this.page.getByPlaceholder('example@email.com'); }
  get passwordInput(): Locator { return this.page.getByPlaceholder('パスワードを入力'); }
  get loginButton(): Locator { return this.page.getByRole('button', { name: 'ログイン' }); }
  get errorMessage(): Locator { return this.page.locator('.bg-destructive\\/10'); }
  get successMessage(): Locator { return this.page.locator('.bg-chart-2\\/10'); }

  // Register mode
  get switchToRegister(): Locator { return this.page.getByText('新しい店舗を登録する'); }
  get switchToLogin(): Locator { return this.page.getByText('アカウントをお持ちの方はログイン'); }
  get storeNameInput(): Locator { return this.page.getByPlaceholder('店舗名を入力'); }
  get ownerNameInput(): Locator { return this.page.getByPlaceholder('管理者のお名前'); }
  get registerButton(): Locator { return this.page.getByRole('button', { name: '登録する' }); }

  // Forgot password
  get forgotPasswordLink(): Locator { return this.page.getByText('パスワードをお忘れですか？'); }
  get resetEmailButton(): Locator { return this.page.getByRole('button', { name: '再設定メールを送信' }); }
  get backToLogin(): Locator { return this.page.getByText('ログインに戻る'); }

  get heading(): Locator { return this.page.locator('h2'); }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async register(storeName: string, ownerName: string, email: string, password: string) {
    await this.switchToRegister.click();
    await this.storeNameInput.fill(storeName);
    await this.ownerNameInput.fill(ownerName);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async expectDashboard() {
    await this.page.waitForURL('**/dashboard', { timeout: 15000 });
  }
}
