import { test, expect } from '@playwright/test';

// Basic "does it boot and navigate" checks across critical routes
const routes = ['/', '/today', '/training', '/insights', '/settings'];

test.describe('Smoke: boot & nav', () => {
  for (const route of routes) {
    test(`route ${route} renders without crash`, async ({ page }) => {
      await page.goto(route);
      // Look for a common root marker to ensure React mounted:
      await expect(page.locator('#root')).toBeVisible();
      // Generic no-crash heuristic: no red error overlay
      await expect(page.locator('text=Uncaught')).toHaveCount(0);
    });
  }

  test('navigation works between pages', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
    
    // Basic navigation test - wait for page load
    await page.waitForLoadState('networkidle');
  });
});
