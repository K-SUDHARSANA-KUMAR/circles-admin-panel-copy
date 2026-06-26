import { test, expect } from '@playwright/test';
import { ROUTES, expectNoAppError } from './helpers';

test.describe('Dashboard overview', () => {
  test('shows KPI cards and the users chart', async ({ page }) => {
    await page.goto(ROUTES.overview.path);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Overview' })
    ).toBeVisible();
    await expect(page.getByText(/Users Overview/i)).toBeVisible();
    await expectNoAppError(page);
  });
});

test.describe('Profile', () => {
  test('renders the admin profile page', async ({ page }) => {
    await page.goto(ROUTES.profile.path);
    await expect(
      page.getByRole('heading', { level: 1, name: 'My Profile' })
    ).toBeVisible();
    await expectNoAppError(page);
  });

  test('profile chip in the header links to the profile page', async ({ page }) => {
    await page.goto(ROUTES.overview.path);
    await page.getByRole('link', { name: /Super Admin|Admin/i }).first().click();
    await page.waitForURL('**/dashboard/profile');
    await expectNoAppError(page);
  });
});

test.describe('Placeholder pages', () => {
  test('reviews page renders its empty state', async ({ page }) => {
    await page.goto(ROUTES.reviews.path);
    await expect(page.getByText(/No Reviews Pending/i)).toBeVisible();
    await expectNoAppError(page);
  });

  test('reports page renders its empty state', async ({ page }) => {
    await page.goto(ROUTES.reports.path);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Reports & Analytics' })
    ).toBeVisible();
    await expectNoAppError(page);
  });
});
