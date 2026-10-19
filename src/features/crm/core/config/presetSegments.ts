import type { Segment } from '../model/segment';

const at = '2026-10-01T00:00:00.000Z';
const preset = (s: Omit<Segment, 'countHistory' | 'createdBy' | 'createdAt' | 'updatedAt'>): Segment => ({
  ...s,
  countHistory: [],
  createdBy: 'system',
  createdAt: at,
  updatedAt: at,
});

/** Day-one segments, including the four examples from Gus's brief. All editable. */
export const PRESET_SEGMENTS: Segment[] = [
  preset({
    id: 'seg_signup_unfinished',
    name: 'Started signup, didn’t finish',
    description: 'Prospects who began signing up or applying and stopped.',
    pinned: true,
    filter: {
      match: 'all',
      conditions: [
        { field: 'lifecycle.stage', op: 'is', value: 'Prospect' },
        { field: 'dropOff.point', op: 'is_any_of', value: ['signup_started', 'signup_step', 'application_started'] },
      ],
    },
  }),
  preset({
    id: 'seg_free_ending_7',
    name: 'Free months end in the next 7 days',
    pinned: true,
    filter: {
      match: 'all',
      conditions: [
        { field: 'lifecycle.stage', op: 'is_any_of', value: ['Trial', 'AtRisk'] },
        { field: 'signals.freePeriod.endsAt', op: 'in_next_days', value: 7 },
      ],
    },
  }),
  preset({
    id: 'seg_guest_30_event',
    name: 'Guest for 30+ days, came to an event',
    pinned: true,
    filter: {
      match: 'all',
      conditions: [
        { field: 'lifecycle.stage', op: 'is', value: 'Guest' },
        { field: 'lifecycle.since', op: 'more_than_days_ago', value: 30 },
        { field: 'signals.eventsAttended', op: 'gte', value: 1 },
      ],
    },
  }),
  preset({
    id: 'seg_tennis_london',
    name: 'Interest is tennis, lives in London',
    pinned: true,
    filter: {
      match: 'all',
      conditions: [
        { field: 'signals.interests', op: 'includes', value: 'tennis' },
        { field: 'signals.city', op: 'is', value: 'London' },
      ],
    },
  }),
  preset({
    id: 'seg_active_guests',
    name: 'Active guests',
    description: 'Guests who’ve used the app in the last 14 days or come to an event. Used by Guest to member.',
    pinned: false,
    filter: {
      match: 'all',
      conditions: [
        { field: 'lifecycle.stage', op: 'is', value: 'Guest' },
        {
          match: 'any',
          conditions: [
            { field: 'signals.lastActiveAt', op: 'in_last_days', value: 14 },
            { field: 'signals.eventsAttended', op: 'gte', value: 1 },
          ],
        },
      ],
    },
  }),
  preset({
    id: 'seg_at_risk',
    name: 'Members at risk',
    description: 'Cancelled, payment problem, or quiet for 14+ days.',
    pinned: true,
    filter: { match: 'all', conditions: [{ field: 'lifecycle.stage', op: 'is', value: 'AtRisk' }] },
  }),
  preset({
    id: 'seg_london_app',
    name: 'Londoners on the app',
    description: 'Used for the Thursday invite.',
    pinned: false,
    filter: {
      match: 'all',
      conditions: [
        { field: 'signals.city', op: 'is', value: 'London' },
        { field: 'lifecycle.stage', op: 'is_any_of', value: ['Trial', 'Member', 'Guest', 'AtRisk'] },
      ],
    },
  }),
];
