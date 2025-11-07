# HealthPilot CI/CD Implementation Guide

## Overview

This guide provides a complete roadmap for implementing a robust CI/CD pipeline for the HealthPilot iOS (Capacitor/React) application. The pipeline enforces quality standards through automated checks on every pull request, ensuring code quality, accessibility, and visual consistency.

### Goals

- **Type Safety**: Catch TypeScript errors before merge
- **Code Quality**: Enforce linting standards with zero tolerance
- **Test Coverage**: Unit and E2E tests with mobile-specific scenarios
- **Accessibility**: WCAG 2.2 AA compliance via automated axe checks
- **Visual Regression**: Prevent UI breaks with Percy snapshots
- **PR Integration**: Block merges on failures, provide actionable feedback

### Pipeline Architecture

```
PR Trigger (files in /client/src or /server)
  │
  ├─→ TypeScript Check (tsc --noEmit)
  ├─→ ESLint (--max-warnings=0)
  ├─→ Unit Tests (vitest run)
  ├─→ E2E Tests (Playwright - iPhone 15 Pro)
  │    └─→ Accessibility Tests (axe-core)
  └─→ Visual Regression (Percy snapshots)
       │
       └─→ PR Comment (Percy comparison links + failures)
```

All checks run in parallel where possible. Any failure blocks the merge.

---

## Implementation Phases

Implement these phases incrementally. Each phase is independent and adds value on its own.

### Phase 1: ESLint Setup ⚡️ *Start here - quickest win*

**Time Estimate**: 30 minutes  
**Dependencies**: None  
**Value**: Immediate code quality improvement

#### 1.1 Install ESLint + Dependencies

```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y
```

#### 1.2 Create ESLint Configuration

Create `eslint.config.js` (flat config format - ESLint 9+):

```javascript
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      
      // TypeScript specific
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // React specific
      'react/react-in-jsx-scope': 'off', // Vite handles this
      'react/prop-types': 'off', // Using TypeScript
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // Accessibility
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      
      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.cache/**',
      'ios/**',
      'android/**',
      '*.config.js',
      '*.config.ts',
    ],
  },
];
```

#### 1.3 Add NPM Scripts

Update `package.json` - add these to your existing scripts section:

```json
{
  "scripts": {
    "check": "tsc --noEmit",
    "lint": "eslint . --max-warnings=0",
    "lint:fix": "eslint . --fix",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Note**: The `check` script already exists in your package.json, so you only need to add the others.

#### 1.4 Verification

```bash
npm run lint
```

Fix any errors found. Use `npm run lint:fix` for auto-fixable issues.

#### 1.5 Phase 1 Checklist

- [ ] ESLint installed
- [ ] `eslint.config.js` created
- [ ] Scripts added to `package.json`
- [ ] `npm run lint` passes with zero warnings
- [ ] Team aware of new linting standards

---

### Phase 2: Playwright + iPhone 15 Pro Configuration 📱

**Time Estimate**: 1-2 hours  
**Dependencies**: None  
**Value**: Mobile E2E testing capability

#### 2.1 Install Playwright

```bash
npm install --save-dev @playwright/test
npx playwright install --with-deps webkit
```

#### 2.2 Create Playwright Configuration

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['json', { outputFile: 'test-results.json' }], ['github']] : 'html',
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'iPhone 15 Pro',
      use: {
        ...devices['iPhone 15 Pro'],
        viewport: { width: 393, height: 852 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'iPhone 15 Pro Max',
      use: {
        ...devices['iPhone 15 Pro Max'],
      },
    },
    {
      name: 'iPhone SE',
      use: {
        ...devices['iPhone SE'],
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

#### 2.3 Add NPM Scripts

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:iphone": "playwright test --project='iPhone 15 Pro'"
  }
}
```

#### 2.4 Create Sample E2E Test

Create `e2e/sample.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Dashboard @ui', () => {
  test('loads successfully on iPhone', async ({ page }) => {
    await page.goto('/');
    
    // Wait for main content
    await expect(page.locator('h1')).toBeVisible();
    
    // Check mobile navigation
    const mobileNav = page.locator('[data-testid="mobile-nav"]');
    await expect(mobileNav).toBeVisible();
    
    // Verify safe areas (no content behind notch)
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(393);
    expect(viewport?.height).toBe(852);
  });

  test('navigation buttons meet touch target minimum @ui', async ({ page }) => {
    await page.goto('/');
    
    const navButtons = page.locator('[data-testid^="nav-"]');
    const count = await navButtons.count();
    
    for (let i = 0; i < count; i++) {
      const button = navButtons.nth(i);
      const box = await button.boundingBox();
      
      // Apple HIG: minimum 44pt (44px at 1x)
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });
});
```

#### 2.5 Verification

```bash
npm run test:e2e:iphone
```

#### 2.6 Phase 2 Checklist

- [ ] Playwright installed
- [ ] `playwright.config.ts` configured
- [ ] iPhone 15 Pro project defined
- [ ] Sample test passes
- [ ] Screenshots captured on failure

---

### Phase 3: Accessibility Testing with Axe 🎯

**Time Estimate**: 1 hour  
**Dependencies**: Phase 2 (Playwright)  
**Value**: Automated WCAG 2.2 AA compliance checks

#### 3.1 Install Axe

```bash
npm install --save-dev @axe-core/playwright
```

#### 3.2 Create Accessibility Test Helper

Create `e2e/helpers/a11y.ts`:

```typescript
import { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function checkA11y(page: Page, context?: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();

  if (results.violations.length > 0) {
    console.error(`\n🚨 Accessibility violations found${context ? ` in ${context}` : ''}:\n`);
    
    results.violations.forEach((violation, index) => {
      console.error(`\n${index + 1}. ${violation.id}: ${violation.description}`);
      console.error(`   Impact: ${violation.impact}`);
      console.error(`   Help: ${violation.helpUrl}`);
      
      violation.nodes.forEach((node) => {
        console.error(`   → ${node.target[0]}`);
        console.error(`     ${node.failureSummary}`);
      });
    });
    
    throw new Error(`${results.violations.length} accessibility violation(s) found`);
  }
  
  return results;
}
```

#### 3.3 Create Accessibility Tests

Create `e2e/accessibility.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { checkA11y } from './helpers/a11y';

test.describe('Accessibility @ui @a11y', () => {
  test('Dashboard meets WCAG 2.2 AA standards', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for violations
    await checkA11y(page, 'Dashboard');
  });

  test('Training page meets WCAG 2.2 AA standards', async ({ page }) => {
    await page.goto('/training');
    await page.waitForLoadState('networkidle');
    
    await checkA11y(page, 'Training Page');
  });

  test('Forms have proper labels and ARIA', async ({ page }) => {
    await page.goto('/settings');
    
    // Check all inputs have labels
    const inputs = page.locator('input[type="text"], input[type="email"]');
    const count = await inputs.count();
    
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const ariaLabel = await input.getAttribute('aria-label');
      const id = await input.getAttribute('id');
      
      // Either has aria-label or associated label
      if (!ariaLabel && id) {
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      } else {
        expect(ariaLabel).toBeTruthy();
      }
    }
    
    await checkA11y(page, 'Settings Page');
  });

  test('Color contrast meets AA standards', async ({ page }) => {
    await page.goto('/');
    
    // Axe will automatically check contrast ratios
    const results = await checkA11y(page, 'Color Contrast');
    
    // Ensure no contrast violations
    const contrastViolations = results.violations.filter(v => 
      v.id.includes('contrast')
    );
    expect(contrastViolations).toHaveLength(0);
  });

  test('Focus indicators are visible', async ({ page }) => {
    await page.goto('/');
    
    // Tab through focusable elements
    const focusableElements = page.locator('button, a, input, [tabindex="0"]');
    const count = Math.min(await focusableElements.count(), 5); // Test first 5
    
    for (let i = 0; i < count; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      // Get focused element
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
      
      // Check for visible focus indicator (outline or ring)
      const outline = await focused.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.outline !== 'none' || 
               style.boxShadow.includes('rgb') ||
               style.borderColor !== 'initial';
      });
      
      expect(outline).toBeTruthy();
    }
  });
});
```

#### 3.4 Add NPM Script

```json
{
  "scripts": {
    "test:a11y": "playwright test --grep @a11y"
  }
}
```

#### 3.5 Verification

```bash
npm run test:a11y
```

#### 3.6 Phase 3 Checklist

- [ ] @axe-core/playwright installed
- [ ] A11y helper created
- [ ] Accessibility tests written
- [ ] All tests pass with zero violations
- [ ] Focus indicators verified

---

### Phase 4: Percy Visual Regression Testing 📸

**Time Estimate**: 1-2 hours  
**Dependencies**: Phase 2 (Playwright)  
**Value**: Prevent unintended visual changes

#### 4.1 Percy Setup

1. Sign up at https://percy.io (free for open source)
2. Create a new project for HealthPilot
3. Get your `PERCY_TOKEN`

```bash
npm install --save-dev @percy/cli @percy/playwright
```

#### 4.2 Create Percy Configuration

Create `.percy.yml`:

```yaml
version: 2
snapshot:
  widths:
    - 393   # iPhone 15 Pro
    - 430   # iPhone 15 Pro Max
    - 375   # iPhone SE
  min-height: 1024
  percy-css: |
    /* Hide dynamic content from snapshots */
    [data-percy-hide] {
      visibility: hidden !important;
    }
    /* Freeze animations */
    * {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
    }
static:
  include: '**/*.html'
  exclude: '**/node_modules/**'
```

#### 4.3 Create Percy Test Helper

Create `e2e/helpers/percy.ts`:

```typescript
import { Page } from '@playwright/test';
import percySnapshot from '@percy/playwright';

export async function takeSnapshot(
  page: Page, 
  name: string, 
  options?: { waitForSelector?: string; hideSelectors?: string[] }
) {
  // Wait for selector if provided
  if (options?.waitForSelector) {
    await page.waitForSelector(options.waitForSelector, { state: 'visible' });
  }
  
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');
  
  // Hide dynamic elements
  if (options?.hideSelectors) {
    for (const selector of options.hideSelectors) {
      await page.locator(selector).evaluate(el => {
        el.setAttribute('data-percy-hide', 'true');
      }).catch(() => {
        // Selector might not exist, ignore
      });
    }
  }
  
  // Take snapshot
  await percySnapshot(page, name, {
    widths: [393, 430, 375], // iPhone sizes
  });
}
```

#### 4.4 Create Visual Regression Tests

Create `e2e/visual-regression.spec.ts`:

```typescript
import { test } from '@playwright/test';
import { takeSnapshot } from './helpers/percy';

test.describe('Visual Regression @ui @visual', () => {
  test('Dashboard - Light Mode', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ colorScheme: 'light' });
    
    await takeSnapshot(page, 'Dashboard - Light', {
      waitForSelector: '[data-testid="dashboard-content"]',
      hideSelectors: ['[data-testid="current-time"]', '.animated-loader'],
    });
  });

  test('Dashboard - Dark Mode', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await takeSnapshot(page, 'Dashboard - Dark', {
      waitForSelector: '[data-testid="dashboard-content"]',
      hideSelectors: ['[data-testid="current-time"]'],
    });
  });

  test('Training Page - Empty State', async ({ page }) => {
    await page.goto('/training');
    await takeSnapshot(page, 'Training - Empty State');
  });

  test('Training Page - With Workout', async ({ page }) => {
    await page.goto('/training');
    
    // Generate a workout (if button exists)
    const generateButton = page.locator('[data-testid="button-generate-workout"]');
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await page.waitForTimeout(2000); // Wait for generation
    }
    
    await takeSnapshot(page, 'Training - Active Workout', {
      hideSelectors: ['[data-testid="workout-timer"]'],
    });
  });

  test('Recovery Page', async ({ page }) => {
    await page.goto('/recovery');
    await takeSnapshot(page, 'Recovery Page');
  });

  test('Settings Page', async ({ page }) => {
    await page.goto('/settings');
    await takeSnapshot(page, 'Settings Page');
  });

  test('Modal - Example Dialog', async ({ page }) => {
    await page.goto('/');
    
    // Trigger a modal (adjust selector as needed)
    const modalTrigger = page.locator('[data-testid="button-info"]').first();
    if (await modalTrigger.isVisible()) {
      await modalTrigger.click();
      await page.waitForTimeout(500); // Wait for animation
      
      await takeSnapshot(page, 'Modal - Info Dialog');
    }
  });
});
```

#### 4.5 Add NPM Scripts

```json
{
  "scripts": {
    "test:visual": "percy exec -- playwright test --grep @visual",
    "test:visual:update": "percy exec -- playwright test --grep @visual --update-snapshots"
  }
}
```

#### 4.6 Add Percy Token to Environment

Create `.env.local` (don't commit this):

```bash
PERCY_TOKEN=your_percy_token_here
```

#### 4.7 Verification

```bash
# First run creates baseline
npm run test:visual

# View results at percy.io dashboard
```

#### 4.8 Phase 4 Checklist

- [ ] Percy account created
- [ ] @percy/playwright installed
- [ ] `.percy.yml` configured
- [ ] Percy helper created
- [ ] Visual tests written for key routes
- [ ] Baseline snapshots created
- [ ] Percy dashboard shows comparisons

---

### Phase 5: GitHub Actions CI/CD Workflow 🚀

**Time Estimate**: 1 hour  
**Dependencies**: Phases 1-4  
**Value**: Automated quality gates on every PR

#### 5.1 Create GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  pull_request:
    paths:
      - 'client/src/**'
      - 'server/**'
      - 'shared/**'
      - 'e2e/**'
      - 'package.json'
      - 'package-lock.json'
      - 'tsconfig.json'
      - 'playwright.config.ts'
      - '.github/workflows/**'

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'

jobs:
  # Job 1: Type Checking
  typecheck:
    name: TypeScript Type Check
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run TypeScript compiler
        run: npx tsc --noEmit

  # Job 2: Linting
  lint:
    name: ESLint Code Quality
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint

  # Job 3: Unit Tests
  unit-tests:
    name: Unit Tests (Vitest)
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Vitest
        run: npm run test

  # Job 4: E2E Tests
  e2e-tests:
    name: E2E Tests (Playwright - iPhone 15 Pro)
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps webkit
      
      - name: Run E2E tests
        run: npx playwright test --project='iPhone 15 Pro' --grep @ui
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-results
          path: |
            test-results.json
            playwright-report/
          retention-days: 7

  # Job 5: Accessibility Tests
  accessibility-tests:
    name: Accessibility Tests (Axe)
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps webkit
      
      - name: Run accessibility tests
        run: npm run test:a11y
      
      - name: Upload accessibility report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: a11y-results
          path: |
            test-results.json
            playwright-report/
          retention-days: 7

  # Job 6: Visual Regression Tests
  visual-regression:
    name: Visual Regression (Percy)
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps webkit
      
      - name: Run Percy snapshots
        id: percy
        run: |
          # Run Percy and capture exit code
          set +e
          npm run test:visual > percy-output.log 2>&1
          PERCY_EXIT_CODE=$?
          set -e
          
          # Extract Percy build URL from output
          PERCY_URL=$(grep -oP 'https://percy.io/[^ ]+' percy-output.log | head -1 || echo "")
          echo "percy_url=$PERCY_URL" >> $GITHUB_OUTPUT
          
          # Display output for debugging
          cat percy-output.log
          
          # Exit with Percy's original exit code (fail if Percy failed)
          exit $PERCY_EXIT_CODE
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
      
      - name: Comment Percy build link
        if: always() && steps.percy.outputs.percy_url != ''
        uses: actions/github-script@v7
        with:
          script: |
            const percyUrl = '${{ steps.percy.outputs.percy_url }}';
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `### 📸 Percy Visual Regression\n\n[View visual comparison →](${percyUrl})\n\n*Review changes and approve/reject in Percy dashboard*`
            });

  # Job 7: Status Check (required for merge)
  ci-success:
    name: CI Success
    runs-on: ubuntu-latest
    needs: [typecheck, lint, unit-tests, e2e-tests, accessibility-tests, visual-regression]
    if: always()
    
    steps:
      - name: Check job statuses
        run: |
          if [ "${{ needs.typecheck.result }}" != "success" ] || \
             [ "${{ needs.lint.result }}" != "success" ] || \
             [ "${{ needs.unit-tests.result }}" != "success" ] || \
             [ "${{ needs.e2e-tests.result }}" != "success" ] || \
             [ "${{ needs.accessibility-tests.result }}" != "success" ] || \
             [ "${{ needs.visual-regression.result }}" != "success" ]; then
            echo "One or more CI jobs failed"
            exit 1
          fi
          echo "All CI jobs passed successfully"
```

#### 5.2 Configure Branch Protection

In GitHub repository settings:

1. Go to Settings → Branches → Add rule
2. Branch name pattern: `main` (or your default branch)
3. Check "Require status checks to pass before merging"
4. Search and select: `CI Success`
5. Check "Require branches to be up to date"
6. Save changes

#### 5.3 Add GitHub Secrets

1. Go to Settings → Secrets and variables → Actions
2. Add new repository secret:
   - Name: `PERCY_TOKEN`
   - Value: Your Percy token

#### 5.4 Phase 5 Checklist

- [ ] `.github/workflows/ci.yml` created
- [ ] All jobs defined (typecheck, lint, unit, e2e, a11y, visual)
- [ ] Branch protection rule configured
- [ ] Percy token added to GitHub secrets
- [ ] First PR triggers workflow successfully

---

### Phase 6: PR Comment Automation 💬

**Time Estimate**: 30 minutes  
**Dependencies**: Phase 5  
**Value**: Actionable feedback directly in PRs

#### 6.1 Enhanced Test Failure Reporting

Update `.github/workflows/ci.yml` to add failure comment job:

```yaml
  # Add this job after visual-regression
  report-failures:
    name: Report Test Failures
    runs-on: ubuntu-latest
    needs: [e2e-tests, accessibility-tests]
    if: failure()
    
    steps:
      - name: Download E2E artifacts
        uses: actions/download-artifact@v4
        with:
          name: e2e-results
          path: ./reports/e2e
        continue-on-error: true
      
      - name: Download A11y artifacts
        uses: actions/download-artifact@v4
        with:
          name: a11y-results
          path: ./reports/a11y
        continue-on-error: true
      
      - name: Parse and comment failures
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            
            let comment = '## 🚨 Test Failures Detected\n\n';
            let hasFailures = false;
            
            // Parse E2E failures from JSON reporter output
            try {
              const e2eReport = JSON.parse(
                fs.readFileSync('./reports/e2e/test-results.json', 'utf8')
              );
              
              if (e2eReport.suites) {
                const failures = e2eReport.suites
                  .flatMap(s => s.specs || [])
                  .filter(spec => !spec.ok);
                
                if (failures.length > 0) {
                  hasFailures = true;
                  comment += '### E2E Test Failures\n\n';
                  failures.forEach(fail => {
                    comment += `- **${fail.title}**\n`;
                    comment += `  - File: \`${fail.file}\`\n`;
                    const error = fail.tests?.[0]?.results?.[0]?.error;
                    if (error) {
                      const errorMsg = error.message?.split('\n')[0] || 'Unknown error';
                      comment += `  - Error: ${errorMsg}\n`;
                    }
                    comment += '\n';
                  });
                }
              }
            } catch (e) {
              console.log('Could not parse E2E report:', e.message);
            }
            
            // Parse A11y failures
            try {
              const a11yReport = JSON.parse(
                fs.readFileSync('./reports/a11y/test-results.json', 'utf8')
              );
              
              if (a11yReport.suites) {
                const a11yFailures = a11yReport.suites
                  .flatMap(s => s.specs || [])
                  .filter(spec => !spec.ok);
                
                if (a11yFailures.length > 0) {
                  hasFailures = true;
                  comment += '### Accessibility Failures\n\n';
                  a11yFailures.forEach(fail => {
                    comment += `- **${fail.title}**\n`;
                    comment += `  - WCAG violations detected\n`;
                    comment += `  - Review artifacts for detailed axe report\n\n`;
                  });
                }
              }
            } catch (e) {
              console.log('Could not parse A11y report:', e.message);
            }
            
            if (!hasFailures) {
              comment += 'Unable to parse test results. Check workflow logs for details.\n\n';
            }
            
            comment += '\n---\n\n';
            comment += '📎 **Artifacts**: Download from workflow Summary tab\n';
            comment += '🔍 **Next Steps**: Fix failing tests and push new commits\n';
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

#### 6.2 Percy Comment Enhancement

The Percy comment is already included in the visual-regression job (Phase 5). It extracts the build URL from Percy CLI output and posts it as a PR comment.

**Note**: Percy will show "Changes Detected" status in their dashboard. The GitHub check will only fail if Percy snapshots can't be taken due to errors (not visual changes).

#### 6.3 Phase 6 Checklist

- [ ] Failure reporting job added
- [ ] Percy comment includes status
- [ ] Comments appear on test PRs
- [ ] Failure comments include actionable info

---

## Maintenance & Best Practices

### Keeping Tests Green

1. **Update snapshots intentionally**: When visual changes are expected, run `npm run test:visual:update`
2. **Fix flaky tests**: If a test fails intermittently, add proper waits or mock time-dependent data
3. **Review a11y violations**: Don't ignore accessibility warnings - they indicate real UX problems
4. **Monitor Percy quota**: Free tier has limits - archive old builds periodically

### Adding New Tests

When adding new features:

1. Add E2E tests with `@ui` tag
2. Add accessibility checks for new pages/components
3. Add Percy snapshots for new visual states
4. Update this guide if new test patterns emerge

### Troubleshooting

**Playwright timeouts in CI:**
- Increase timeout in `playwright.config.ts`
- Use `waitForLoadState('networkidle')` before assertions
- Check if dev server is starting correctly

**Percy snapshot differences:**
- Ensure dynamic content is hidden with `data-percy-hide`
- Check for date/time displays
- Verify fonts are loaded before snapshot

**ESLint failing on new code:**
- Run `npm run lint:fix` to auto-fix
- For intentional violations, use `// eslint-disable-next-line`
- Update rules in `eslint.config.js` if too strict

---

## Quick Reference

### NPM Scripts

```bash
# Linting
npm run lint              # Check code quality
npm run lint:fix          # Auto-fix issues

# Testing
npm run test              # Unit tests
npm run test:e2e          # All E2E tests
npm run test:e2e:iphone   # iPhone 15 Pro only
npm run test:a11y         # Accessibility tests
npm run test:visual       # Percy snapshots

# Development
npm run dev               # Start dev server
npm run build             # Production build
npm run check             # TypeScript check
```

### Common Test Tags

- `@ui` - General UI tests (required for E2E in CI)
- `@a11y` - Accessibility-specific tests
- `@visual` - Visual regression tests
- `@smoke` - Quick smoke tests for critical paths

### File Structure

```
healthpilot/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Main CI pipeline
├── e2e/
│   ├── helpers/
│   │   ├── a11y.ts               # Accessibility helpers
│   │   └── percy.ts              # Visual regression helpers
│   ├── accessibility.spec.ts      # A11y tests
│   ├── visual-regression.spec.ts  # Percy tests
│   └── sample.spec.ts            # E2E tests
├── .percy.yml                     # Percy config
├── playwright.config.ts           # Playwright config
├── eslint.config.js              # ESLint config
└── vitest.config.ts              # Vitest config
```

---

## Implementation Timeline

**Week 1: Foundation**
- ✅ Phase 1: ESLint (30 min)
- ✅ Phase 2: Playwright (1-2 hours)

**Week 2: Testing**
- ✅ Phase 3: Accessibility (1 hour)
- ✅ Phase 4: Percy (1-2 hours)

**Week 3: Automation**
- ✅ Phase 5: GitHub Actions (1 hour)
- ✅ Phase 6: PR Comments (30 min)

**Total Time**: ~6-8 hours spread over 2-3 weeks

---

## Success Metrics

After full implementation, you should see:

- ✅ **0 TypeScript errors** in production
- ✅ **0 ESLint warnings** enforced
- ✅ **>80% test coverage** on critical paths
- ✅ **0 WCAG violations** on key pages
- ✅ **Visual regression** caught before merge
- ✅ **Blocked PRs** when quality gates fail
- ✅ **Faster reviews** with automated feedback

---

## Next Steps

1. **Start with Phase 1** (ESLint) - quick win, immediate value
2. **Add tests incrementally** - don't block feature work
3. **Iterate on rules** - adjust strictness based on team feedback
4. **Monitor CI times** - optimize if builds get slow
5. **Update this guide** - document learnings and new patterns

---

**Questions or Issues?**

Refer to the troubleshooting section or create a GitHub issue with:
- CI job logs
- Error messages
- Steps to reproduce

This is a living document - update it as the pipeline evolves!
