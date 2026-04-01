import { test as base, type Page } from '@playwright/test';
import { getLiffMockScript } from '../helpers/liff-mock';
import path from 'path';

type Fixtures = {
  adminPage: Page;
  liffPage: Page;
};

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve(__dirname, '../.auth/admin.json'),
      viewport: { width: 1280, height: 800 },
      locale: 'ja-JP',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  liffPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve(__dirname, '../.auth/liff.json'),
      viewport: { width: 375, height: 812 },
      isMobile: true,
      locale: 'ja-JP',
    });
    const page = await context.newPage();
    await page.addInitScript({ content: getLiffMockScript() });
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
