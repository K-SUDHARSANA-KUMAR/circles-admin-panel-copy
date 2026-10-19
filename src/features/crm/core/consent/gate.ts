/**
 * THE SEND GATE.
 *
 * Exactly one function decides whether an email or push may go to a contact, and it runs at
 * the moment of sending (not when someone enters an automation). It is pure: every fact it
 * needs is loaded fresh by the SendService and passed in, so it can be tested exhaustively.
 *
 * Order of checks:
 *   1. Pause all sending is off
 *   2. Not already sent (idempotency key)
 *   3. Contact exists, isn't merged or closed
 *   4. Not on the suppression list for everything
 *   5. Message-class rules (transactional has no marketing content; marketing needs a lawful
 *      basis for the purpose; business outreach only to business addresses)
 *   6. A usable address or device
 *   7. Under the frequency cap (marketing only)
 *   8. Outside quiet hours in the recipient's time zone
 */
import { isBusinessRecipient } from '../contacts/addressKind';
import type { IsoDateTime } from '../model/common';
import { primaryEmail, isClosed, isNotApproved, type Contact } from '../model/contact';
import type { MarketingBasis } from '../model/consent';
import type { SendRecord, SendRequest } from '../model/message';
import { FINAL_OR_IN_FLIGHT } from '../model/sendStatus';
import type { KillSwitches, SendingSettings } from '../model/settings';
import type { SuppressionScope } from '../model/suppression';
import { checkFrequencyCap } from '../sending/frequencyCap';
import { nextAllowedTime } from '../sending/quietHours';
import { resolveTimeZone } from '../sending/timezone';
import { findMarketingContent } from './marketingContent';

export const BLOCK_REASONS = {
  paused: 'Pause all sending is on',
  already_sent: 'Already sent for this occasion',
  contact_not_found: 'Contact not found',
  contact_merged: 'Contact was merged into another record',
  contact_closed: 'Account closed or suspended',
  suppressed: 'On the suppression list (all messages)',
  suppressed_marketing: 'Unsubscribed from marketing',
  opted_out_business: 'Opted out of business emails',
  missing_content: 'Nothing to send for this channel',
  missing_purpose: 'Marketing message has no purpose set',
  transactional_contains_marketing: 'Service message contains marketing content',
  not_approved: 'Application not approved: service messages only',
  no_lawful_basis: 'No consent or soft opt-in on record for this purpose',
  invalid_soft_opt_in: 'Soft opt-in on record is missing the opt-out evidence',
  push_not_permitted: 'Notifications not allowed on their phone',
  push_purpose_switched_off: 'They switched this type of notification off in the app',
  business_push_not_allowed: 'Business outreach is email only',
  business_to_individual: 'Personal address or sole trader: treated as an individual',
  no_email_address: 'No email address',
  no_push_token: 'No device to send to',
  frequency_cap: 'Weekly limit reached and no slot within the allowed delay',
  expired: 'Too late: the next allowed time is after this message expires',
} as const;
export type BlockReason = keyof typeof BLOCK_REASONS;

export type GateBasis = MarketingBasis | 'transactional' | 'business_outreach';

export type GateDecision =
  | {
      outcome: 'send';
      basis: GateBasis;
      recipientEmail?: string;
      /** For marketing: the cap the SendLog must enforce atomically when claiming. */
      capCheck?: { max: number; since: IsoDateTime };
    }
  | { outcome: 'defer'; reason: 'quiet_hours' | 'frequency_cap'; until: Date; basis: GateBasis }
  | { outcome: 'block'; reason: BlockReason; detail?: string };

export interface GateFacts {
  now: Date;
  /** Idempotency key for this send; also used to spread held messages. */
  sendKey: string;
  request: SendRequest;
  /** Read fresh for this send. */
  killSwitches: KillSwitches;
  settings: SendingSettings;
  contact: Contact | undefined;
  /** Scopes of any suppression entries matching the contact's email, phone or app user. */
  suppressedScopes: readonly SuppressionScope[];
  existingSend: SendRecord | undefined;
  /** Times of this contact's counted marketing sends on this channel within the cap window. */
  countedSendTimes: readonly IsoDateTime[];
  pushTokenCount: number;
}

const block = (reason: BlockReason, detail?: string): GateDecision =>
  detail === undefined ? { outcome: 'block', reason } : { outcome: 'block', reason, detail };

export function evaluateGate(f: GateFacts): GateDecision {
  const { request, contact, settings } = f;

  // 1. Kill switch.
  if (f.killSwitches.pauseAllSending) return block('paused');

  // 2. Idempotency.
  if (f.existingSend && FINAL_OR_IN_FLIGHT.has(f.existingSend.status)) return block('already_sent', f.existingSend.status);

  // 3. Contact.
  if (!contact) return block('contact_not_found');
  if (contact.mergedInto) return block('contact_merged');
  if (isClosed(contact)) return block('contact_closed');

  // 4. Global suppression. Nothing overrides it.
  if (f.suppressedScopes.includes('all')) return block('suppressed');

  // 5. Message-class rules.
  if (request.channel === 'email' && !request.email) return block('missing_content');
  if (request.channel === 'push' && !request.push) return block('missing_content');

  let basis: GateBasis;
  switch (request.messageClass) {
    case 'transactional': {
      const findings = findMarketingContent({
        texts: [request.email?.subject, request.email?.preheader, request.email?.text, request.email?.html, request.push?.title, request.push?.body],
        links: [...(request.email?.links ?? []), ...(request.push?.link ? [request.push.link] : [])],
      });
      if (findings.length > 0) return block('transactional_contains_marketing', findings.map((x) => x.match).join(', '));
      basis = 'transactional';
      break;
    }
    case 'marketing': {
      if (!request.purpose) return block('missing_purpose');
      if (f.suppressedScopes.includes('marketing')) return block('suppressed_marketing');
      if (isNotApproved(contact)) return block('not_approved');
      if (request.channel === 'email') {
        const consent = contact.consent.email?.[request.purpose];
        if (!consent || consent.status !== 'granted' || !consent.basis) return block('no_lawful_basis');
        if (consent.basis === 'soft_opt_in') {
          const ev = consent.softOptIn;
          if (!ev || ev.context !== 'signup' || consent.source !== 'signup' || !ev.optOutOfferedAt) return block('invalid_soft_opt_in');
        }
        basis = consent.basis;
      } else {
        // Push: the phone's notification permission is the consent, plus any in-app switch.
        if (contact.signals.pushEnabled !== true) return block('push_not_permitted');
        if (contact.consent.push?.[request.purpose]?.status === 'withdrawn') return block('push_purpose_switched_off');
        basis = 'consent';
      }
      break;
    }
    case 'business': {
      if (request.channel !== 'email') return block('business_push_not_allowed');
      if (f.suppressedScopes.includes('marketing')) return block('opted_out_business');
      if (!isBusinessRecipient(contact, primaryEmail(contact))) return block('business_to_individual');
      basis = 'business_outreach';
      break;
    }
  }

  // 6. Address or device.
  let recipientEmail: string | undefined;
  if (request.channel === 'email') {
    recipientEmail = primaryEmail(contact)?.address;
    if (!recipientEmail) return block('no_email_address');
  } else {
    if (contact.signals.pushEnabled !== true) return block('push_not_permitted');
    if (f.pushTokenCount === 0) return block('no_push_token');
  }

  // 7. Frequency cap (marketing only, per channel).
  let earliest = f.now;
  let deferReason: 'quiet_hours' | 'frequency_cap' = 'quiet_hours';
  let capCheck: { max: number; since: IsoDateTime } | undefined;
  if (request.messageClass === 'marketing') {
    const cap = settings.frequencyCap[request.channel];
    capCheck = { max: cap.max, since: new Date(f.now.getTime() - cap.windowDays * 86_400_000).toISOString() };
    const status = checkFrequencyCap(f.now, f.countedSendTimes, cap);
    if (!status.underCap && status.freesAt) {
      const limit = f.now.getTime() + settings.frequencyCap.maxDeferDays * 86_400_000;
      if (status.freesAt.getTime() > limit) return block('frequency_cap', `${status.count} sent in the last ${cap.windowDays} days`);
      earliest = status.freesAt;
      deferReason = 'frequency_cap';
    }
  }

  // 8. Quiet hours in the recipient's time zone.
  const timeZone = resolveTimeZone(contact.timezone, settings.defaultTimezone);
  const graceMs = settings.quietHours.contactActionGraceMinutes * 60_000;
  const exemptFromQuietHours =
    request.messageClass === 'transactional' &&
    request.respondsToContactActionAt !== undefined &&
    f.now.getTime() - Date.parse(request.respondsToContactActionAt) <= graceMs &&
    earliest.getTime() === f.now.getTime();
  const allowedAt = exemptFromQuietHours ? earliest : nextAllowedTime(earliest, timeZone, settings.quietHours, f.sendKey);

  if (allowedAt.getTime() > f.now.getTime()) {
    if (request.expiresAt && allowedAt.getTime() > Date.parse(request.expiresAt)) {
      return block('expired', `next allowed ${allowedAt.toISOString()}`);
    }
    return { outcome: 'defer', reason: deferReason, until: allowedAt, basis };
  }

  return {
    outcome: 'send',
    basis,
    ...(recipientEmail ? { recipientEmail } : {}),
    ...(capCheck ? { capCheck } : {}),
  };
}

export function describeBlockReason(reason: BlockReason): string {
  return BLOCK_REASONS[reason];
}
