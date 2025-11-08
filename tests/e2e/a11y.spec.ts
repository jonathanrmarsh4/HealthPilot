import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Tag these so we can run via `npm run a11y`
test.describe('@a11y Accessibility', () => {
  const targets = ['/', '/today', '/training', '/insights', '/settings'];

  for (const path of targets) {
    test(`axe: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      // Fail test on any violations; the AI will fix and re-run
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });
  }
});
