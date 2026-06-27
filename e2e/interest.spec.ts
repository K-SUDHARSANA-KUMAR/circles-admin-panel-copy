import { test, expect } from '@playwright/test';
import { ROUTES, expectNoAppError } from './helpers';

test.describe('Interest management', () => {
  test('renders search and New Group controls', async ({ page }) => {
    await page.goto(ROUTES.interest.path);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Interests' })
    ).toBeVisible();
    await expect(
      page.getByPlaceholder('Search groups or interests...')
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /New Group/i })).toBeVisible();
    await expectNoAppError(page);
  });

  test('toggles the inline create-group panel', async ({ page }) => {
    await page.goto(ROUTES.interest.path);
    await page.getByRole('button', { name: /New Group/i }).click();
    await expect(
      page.getByPlaceholder(/Sports & Outdoors, Music & Beats/i)
    ).toBeVisible();
    // Toggling again (now labelled Cancel) hides the panel.
    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(
      page.getByPlaceholder(/Sports & Outdoors, Music & Beats/i)
    ).toHaveCount(0);
  });
});
