import { test, expect } from '@playwright/test';
import { ROUTES, expectNoAppError } from './helpers';

test.describe('Cities & Countries', () => {
  test('renders with Cities/Countries tabs and add button', async ({ page }) => {
    await page.goto(ROUTES.cities.path);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Cities' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cities', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Countries', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Add City/i })).toBeVisible();
    await expectNoAppError(page);
  });

  test('switches to the Countries tab', async ({ page }) => {
    await page.goto(ROUTES.cities.path);
    await page.getByRole('button', { name: 'Countries', exact: true }).click();
    await expect(page.getByRole('button', { name: /Add Country/i })).toBeVisible();
    await expectNoAppError(page);
  });

  test('opens and cancels the Add City modal', async ({ page }) => {
    await page.goto(ROUTES.cities.path);
    await page.getByRole('button', { name: /Add City/i }).click();
    await expect(
      page.getByRole('heading', { name: /Add New City/i })
    ).toBeVisible();
    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(page.getByRole('heading', { name: /Add New City/i })).toHaveCount(0);
  });
});
