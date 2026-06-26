import { test, expect } from '@playwright/test';

// This project runs WITHOUT stored auth (see playwright.config.ts → `auth`).

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
    await expect(page.getByPlaceholder('eg: irfan@nokha.in')).toBeVisible();
    await expect(page.getByPlaceholder('eg: *********')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Forgot Password?' })).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page.getByText('Email is required.')).toBeVisible();
    await expect(page.getByText('Password is required.')).toBeVisible();
  });

  test('toggles password visibility', async ({ page }) => {
    const password = page.getByPlaceholder('eg: *********');
    await password.fill('secret123');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('forgot-password flow shows the reset UI and returns to login', async ({ page }) => {
    await page.getByRole('button', { name: 'Forgot Password?' }).click();
    await expect(page.getByRole('heading', { name: 'Forgot Password' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Send Verification Code' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Back to Log In' }).click();
    await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
  });

  test('rejects invalid credentials', async ({ page }) => {
    await page.getByPlaceholder('eg: irfan@nokha.in').fill('nope@example.com');
    await page.getByPlaceholder('eg: *********').fill('wrong-password');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Sonner toast surfaces the backend / generic error message.
    await expect(page.getByText(/failed|invalid|incorrect|credentials/i).first()).toBeVisible({
      timeout: 20_000,
    });
    // Must NOT have navigated into the dashboard.
    await expect(page).not.toHaveURL(/dashboard/);
  });
});

test.describe('Route protection', () => {
  test('redirects unauthenticated users away from the dashboard', async ({ page }) => {
    await page.goto('/dashboard/overview');
    await page.waitForURL((url) => !url.pathname.startsWith('/dashboard'), {
      timeout: 15_000,
    });
    await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
  });
});
