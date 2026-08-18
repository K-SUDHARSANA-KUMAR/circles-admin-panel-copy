import { test as setup, expect } from '@playwright/test';
import path from 'path';

const STORAGE_STATE = path.join(process.cwd(), 'e2e/.auth/user.json');

const USERNAME = process.env.E2E_USERNAME;
const PASSWORD = process.env.E2E_PASSWORD;

/**
 * Logs in through the real login form once and persists the resulting session
 * (tokens + isAuthenticated live in localStorage) to STORAGE_STATE so the
 * authenticated test projects can reuse it without re-logging in each time.
 */
setup('authenticate', async ({ page }) => {
  expect(
    USERNAME && PASSWORD,
    'E2E_USERNAME / E2E_PASSWORD must be set in .env.test'
  ).toBeTruthy();

  await page.goto('/');

  // Login form: email + password are the only inputs in `login` mode.
  await page.getByPlaceholder('eg: irfan@nokha.in').fill(USERNAME!);
  await page.getByPlaceholder('eg: *********').fill(PASSWORD!);
  await page.getByRole('button', { name: 'Log In' }).click();

  // Successful login redirects to the dashboard overview.
  await page.waitForURL('**/dashboard/overview', { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
});
