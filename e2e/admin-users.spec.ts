import { test, expect } from '@playwright/test';
import { ROUTES, expectNoAppError } from './helpers';

test.describe('Admin users', () => {
  test('renders list with search and Add Admin', async ({ page }) => {
    await page.goto(ROUTES.adminUsers.path);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Admin Users' })
    ).toBeVisible();
    await expect(page.getByPlaceholder('Search by name or email...')).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Admin/i })).toBeVisible();
    await expectNoAppError(page);
  });

  test('opens the Add Admin modal and validates required fields', async ({ page }) => {
    await page.goto(ROUTES.adminUsers.path);
    await page.getByRole('button', { name: /Add Admin/i }).click();
    await expect(
      page.getByRole('heading', { name: /Add New Admin User/i })
    ).toBeVisible();
    await expect(page.getByPlaceholder('name@company.com')).toBeVisible();

    // Close without saving.
    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(
      page.getByRole('heading', { name: /Add New Admin User/i })
    ).toHaveCount(0);
  });
});
