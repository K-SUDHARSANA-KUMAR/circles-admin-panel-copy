import type { AutomationId, ContactId, IsoDateTime, TemplateId } from './common';
import type { MarketingBasis, Purpose } from './consent';

/**
 * Every message belongs to exactly one class. The send gate enforces the rules for each.
 *
 * - transactional: account, verification result, billing issue, booking confirmation.
 *   No marketing consent needed, and no marketing content allowed.
 * - marketing: to individuals. Needs consent or a valid soft opt-in for the purpose.
 * - business: outreach to partners, press and investors at company addresses. Allowed
 *   without consent, with an opt-out in every email that's honoured.
 */
export const MESSAGE_CLASSES = ['transactional', 'marketing', 'business'] as const;
export type MessageClass = (typeof MESSAGE_CLASSES)[number];

export const MESSAGE_CLASS_LABELS: Record<MessageClass, string> = {
  transactional: 'Transactional (service message)',
  marketing: 'Marketing',
  business: 'Business outreach',
};

export type Channel = 'email' | 'push';

/** What actually goes out, after the template has been rendered for this person. */
export interface RenderedEmail {
  subject: string;
  preheader?: string;
  /** Plain-text body. Always present; HTML is optional. */
  text: string;
  html?: string;
  layout: 'branded' | 'plain';
  /** Every URL in the message, for the transactional-content check and click tracking. */
  links: string[];
}

export interface RenderedPush {
  title: string;
  body: string;
  /** Deep link opened when the notification is tapped. */
  link?: string;
}

export interface SendRequest {
  contactId: ContactId;
  channel: Channel;
  messageClass: MessageClass;
  /** Required for marketing; recorded for the others. */
  purpose?: Purpose;
  templateId: TemplateId;
  templateVersion: number;
  automationId?: AutomationId;
  automationVersion?: number;
  stepId?: string;
  /**
   * Identifies the occasion this message is for, e.g. the trigger event id, or
   * "trial-ends-2027-01-14". Together with automation, step, contact and channel it forms
   * the idempotency key, so the same occasion can never produce a second send.
   */
  occasion: string;
  email?: RenderedEmail;
  push?: RenderedPush;
  /**
   * For transactional replies to something the person just did (e.g. "application received").
   * If within the grace window, quiet hours don't apply.
   */
  respondsToContactActionAt?: IsoDateTime;
  /** If the message can't go out before this time (cap or quiet hours), skip it instead. */
  expiresAt?: IsoDateTime;
}

/** A test send to an admin's own address. Never goes to a contact. */
export interface TestSendRequest {
  adminEmail: string;
  channel: 'email';
  messageClass: MessageClass;
  templateId: TemplateId;
  templateVersion: number;
  email: RenderedEmail;
}

export type SendStatus =
  | 'claimed' // reserved under its idempotency key, about to go to the provider
  | 'sent'
  /**
   * A temporary provider failure. Re-tried later through the full gate again. Only used where
   * a retry can't double-send: the provider never accepted it, or it de-duplicates on the
   * idempotency key (Resend, within 24 hours). Counts towards the frequency cap.
   */
  | 'retrying'
  | 'unknown' // the provider call failed in a way that may or may not have sent; never auto-resent
  | 'failed' // definitely not sent (provider rejected it)
  | 'blocked'
  | 'deferred';

export interface SendRecord {
  /** The idempotency key. Also the document id. */
  id: string;
  contactId: ContactId;
  channel: Channel;
  messageClass: MessageClass;
  purpose?: Purpose;
  templateId: TemplateId;
  templateVersion: number;
  automationId?: AutomationId;
  automationVersion?: number;
  stepId?: string;
  occasion: string;
  status: SendStatus;
  /** Copied from the contact so the security rules can hide investor sends from Team. */
  ownerOnly?: boolean;
  /** The lawful basis the gate relied on. */
  basis?: MarketingBasis | 'transactional' | 'business_outreach';
  blockReason?: string;
  deferredUntil?: IsoDateTime;
  /** For 'retrying': when to try again. */
  retryAt?: IsoDateTime;
  firstAttemptAt?: IsoDateTime;
  providerMessageId?: string;
  attempts: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  sentAt?: IsoDateTime;
  opened?: boolean;
  clicked?: boolean;
  converted?: boolean;
}
