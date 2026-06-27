import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load test credentials / config from .env.test (gitignored).
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

// Use a dedicated port so the suite always exercises the current source,
// not any stale `next dev` instance a developer may have on :3000.
const PORT = process.env.E2E_PORT || '3100';
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

// Storage state produced by the `setup` project after a real UI login.
// Resolved from cwd (project root) rather than imported, to avoid Playwright's
// TS-config module-resolution bug on Node 24.
const STORAGE_STATE = path.join(process.cwd(), 'e2e/.auth/user.json');

export default defineConfig({
  testDir: './e2e',
  // Data-driven pages hit a real dev backend, so give actions room to breathe.
  timeout: 60 * 1000,
  expect: { timeout: 15 * 1000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Keep workers low: the suite shares one dev server + one backend.
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },

  projects: [
    // 1. Authenticates once via the real login form, saves storageState.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    // 2. Login-screen / unauthenticated tests — explicitly no stored auth.
    {
      name: 'auth',
      testMatch: /auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: { cookies: [], origins: [] } },
    },

    // 3. Everything behind the dashboard — reuses the saved login session.
    {
      name: 'chromium',
      testIgnore: /auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
  ],

  // Launch the Next.js dev server automatically (uses .env.local backend config).
  webServer: {
    command: `npx next dev --turbopack -p ${PORT}`,
    url: BASE_URL,
    // Always boot a fresh server on our dedicated port (don't reuse :3000).
    reuseExistingServer: false,
    timeout: 180 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
