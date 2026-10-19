import type { ContactId, IsoDateTime } from './common';

/** An admin setting change: who, what, when, before and after. Append-only. */
export interface AuditEntry {
  id: string;
  /** e.g. "admin:abc123" or "system:scheduler". */
  actor: string;
  /** e.g. "killSwitch.pauseAllSending", "settings.sending", "automation.update". */
  action: string;
  /** What was changed, e.g. "crmSettings/sending" or "crmAutomations/welcome". */
  target: string;
  before?: unknown;
  after?: unknown;
  /** Dotted paths of the fields that changed, for a quick plain-English summary. */
  changedPaths?: string[];
  at: IsoDateTime;
}

export const TIMELINE_KINDS = [
  'email_in',
  'email_out',
  'push_out',
  'app_milestone',
  'subscription',
  'event',
  'note',
  'task',
  'consent',
  'automation',
  'agent',
  'system',
] as const;
export type TimelineKind = (typeof TIMELINE_KINDS)[number];

/** One line on a contact's timeline. Holds a summary, never a full email body. */
export interface TimelineEntry {
  id: string;
  contactId: ContactId;
  kind: TimelineKind;
  /** One-line plain-English summary, e.g. "Unsubscribed from marketing emails (one-click)". */
  summary: string;
  /** Only for notes written by an admin. Never holds email content. */
  body?: string;
  at: IsoDateTime;
  /** e.g. "admin:abc", "system:send-service". */
  actor: string;
  /** Link back to the source record: a send id, Gmail message id, Luma guest id, etc. */
  ref?: { kind: string; id: string };
  /** Copied from the contact so security rules can hide investor timelines from Team. */
  ownerOnly: boolean;
}
