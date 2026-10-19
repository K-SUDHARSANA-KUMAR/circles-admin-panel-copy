/**
 * The field catalogue: every contact, app and subscription field the segment builder can filter
 * on, with a plain-English label and the operators that make sense for it.
 */
import { CONTACT_TYPES, CONTACT_TYPE_LABELS, LIFECYCLE_LABELS, LIFECYCLE_STAGES, type Contact } from '../model/contact';
import type { Operator } from '../model/segment';

export type FieldType = 'enum' | 'text' | 'number' | 'date' | 'boolean' | 'list';

export interface FieldDef {
  id: string;
  label: string;
  group: 'Who they are' | 'In the app' | 'Membership' | 'Emails and consent' | 'Relationship';
  type: FieldType;
  options?: { value: string; label: string }[];
  /** Read the value from a contact. Lists return string[]; dates return ISO strings. */
  get(c: Contact): unknown;
}

export const OPERATORS_BY_TYPE: Record<FieldType, Operator[]> = {
  enum: ['is', 'is_not', 'is_any_of', 'is_none_of', 'is_set', 'is_not_set'],
  text: ['is', 'is_not', 'contains', 'not_contains', 'is_set', 'is_not_set'],
  number: ['is', 'gt', 'gte', 'lt', 'lte'],
  date: ['in_last_days', 'more_than_days_ago', 'in_next_days', 'is_set', 'is_not_set'],
  boolean: ['is_true', 'is_false'],
  list: ['includes', 'excludes', 'is_set', 'is_not_set'],
};

export const OPERATOR_LABELS: Record<Operator, string> = {
  is: 'is',
  is_not: 'is not',
  is_any_of: 'is any of',
  is_none_of: 'is none of',
  contains: 'contains',
  not_contains: 'doesn’t contain',
  includes: 'includes',
  excludes: 'doesn’t include',
  gt: 'is more than',
  gte: 'is at least',
  lt: 'is less than',
  lte: 'is at most',
  is_set: 'is known',
  is_not_set: 'is empty',
  is_true: 'is yes',
  is_false: 'is no',
  in_last_days: 'in the last',
  more_than_days_ago: 'more than … days ago',
  in_next_days: 'in the next',
};

const opts = (values: readonly string[], labels?: Record<string, string>) => values.map((v) => ({ value: v, label: labels?.[v] ?? v }));
const consentValue = (c: Contact, purpose: 'marketing' | 'event_invites' | 'product_updates') => c.consent.email?.[purpose]?.status ?? 'none';

export const FIELDS: FieldDef[] = [
  { id: 'lifecycle.stage', label: 'Lifecycle stage', group: 'Membership', type: 'enum', options: opts(LIFECYCLE_STAGES, LIFECYCLE_LABELS), get: (c) => c.lifecycle?.stage },
  { id: 'lifecycle.since', label: 'In this stage since', group: 'Membership', type: 'date', get: (c) => c.lifecycle?.since },
  { id: 'types', label: 'Contact type', group: 'Who they are', type: 'list', options: opts(CONTACT_TYPES, CONTACT_TYPE_LABELS), get: (c) => c.types },
  { id: 'tags', label: 'Tags', group: 'Who they are', type: 'list', get: (c) => c.tags },
  { id: 'signals.city', label: 'City', group: 'Who they are', type: 'text', get: (c) => c.signals.city },
  { id: 'signals.interests', label: 'Interests', group: 'Who they are', type: 'list', get: (c) => c.signals.interests ?? [] },
  {
    id: 'source.channel',
    label: 'Came from',
    group: 'Who they are',
    type: 'enum',
    options: opts(['app', 'website', 'luma', 'import', 'inbound_email', 'manual'], { app: 'The app', website: 'Website', luma: 'Luma', import: 'Import', inbound_email: 'Emailed in', manual: 'Added by hand' }),
    get: (c) => c.source.channel,
  },
  {
    id: 'dropOff.point',
    label: 'Where they stopped',
    group: 'In the app',
    type: 'enum',
    options: opts(['signup_started', 'signup_step', 'application_started', 'website_lead', 'luma_registration'], {
      signup_started: 'Started signup',
      signup_step: 'Part-way through signup',
      application_started: 'Started the application',
      website_lead: 'Left email on website',
      luma_registration: 'Registered on Luma',
    }),
    get: (c) => c.dropOff?.point,
  },
  { id: 'dropOff.at', label: 'Stopped on', group: 'In the app', type: 'date', get: (c) => c.dropOff?.at },
  { id: 'signals.joinedAt', label: 'Signed up', group: 'In the app', type: 'date', get: (c) => c.signals.joinedAt },
  { id: 'signals.verifiedAt', label: 'Verified', group: 'In the app', type: 'date', get: (c) => c.signals.verifiedAt },
  { id: 'signals.lastActiveAt', label: 'Last used the app', group: 'In the app', type: 'date', get: (c) => c.signals.lastActiveAt },
  { id: 'signals.friendsCount', label: 'Friends', group: 'In the app', type: 'number', get: (c) => c.signals.friendsCount ?? 0 },
  { id: 'signals.plansCount', label: 'Plans made', group: 'In the app', type: 'number', get: (c) => c.signals.plansCount ?? 0 },
  { id: 'signals.plansWithFriendsCount', label: 'Plans with friends', group: 'In the app', type: 'number', get: (c) => c.signals.plansWithFriendsCount ?? 0 },
  { id: 'signals.invitedJoined', label: 'People they brought in', group: 'In the app', type: 'number', get: (c) => c.signals.invitedJoined ?? 0 },
  { id: 'signals.eventsAttended', label: 'Events attended', group: 'In the app', type: 'number', get: (c) => c.signals.eventsAttended ?? 0 },
  { id: 'signals.lastEventAt', label: 'Last event', group: 'In the app', type: 'date', get: (c) => c.signals.lastEventAt },
  { id: 'signals.pushEnabled', label: 'Notifications allowed', group: 'In the app', type: 'boolean', get: (c) => c.signals.pushEnabled ?? false },
  { id: 'signals.freePeriod.endsAt', label: 'Free months end', group: 'Membership', type: 'date', get: (c) => c.signals.freePeriod?.endsAt },
  {
    id: 'signals.subscription.status',
    label: 'Subscription',
    group: 'Membership',
    type: 'enum',
    options: opts(['active', 'cancelled_active', 'billing_issue', 'expired', 'none'], {
      active: 'Paying',
      cancelled_active: 'Cancelled (still active)',
      billing_issue: 'Payment problem',
      expired: 'Expired',
      none: 'Not subscribed',
    }),
    get: (c) => c.signals.subscription?.status ?? 'none',
  },
  {
    id: 'signals.subscription.tier',
    label: 'Member tier',
    group: 'Membership',
    type: 'enum',
    options: opts(['founding', 'member'], { founding: 'Founding Member', member: 'Member' }),
    get: (c) => c.signals.subscription?.tier ?? undefined,
  },
  {
    id: 'consent.email.marketing',
    label: 'Marketing emails',
    group: 'Emails and consent',
    type: 'enum',
    options: opts(['granted', 'withdrawn', 'none'], { granted: 'Agreed', withdrawn: 'Said no', none: 'Not asked' }),
    get: (c) => consentValue(c, 'marketing'),
  },
  {
    id: 'consent.email.event_invites',
    label: 'Event invites',
    group: 'Emails and consent',
    type: 'enum',
    options: opts(['granted', 'withdrawn', 'none'], { granted: 'Agreed', withdrawn: 'Said no', none: 'Not asked' }),
    get: (c) => consentValue(c, 'event_invites'),
  },
  {
    id: 'consent.email.product_updates',
    label: 'Product updates',
    group: 'Emails and consent',
    type: 'enum',
    options: opts(['granted', 'withdrawn', 'none'], { granted: 'Agreed', withdrawn: 'Said no', none: 'Not asked' }),
    get: (c) => consentValue(c, 'product_updates'),
  },
  { id: 'ownerId', label: 'Owner', group: 'Relationship', type: 'text', get: (c) => c.ownerId },
  { id: 'nextFollowUpAt', label: 'Next follow-up', group: 'Relationship', type: 'date', get: (c) => c.nextFollowUpAt },
  { id: 'lastContactedAt', label: 'Last contacted', group: 'Relationship', type: 'date', get: (c) => c.lastContactedAt },
];

export const FIELD_BY_ID: ReadonlyMap<string, FieldDef> = new Map(FIELDS.map((f) => [f.id, f]));
