import { test, expect } from '@playwright/test';

// Tag snapshot tests with @visual
test.describe('@visual Visual Snapshots', () => {
  test('Today screen snapshot', async ({ page }) => {
    await page.goto('/today');
    await page.waitForLoadState('networkidle');
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot('today.png', { maxDiffPixelRatio: 0.02 });
  });

  test('Training screen snapshot', async ({ page }) => {
    await page.goto('/training');
    await page.waitForLoadState('networkidle');
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot('training.png', { maxDiffPixelRatio: 0.02 });
  });

  test('Insights screen snapshot', async ({ page }) => {
    await page.goto('/insights');
    await page.waitForLoadState('networkidle');
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot('insights.png', { maxDiffPixelRatio: 0.02 });
  });
});
