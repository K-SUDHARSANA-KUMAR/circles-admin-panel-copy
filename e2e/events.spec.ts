import { test, expect } from '@playwright/test';
import { ROUTES, expectNoAppError } from './helpers';
import { describeEarlyAccess, describeVisibility } from '../src/app/(dashboard)/dashboard/events/visibility';

test.describe('Events', () => {
  test('list page renders core controls', async ({ page }) => {
    await page.goto(ROUTES.events.path);
    await expect(page.getByRole('heading', { level: 1, name: 'Events' })).toBeVisible();
    await expect(page.getByPlaceholder('Search events...')).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Event/i })).toBeVisible();
    await expectNoAppError(page);
  });

  test('Add Event navigates to the create form', async ({ page }) => {
    await page.goto(ROUTES.events.path);
    await page.getByRole('button', { name: /Add Event/i }).click();
    await page.waitForURL('**/dashboard/events/create');
    await expect(page.locator('#title')).toBeVisible();
    await expectNoAppError(page);
  });

  test('create blocks an empty form', async ({ page }) => {
    await page.goto(ROUTES.eventsCreate.path);
    await page.getByRole('button', { name: /Create Event/i }).click();
    await expect(page.getByText('Title is required')).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/events\/create/);
  });
});

// Pure logic, no page: the "Visible in app until" hint the admin reads.
test('visibility hint is relative to the event', () => {
  const start = new Date('2026-11-14T19:00:00Z');
  const end = new Date('2026-11-14T23:00:00Z');
  expect(describeVisibility(start, end)).toBe('Users see this card until the event ends.');
  expect(describeVisibility(start, end, new Date('2026-11-14T18:30:00Z'))).toBe(
    'Users see this card until 30 min before the event starts.',
  );
  expect(describeVisibility(start, end, new Date('2026-11-14T20:30:00Z'))).toBe(
    'Users see this card until 1 h 30 min after the event starts.',
  );
  expect(describeVisibility(start, end, new Date('2026-11-16T01:00:00Z'))).toBe(
    'Users see this card until 1 d 2 h after the event ends.',
  );
});

test('early-access hint is relative to the event start', () => {
  const start = new Date('2026-11-14T19:00:00Z');
  expect(describeEarlyAccess(start, new Date('2026-11-12T19:00:00Z'))).toBe(
    'Members can join as soon as it is published. Everyone else can join from 2 d before the event starts.',
  );
  expect(describeEarlyAccess(start)).toBeNull();
});
