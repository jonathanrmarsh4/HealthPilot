import { test, expect } from '@playwright/test';

// Tag snapshot tests with @visual for visual regression detection
test.describe('@visual Visual Regression Testing', () => {
  const screens = [
    { path: '/', name: 'dashboard' },
    { path: '/training', name: 'training' },
    { path: '/recovery', name: 'recovery' },
    { path: '/insights', name: 'insights' },
    { path: '/settings', name: 'settings' },
  ];

  for (const screen of screens) {
    test(`${screen.name} screen matches baseline`, async ({ page }) => {
      await page.goto(screen.path);
      
      // Wait for content to load
      await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000); // Allow animations to complete
      
      // Take full-page screenshot
      expect(await page.screenshot({ 
        fullPage: true,
        animations: 'disabled', // Disable animations for consistent snapshots
      })).toMatchSnapshot(`${screen.name}.png`, { 
        maxDiffPixelRatio: 0.05 // Allow 5% difference (accounts for dynamic data)
      });
    });
  }

  test('Mobile viewport matches baseline', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/');
    
    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
    
    expect(await page.screenshot({ 
      fullPage: true,
      animations: 'disabled',
    })).toMatchSnapshot('mobile-dashboard.png', { maxDiffPixelRatio: 0.05 });
  });
});
