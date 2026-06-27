import { test, expect } from '@playwright/test';
import { ROUTES, expectNoAppError } from './helpers';

test.describe('Venues', () => {
  test('list page renders core controls', async ({ page }) => {
    await page.goto(ROUTES.venues.path);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Venues' })
    ).toBeVisible();
    await expect(page.getByPlaceholder('Search venues...')).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Venue/i })).toBeVisible();
    await expectNoAppError(page);
  });

  test('search input accepts a query without crashing', async ({ page }) => {
    await page.goto(ROUTES.venues.path);
    const search = page.getByPlaceholder('Search venues...');
    await search.fill('test venue');
    await expect(search).toHaveValue('test venue');
    // debounce (500ms) + refetch
    await page.waitForTimeout(900);
    await expectNoAppError(page);
  });

  test('Add Venue navigates to the create form', async ({ page }) => {
    await page.goto(ROUTES.venues.path);
    await page.getByRole('button', { name: /Add Venue/i }).click();
    await page.waitForURL('**/dashboard/venues/create');
    await expectNoAppError(page);
    // The create form should render some input fields.
    await expect(page.locator('form, input').first()).toBeVisible();
  });

  test('create page loads directly', async ({ page }) => {
    await page.goto(ROUTES.venuesCreate.path);
    await expectNoAppError(page);
    await expect(page.locator('input, form').first()).toBeVisible();
  });
});
