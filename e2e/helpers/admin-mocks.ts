import { type Page } from '@playwright/test';

/**
 * Mock trial guide and onboarding APIs to prevent overlays from blocking tests.
 * The production test store is in trial mode, which causes TrialGuideOverlay
 * and CoachMark components to render fixed overlays that intercept clicks.
 */
export async function disableTrialOverlays(page: Page) {
  await page.route('**/api/trial/guide', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          is_trial: false,
          guide_completed: true,
          steps: [],
          current_step: null,
          days_remaining: 0,
          trial_store_code: '',
        },
      }),
    });
  });

  await page.route('**/api/staff/me/onboarding', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          role: 'admin',
          setup: { line: 'completed', google_calendar: 'completed' },
          completedHints: [],
          dismissed: true,
          firstLoginAt: '2024-01-01T00:00:00Z',
        }),
      });
    } else {
      await route.continue();
    }
  });
}
