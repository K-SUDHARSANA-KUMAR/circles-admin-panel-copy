/**
 * The member lifecycle, set automatically from app and RevenueCat data. Never edited by hand.
 *
 *   Prospect   known to us, no application yet
 *   Applicant  application submitted, waiting (or rejected: flag not_approved)
 *   Verified   approved, free months not started (should be momentary)
 *   Trial      in the free 3 months (starts automatically on verification, no card)
 *   Member     paying
 *   Guest      verified, free months over, never paid
 *   At risk    Trial or Member and: cancelled, payment problem, or no app use for N days
 *   Lapsed     was paying, subscription expired
 *
 * Partners, investors, press etc. who aren't app users have no lifecycle (null).
 */
import type { Contact, ContactType, LifecycleFlag, LifecycleStage, Signals } from '../model/contact';
import { LIFECYCLE_DERIVED_TYPES } from '../model/contact';

export interface LifecycleSettings {
  /** No app activity for this many days puts a Trial or Member at risk. Default 14. */
  atRiskInactiveDays: number;
}

export const DEFAULT_LIFECYCLE_SETTINGS: LifecycleSettings = { atRiskInactiveDays: 14 };

const DAY = 86_400_000;
const PAYING = new Set(['active', 'cancelled_active', 'billing_issue']);

export function deriveLifecycle(s: Signals, now: Date, settings: LifecycleSettings = DEFAULT_LIFECYCLE_SETTINGS): { stage: LifecycleStage; flags: LifecycleFlag[] } {
  const flags: LifecycleFlag[] = [];
  if (s.accountStatus === 'suspended' || s.accountStatus === 'deleted') flags.push('closed');
  const sub = s.subscription;
  const inactive = !!s.lastActiveAt && now.getTime() - Date.parse(s.lastActiveAt) >= settings.atRiskInactiveDays * DAY;

  if (s.application?.decision === 'rejected') return { stage: 'Applicant', flags: [...flags, 'not_approved'] };
  if (sub && PAYING.has(sub.status)) return { stage: sub.status !== 'active' || inactive ? 'AtRisk' : 'Member', flags };
  if (sub?.status === 'expired' && sub.everPaid) return { stage: 'Lapsed', flags };

  const verified = !!s.verifiedAt || s.application?.decision === 'approved';
  if (verified) {
    if (s.freePeriod && now.getTime() < Date.parse(s.freePeriod.endsAt)) return { stage: inactive ? 'AtRisk' : 'Trial', flags };
    if (s.freePeriod) return { stage: 'Guest', flags };
    return { stage: 'Verified', flags };
  }
  if (s.application?.submittedAt) return { stage: 'Applicant', flags };
  return { stage: 'Prospect', flags };
}

export function typeForStage(stage: LifecycleStage, s: Signals): ContactType {
  switch (stage) {
    case 'Prospect':
      return 'Prospect';
    case 'Applicant':
      return 'Applicant';
    case 'Verified':
    case 'Trial':
      return 'Trial';
    case 'Member':
      return 'Member';
    case 'AtRisk':
      return s.subscription && PAYING.has(s.subscription.status) ? 'Member' : 'Trial';
    case 'Guest':
    case 'Lapsed':
      return 'Guest';
  }
}

export interface LifecycleChange {
  from: LifecycleStage;
  to: LifecycleStage;
}

/**
 * Recompute a contact's lifecycle. Returns the updated contact and what changed (if anything).
 * Relationship types (Investor, Press…) are kept; only the lifecycle-derived type is replaced.
 */
export function applyLifecycle(contact: Contact, now: Date, settings: LifecycleSettings = DEFAULT_LIFECYCLE_SETTINGS): { contact: Contact; change?: LifecycleChange } {
  if (!contact.lifecycle) return { contact };
  const next = deriveLifecycle(contact.signals, now, settings);
  const sameFlags = next.flags.length === contact.lifecycle.flags.length && next.flags.every((f) => contact.lifecycle!.flags.includes(f));
  const type = typeForStage(next.stage, contact.signals);
  const types = [type, ...contact.types.filter((t) => !LIFECYCLE_DERIVED_TYPES.includes(t))];
  const sameTypes = types.length === contact.types.length && types.every((t) => contact.types.includes(t));
  if (next.stage === contact.lifecycle.stage && sameFlags && sameTypes) return { contact };
  const changed = next.stage !== contact.lifecycle.stage;
  return {
    contact: {
      ...contact,
      types,
      lifecycle: { stage: next.stage, flags: next.flags, since: changed ? now.toISOString() : contact.lifecycle.since },
      updatedAt: now.toISOString(),
    },
    ...(changed ? { change: { from: contact.lifecycle.stage, to: next.stage } } : {}),
  };
}
