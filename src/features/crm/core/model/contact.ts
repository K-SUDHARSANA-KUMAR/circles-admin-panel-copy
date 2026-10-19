import type { AdminId, AppUserId, ContactId, IsoDateTime, OrganisationId } from './common';
import type { ConsentState } from './consent';

/** Relationship types. A contact can have several. */
export const CONTACT_TYPES = [
  'Prospect',
  'Applicant',
  'Trial',
  'Member',
  'Guest',
  'VenuePartner',
  'BrandPartner',
  'Investor',
  'Press',
  'Creator',
  'Other',
] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

/** Types that the lifecycle rules set automatically for app users. */
export const LIFECYCLE_DERIVED_TYPES: readonly ContactType[] = ['Prospect', 'Applicant', 'Trial', 'Member', 'Guest'];

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  Prospect: 'Prospect',
  Applicant: 'Applicant',
  Trial: 'Trial',
  Member: 'Member',
  Guest: 'Guest',
  VenuePartner: 'Venue partner',
  BrandPartner: 'Brand partner',
  Investor: 'Investor',
  Press: 'Press',
  Creator: 'Creator',
  Other: 'Other',
};

/** Member lifecycle, set automatically from app and RevenueCat data. Never edited by hand. */
export const LIFECYCLE_STAGES = [
  'Prospect',
  'Applicant',
  'Verified',
  'Trial',
  'Member',
  'Guest',
  'AtRisk',
  'Lapsed',
] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  Prospect: 'Prospect',
  Applicant: 'Applicant',
  Verified: 'Verified',
  Trial: 'Trial (free 3 months)',
  Member: 'Member',
  Guest: 'Guest',
  AtRisk: 'At risk',
  Lapsed: 'Lapsed',
};

export type LifecycleFlag = 'not_approved' | 'closed';

export interface Lifecycle {
  stage: LifecycleStage;
  since: IsoDateTime;
  flags: LifecycleFlag[];
}

export interface EmailAddress {
  address: string;
  /** Lower-cased and trimmed. Used for matching and suppression hashing. */
  normalised: string;
  /** 'business' = a company domain; 'personal' = Gmail, iCloud etc. See contacts/addressKind.ts. */
  kind: 'personal' | 'business';
  primary: boolean;
}

export interface PhoneNumber {
  /** International format, e.g. +447700900123. */
  e164: string;
  primary: boolean;
}

export type ContactSourceChannel = 'app' | 'website' | 'luma' | 'import' | 'inbound_email' | 'manual';

export interface ContactSource {
  channel: ContactSourceChannel;
  detail?: string;
  capturedAt: IsoDateTime;
}

/** Where a prospect stopped. */
export interface DropOff {
  point:
    | 'signup_started'
    | 'signup_step'
    | 'application_started'
    | 'website_lead'
    | 'luma_registration'
    | 'other';
  lastStep?: string;
  at: IsoDateTime;
}

export type MemberTier = 'founding' | 'member';

/**
 * A small read-only summary of app and subscription data, used only so segments and
 * automations are fast and cheap. Refreshed by events and rebuilt nightly from the source.
 * The app's data always wins; nothing in the CRM edits these fields.
 */
export interface Signals {
  /** Created an account in the app (finished signup). */
  hasAccount?: boolean;
  /** Last signup step reached, for people who stopped part-way. */
  signupStep?: string;
  application?: { submittedAt?: IsoDateTime; decision?: 'approved' | 'rejected' | 'on_hold'; decidedAt?: IsoDateTime };
  accountStatus?: 'active' | 'suspended' | 'deleted';
  /** Founding Member badge on their app profile. */
  foundingBadge?: boolean;
  /** The collaborator (or invite) code they signed up with, upper case. The first one sticks. */
  signupCode?: string;
  /** Recent taps on "Register" for a Luma event in the app, used to match the Luma registration. */
  lumaTaps?: { lumaEventId: string; at: IsoDateTime }[];
  joinedAt?: IsoDateTime;
  verifiedAt?: IsoDateTime;
  lastActiveAt?: IsoDateTime;
  city?: string;
  interests?: string[];
  friendsCount?: number;
  plansCount?: number;
  plansWithFriendsCount?: number;
  eventsAttended?: number;
  lastEventAt?: IsoDateTime;
  invitedJoined?: number;
  invitedActive?: number;
  inviterContactId?: ContactId;
  /** Device notification permission (any of their devices). */
  pushEnabled?: boolean;
  /** The free 3 months, granted automatically on verification. No card taken. */
  freePeriod?: { startedAt: IsoDateTime; endsAt: IsoDateTime };
  subscription?: {
    status: 'active' | 'cancelled_active' | 'billing_issue' | 'expired' | 'none';
    tier: MemberTier | null;
    expiresAt?: IsoDateTime;
    willRenew?: boolean;
    store?: 'app_store' | 'play_store' | 'web' | 'promotional';
    everPaid?: boolean;
    /** When they first started paying. */
    startedAt?: IsoDateTime;
  };
}

export interface Contact {
  id: ContactId;
  name: { first: string; last?: string };
  emails: EmailAddress[];
  phones: PhoneNumber[];
  types: ContactType[];
  lifecycle: Lifecycle | null;
  appUserId?: AppUserId;
  revenueCatId?: string;
  orgIds: OrganisationId[];
  jobTitle?: string;
  /** Sole traders and anyone using a personal address are treated as individuals for consent. */
  treatAsIndividual: boolean;
  ownerId?: AdminId;
  tags: string[];
  nextFollowUpAt?: IsoDateTime;
  lastContactedAt?: IsoDateTime;
  lastReplyAt?: IsoDateTime;
  source: ContactSource;
  dropOff?: DropOff;
  /** IANA time zone, e.g. "Europe/London". From the app profile; default Europe/London. */
  timezone: string;
  /** Current consent state. The full history lives in the consent ledger. */
  consent: ConsentState;
  signals: Signals;
  /** Live segments the contact is in (used to fire "joins segment" triggers). */
  segmentIds: string[];
  /** Investors and anything else only the Owner may see. */
  ownerOnly: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  /** Set when this record was merged into another; the record is then read-only. */
  mergedInto?: ContactId;
}

export function primaryEmail(contact: Contact): EmailAddress | undefined {
  return contact.emails.find((e) => e.primary) ?? contact.emails[0];
}

export function primaryPhone(contact: Contact): PhoneNumber | undefined {
  return contact.phones.find((p) => p.primary) ?? contact.phones[0];
}

export function displayName(contact: Pick<Contact, 'name'>): string {
  return [contact.name.first, contact.name.last].filter(Boolean).join(' ');
}

export function isClosed(contact: Contact): boolean {
  return contact.lifecycle?.flags.includes('closed') ?? false;
}

export function isNotApproved(contact: Contact): boolean {
  return contact.lifecycle?.flags.includes('not_approved') ?? false;
}
