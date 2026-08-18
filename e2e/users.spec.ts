import { test, expect } from '@playwright/test';
import { ROUTES, expectNoAppError } from './helpers';

test.describe('User management', () => {
  test('renders the users list with search', async ({ page }) => {
    await page.goto(ROUTES.users.path);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Users' })
    ).toBeVisible();
    await expect(page.getByPlaceholder('Search by name or phone no...')).toBeVisible();
    await expectNoAppError(page);
  });

  test('search accepts input and refetches without crashing', async ({ page }) => {
    await page.goto(ROUTES.users.path);
    const search = page.getByPlaceholder('Search by name or phone no...');
    await search.fill('john');
    await expect(search).toHaveValue('john');
    await page.waitForTimeout(900); // debounce + refetch
    await expectNoAppError(page);
  });

  test('opens a user status edit modal when data is present', async ({ page }) => {
    await page.goto(ROUTES.users.path);
    // Pencil/edit affordances live in table rows; only present with data.
    const rows = page.getByRole('row');
    const rowCount = await rows.count();
    test.skip(rowCount <= 1, 'No user rows returned by the backend to act on');

    // Click the first row-level action button that opens the status modal.
    const editButtons = page.locator('table button');
    if (await editButtons.count()) {
      await editButtons.last().click();
      await expect(page.getByText(/Edit User Status/i)).toBeVisible();
    }
  });
});
