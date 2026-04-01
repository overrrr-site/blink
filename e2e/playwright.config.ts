import { defineConfig } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load env from e2e/.env.test (path relative to project root)
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: __dirname,
  globalSetup: path.resolve(__dirname, 'global-setup.ts'),
  globalTeardown: path.resolve(__dirname, 'global-teardown.ts'),
  outputDir: path.resolve(__dirname, 'test-results'),
  reporter: [['html', { outputFolder: path.resolve(__dirname, 'playwright-report') }]],
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: BASE_URL,
    locale: 'ja-JP',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'admin-setup',
      testMatch: /auth\.setup\.ts/,
      testDir: __dirname,
    },
    {
      name: 'liff-setup',
      testMatch: /liff\.setup\.ts/,
      testDir: __dirname,
    },
    {
      name: 'admin',
      dependencies: ['admin-setup'],
      testDir: path.resolve(__dirname, 'admin'),
      use: {
        storageState: path.resolve(__dirname, '.auth/admin.json'),
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'liff',
      dependencies: ['liff-setup'],
      testDir: path.resolve(__dirname, 'liff'),
      use: {
        storageState: path.resolve(__dirname, '.auth/liff.json'),
        viewport: { width: 375, height: 812 },
        isMobile: true,
      },
    },
    {
      name: 'flows',
      dependencies: ['admin-setup', 'liff-setup'],
      testDir: path.resolve(__dirname, 'flows'),
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  ...(process.env.BASE_URL
    ? {}
    : {
        webServer: [
          {
            command: 'npm run dev:server',
            port: 3001,
            reuseExistingServer: true,
            cwd: path.resolve(__dirname, '..'),
          },
          {
            command: 'npm run dev:client',
            port: 5173,
            reuseExistingServer: true,
            cwd: path.resolve(__dirname, '..'),
          },
        ],
      }),
});
