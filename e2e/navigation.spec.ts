import { test, expect } from '@playwright/test';
import { ROUTES, gotoAndExpectHeading, expectNoAppError } from './helpers';

test.describe('Authenticated shell', () => {
  test('lands on the dashboard overview after login', async ({ page }) => {
    await gotoAndExpectHeading(page, ROUTES.overview);
    await expectNoAppError(page);
  });

  test('sidebar exposes every primary nav link', async ({ page }) => {
    await page.goto(ROUTES.overview.path);
    const nav = page.getByRole('navigation');
    for (const label of [
      'Dashboard',
      'Venues',
      'Cities',
      'Interest',
      'Users',
      'Waitlist Users',
      'Profile Verification',
      'Admin Users',
      'Reports',
    ]) {
      await expect(
        nav.getByRole('link', { name: label, exact: false }).first()
      ).toBeVisible();
    }
  });

  test('navigates through the sidebar to each section', async ({ page }) => {
    await page.goto(ROUTES.overview.path);

    const hops: Array<[string, { path: string; heading: string }]> = [
      ['Venues', ROUTES.venues],
      ['Cities', ROUTES.cities],
      ['Interest', ROUTES.interest],
      ['Users', ROUTES.users],
      ['Admin Users', ROUTES.adminUsers],
      ['Reports', ROUTES.reports],
    ];

    for (const [label, route] of hops) {
      await page
        .getByRole('navigation')
        .getByRole('link', { name: label, exact: false })
        .first()
        .click();
      await page.waitForURL(`**${route.path}`);
      await expect(
        page.getByRole('heading', { level: 1, name: route.heading })
      ).toBeVisible();
      await expectNoAppError(page);
    }
  });
});

test.describe('Smoke: every page loads without crashing', () => {
  for (const [key, route] of Object.entries(ROUTES)) {
    test(`loads ${key} (${route.path})`, async ({ page }) => {
      await page.goto(route.path);
      await expect(
        page.getByRole('heading', { level: 1, name: route.heading })
      ).toBeVisible();
      await expectNoAppError(page);
    });
  }
});

test.describe('Logout', () => {
  test('signs out and returns to the login screen', async ({ page }) => {
    await page.goto(ROUTES.overview.path);
    await page.getByRole('button', { name: 'Logout' }).first().click();
    await page.waitForURL((url) => !url.pathname.startsWith('/dashboard'), {
      timeout: 15_000,
    });
    await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
  });
});
