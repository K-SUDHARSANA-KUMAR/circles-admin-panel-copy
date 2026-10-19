import type { ContactId, IsoDateTime } from './common';

/**
 * Consent is stored per person, per channel, per purpose.
 *
 * Email purposes map to Gus's three consent purposes (marketing emails, event invites,
 * product updates). Push uses the same purposes, but consent comes from the device's
 * notification permission plus any in-app switch the person has turned off.
 */
export const PURPOSES = ['marketing', 'event_invites', 'product_updates'] as const;
export type Purpose = (typeof PURPOSES)[number];

export const CONSENT_CHANNELS = ['email', 'push'] as const;
export type ConsentChannel = (typeof CONSENT_CHANNELS)[number];

export const PURPOSE_LABELS: Record<Purpose, string> = {
  marketing: 'Marketing emails',
  event_invites: 'Event invites',
  product_updates: 'Product updates',
};

/**
 * Lawful basis for sending marketing to an individual.
 * - consent: they actively opted in (ticked a box, switched a setting on).
 * - soft_opt_in: PECR reg. 22(3). They gave their email while signing up to The Circles Club,
 *   were offered a clear way to refuse at that moment, and didn't. Only valid with evidence
 *   of the opt-out being offered (see SoftOptInEvidence).
 */
export type MarketingBasis = 'consent' | 'soft_opt_in';

export const CONSENT_SOURCES = [
  'signup', // app signup flow (email-entry screen)
  'settings', // in-app preferences screen
  'import', // CSV import with declared evidence
  'luma', // Luma registration form checkbox
  'website', // Framer form checkbox
  'unsubscribe_link', // one-click or visible unsubscribe in an email
  'device_permission', // OS notification permission (push only)
  'admin', // recorded by an admin, e.g. after a phone call or written request
  'inbound_request', // the person asked by email (logged by the inbox agent or an admin)
] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

export const CONSENT_METHODS = [
  'checkbox_opt_in', // ticked an unticked box
  'opt_out_not_ticked', // shown an opt-out box at signup and left it unticked (soft opt-in)
  'opt_out_ticked', // ticked the opt-out box at signup
  'settings_toggle',
  'one_click_unsubscribe', // RFC 8058 List-Unsubscribe-Post
  'unsubscribe_page', // visible link in the email footer
  'device_prompt',
  'import_declared',
  'admin_recorded',
] as const;
export type ConsentMethod = (typeof CONSENT_METHODS)[number];

export interface SoftOptInEvidence {
  /** When the opt-out was shown to them alongside the email field. */
  optOutOfferedAt: IsoDateTime;
  /** Where it was offered. Soft opt-in is only valid when collected during signup. */
  context: 'signup';
}

/** One row of the append-only consent ledger. Never edited; erased only on an erasure request. */
export interface ConsentRecord {
  id: string;
  contactId: ContactId;
  channel: ConsentChannel;
  purpose: Purpose;
  status: 'granted' | 'withdrawn';
  /** Required when status is 'granted' on the email channel. */
  basis?: MarketingBasis;
  source: ConsentSource;
  method: ConsentMethod;
  /** Version of the wording they saw, e.g. "signup-email-v1". See templates/consent/. */
  wordingVersion?: string;
  /** When the person did it (from the app, form or link). */
  capturedAt: IsoDateTime;
  /** When the CRM recorded it. */
  recordedAt: IsoDateTime;
  /** 'system' or an admin id. */
  recordedBy: string;
  evidence?: {
    softOptIn?: SoftOptInEvidence;
    appVersion?: string;
    formId?: string;
    importId?: string;
    lumaGuestId?: string;
    sendId?: string; // the email the unsubscribe came from
    note?: string;
  };
}

/** Current state for one channel+purpose, derived from the ledger. */
export interface PurposeConsent {
  status: 'granted' | 'withdrawn';
  basis?: MarketingBasis;
  at: IsoDateTime;
  source: ConsentSource;
  wordingVersion?: string;
  softOptIn?: SoftOptInEvidence;
}

export type ConsentState = {
  [C in ConsentChannel]?: Partial<Record<Purpose, PurposeConsent>>;
};

/**
 * Fold a ledger record into the current state. The latest capturedAt wins; on a tie,
 * a withdrawal wins (never resolve ambiguity in favour of sending).
 */
export function applyConsentRecord(state: ConsentState, record: ConsentRecord): ConsentState {
  const existing = state[record.channel]?.[record.purpose];
  if (existing) {
    const existingTime = Date.parse(existing.at);
    const incomingTime = Date.parse(record.capturedAt);
    if (incomingTime < existingTime) return state;
    if (incomingTime === existingTime && existing.status === 'withdrawn' && record.status === 'granted') {
      return state;
    }
  }
  const next: PurposeConsent = {
    status: record.status,
    at: record.capturedAt,
    source: record.source,
    ...(record.basis ? { basis: record.basis } : {}),
    ...(record.wordingVersion ? { wordingVersion: record.wordingVersion } : {}),
    ...(record.evidence?.softOptIn ? { softOptIn: record.evidence.softOptIn } : {}),
  };
  return {
    ...state,
    [record.channel]: { ...(state[record.channel] ?? {}), [record.purpose]: next },
  };
}

export function consentStateFromLedger(records: readonly ConsentRecord[]): ConsentState {
  return [...records]
    .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt))
    .reduce<ConsentState>((state, r) => applyConsentRecord(state, r), {});
}
