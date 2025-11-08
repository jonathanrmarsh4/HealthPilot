import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Tag these so we can run via `npm run a11y`
test.describe('@a11y Accessibility Compliance', () => {
  const targets = [
    { path: '/', name: 'Dashboard' },
    { path: '/training', name: 'Training' },
    { path: '/recovery', name: 'Recovery' },
    { path: '/insights', name: 'Insights' },
    { path: '/settings', name: 'Settings' },
    { path: '/biomarkers', name: 'Biomarkers' },
    { path: '/goals', name: 'Goals' },
  ];

  for (const target of targets) {
    test(`WCAG 2.1 AA compliance: ${target.name}`, async ({ page }) => {
      await page.goto(target.path);
      
      // Wait for content to load
      await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000); // Allow dynamic content to settle
      
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Fail test on any violations with detailed output
      expect(results.violations, 
        `Found ${results.violations.length} accessibility violations on ${target.name}:\n${JSON.stringify(results.violations, null, 2)}`
      ).toEqual([]);
    });
  }

  test('Color contrast meets WCAG AA standards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
    
    const results = await new AxeBuilder({ page })
      .withTags(['cat.color'])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('Keyboard navigation works', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
    
    // Tab through focusable elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // At least one element should be focused
    const focusedElement = await page.locator(':focus').count();
    expect(focusedElement).toBeGreaterThan(0);
  });
});
