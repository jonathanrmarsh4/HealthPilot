import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // iPhone 15 Pro — Light / 100%
    {
      name: 'iphone15pro-light',
      use: {
        ...devices['iPhone 15 Pro'],
        colorScheme: 'light',
        // Default font scale ~100%
      },
    },
    // iPhone 15 Pro — Dark / 100%
    {
      name: 'iphone15pro-dark',
      use: {
        ...devices['iPhone 15 Pro'],
        colorScheme: 'dark',
      },
    },
    // iPhone 15 Pro — Light / 120% text (simulate larger text)
    {
      name: 'iphone15pro-light-120',
      use: {
        ...devices['iPhone 15 Pro'],
        colorScheme: 'light',
        // crude approximation of larger text via deviceScaleFactor
        deviceScaleFactor: 1.2,
      },
    },
    // iPhone 15 Pro — Dark / 120% text (simulate larger text in dark mode)
    {
      name: 'iphone15pro-dark-120',
      use: {
        ...devices['iPhone 15 Pro'],
        colorScheme: 'dark',
        // crude approximation of larger text via deviceScaleFactor
        deviceScaleFactor: 1.2,
      },
    },
  ],
  fullyParallel: true,
  retries: 1,
  workers: 3,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
