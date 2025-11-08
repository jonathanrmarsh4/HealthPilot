import { test, expect } from '@playwright/test';

test.describe('Critical User Flows - Smoke Tests', () => {
  // Core app boot test
  test('App boots and renders dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Wait for React app to mount
    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
    
    // Check no crash overlay
    await expect(page.locator('text=Uncaught')).toHaveCount(0);
    
    // Verify dashboard content appears (at least some text content)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(50); // More than empty page
  });

  // Critical routes accessibility
  const criticalRoutes = [
    { path: '/', name: 'Dashboard', hasContent: /health|dashboard|today|training/i },
    { path: '/training', name: 'Training', hasContent: /training|workout|exercise/i },
    { path: '/recovery', name: 'Recovery', hasContent: /recovery|muscle|rest|fatigue/i },
    { path: '/insights', name: 'Insights', hasContent: /insights?|analysis|trend|daily/i },
    { path: '/settings', name: 'Settings', hasContent: /settings|preferences|privacy|account/i },
  ];

  for (const route of criticalRoutes) {
    test(`${route.name} page loads without errors`, async ({ page }) => {
      await page.goto(route.path);
      
      // Wait for page load
      await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
      
      // No crash
      await expect(page.locator('text=Uncaught')).toHaveCount(0);
      
      // Has expected content
      const hasContent = await page.locator(`text=${route.hasContent}`).count();
      expect(hasContent).toBeGreaterThan(0);
    });
  }

  // Navigation flow test
  test('Can navigate between key pages', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
    
    // Try navigating to training
    await page.goto('/training');
    await expect(page.locator('body')).toContainText(/training|workout/i);
    
    // Navigate to insights
    await page.goto('/insights');
    await expect(page.locator('body')).toContainText(/insights?|analysis/i);
  });

  // 404 handling
  test('404 page shows for invalid routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyz123');
    
    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
    
    // Check for 404 messaging
    const has404 = await page.locator('text=/404|not found|page.*not.*exist/i').count();
    expect(has404).toBeGreaterThan(0);
  });
});
