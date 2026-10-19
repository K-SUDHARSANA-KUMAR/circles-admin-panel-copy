import type { AppUserId, ContactId, IsoDateTime, OrganisationId } from './common';
import type { MemberTier } from './contact';

/** A Luma event, mirrored for segments and timelines. The guest list itself stays in Luma. */
export interface LumaEvent {
  id: string;
  lumaId: string;
  name: string;
  startsAt: IsoDateTime;
  kind: 'members_evening' | 'partner_event' | 'other';
  venueOrgId?: OrganisationId;
  url: string;
  ticketTypes: { id: string; name: string; priceGbp: number }[];
}

export interface Registration {
  id: string;
  lumaEventId: string;
  lumaGuestId: string;
  contactId?: ContactId;
  status: 'registered' | 'approved' | 'waitlist' | 'cancelled' | 'refunded';
  ticketTypeId?: string;
  registeredAt: IsoDateTime;
  checkedInAt?: IsoDateTime;
  /**
   * When Luma sent the latest change we applied. Luma doesn't promise to deliver in order, so an
   * older change arriving later never overwrites the status.
   */
  lumaUpdatedAt?: IsoDateTime;
  amountPaidPence?: number;
  refundedPence?: number;
  /** Collaborator or personal code used at checkout. */
  couponCode?: string;
  /** Booked through the app by the club's backend. */
  inAppTicket?: boolean;
  /** Answer to the luma-v1 consent question, if asked. */
  consentAnswer?: boolean;
  matchedBy?: 'email' | 'phone' | 'app_tap' | 'app_ticket' | 'manual';
}

/**
 * Live app data for a user, read from the app's own records each time a contact is opened.
 * The CRM never stores this; see Signals for the small read-only summary it does keep.
 */
export interface AppProfile {
  appUserId: AppUserId;
  status: 'active' | 'suspended' | 'deleted';
  joinedAt: IsoDateTime;
  verifiedAt?: IsoDateTime;
  invitedBy?: { appUserId: AppUserId; name: string };
  friends: { appUserId: AppUserId; name: string }[];
  plans: { id: string; title: string; at: IsoDateTime; withFriends: number }[];
  eventsAttended: { name: string; at: IsoDateTime }[];
  interests: string[];
  city?: string;
  foundingBadge: boolean;
  lastActiveAt?: IsoDateTime;
  pushEnabled: boolean;
}

/** Live subscription data from RevenueCat (and the app-granted free period). */
export interface SubscriptionInfo {
  revenueCatId: string;
  freePeriod?: { startedAt: IsoDateTime; endsAt: IsoDateTime };
  status: 'free_period' | 'active' | 'cancelled_active' | 'billing_issue' | 'expired' | 'none';
  tier: MemberTier | null;
  store?: 'app_store' | 'play_store';
  productId?: string;
  priceGbp?: number;
  expiresAt?: IsoDateTime;
  willRenew?: boolean;
  since?: IsoDateTime;
}

/** A Luma guest (or form entry) the CRM couldn't confidently match to a person. */
export interface MatchQueueItem {
  id: string;
  kind: 'luma_guest';
  lumaEventId: string;
  lumaGuestId: string;
  name: string;
  email?: string;
  phone?: string;
  /** Contacts that might be them, best first. */
  suggestions: ContactId[];
  createdAt: IsoDateTime;
  resolvedAt?: IsoDateTime;
  /** The contact they were linked to, or 'new' if a new contact was created. */
  resolvedTo?: ContactId | 'new';
  resolvedBy?: string;
}

/** One CSV import, for the record (who, when, what, and the consent evidence declared). */
export interface ImportRecord {
  id: string;
  fileName: string;
  createdBy: string;
  createdAt: IsoDateTime;
  rows: number;
  created: number;
  updated: number;
  skipped: number;
  duplicatesInFile: number;
  consentGranted: number;
  sourceDetail: string;
  evidence?: { wordingVersion: string; capturedAt: IsoDateTime; description: string };
}
