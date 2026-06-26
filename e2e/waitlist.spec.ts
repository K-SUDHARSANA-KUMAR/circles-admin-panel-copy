import { test, expect } from '@playwright/test';
import { ROUTES, expectNoAppError } from './helpers';

test.describe('Waitlist management', () => {
  test('renders Pending/Rejected tabs', async ({ page }) => {
    await page.goto(ROUTES.waitlist.path);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Waitlist' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pending', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rejected', exact: true })).toBeVisible();
    await expectNoAppError(page);
  });

  test('switches to the Rejected tab and updates the URL', async ({ page }) => {
    await page.goto(ROUTES.waitlist.path);
    await page.getByRole('button', { name: 'Rejected', exact: true }).click();
    await expect(page).toHaveURL(/tab=rejected/);
    await expectNoAppError(page);
  });
});

test.describe('Profile verification', () => {
  test('renders the verification queue', async ({ page }) => {
    await page.goto(ROUTES.profileVerification.path);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Profile verification' })
    ).toBeVisible();
    await expect(page.getByPlaceholder('Search by name or phone no...')).toBeVisible();
    await expectNoAppError(page);
  });
});
