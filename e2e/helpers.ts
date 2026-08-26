import { Page, expect } from '@playwright/test';

/**
 * Canonical routes that have a real page.tsx, paired with the <h1> that
 * PageHeader renders for each (the most stable per-page assertion).
 */
export const ROUTES = {
  overview: { path: '/dashboard/overview', heading: 'Overview' },
  venues: { path: '/dashboard/venues', heading: 'Venues' },
  venuesCreate: { path: '/dashboard/venues/create', heading: 'Create' },
  cities: { path: '/dashboard/cities', heading: 'Cities' },
  interest: { path: '/dashboard/interest', heading: 'Interests' },
  profile: { path: '/dashboard/profile', heading: 'My Profile' },
  users: { path: '/user-management/users', heading: 'Users' },
  waitlist: { path: '/user-management/waitlist', heading: 'Waitlist' },
  profileVerification: {
    path: '/user-management/profile-verification',
    heading: 'Profile verification',
  },
  adminUsers: { path: '/admin-users', heading: 'Admin Users' },
  reports: { path: '/reports', heading: 'Reports & Analytics' },
} as const;

/** Navigate to a route and assert its PageHeader <h1> is shown. */
export async function gotoAndExpectHeading(
  page: Page,
  route: { path: string; heading: string }
) {
  await page.goto(route.path);
  await expect(
    page.getByRole('heading', { level: 1, name: route.heading })
  ).toBeVisible();
}

/**
 * Fail the test if Next.js rendered its error overlay / a thrown client error
 * (the runtime "Unhandled Runtime Error" / "Application error" screens).
 */
export async function expectNoAppError(page: Page) {
  await expect(
    page.getByText(/Application error|Unhandled Runtime Error|client-side exception/i)
  ).toHaveCount(0);
}

/** A page-level table, if the page renders one. */
export function table(page: Page) {
  return page.getByRole('table');
}
