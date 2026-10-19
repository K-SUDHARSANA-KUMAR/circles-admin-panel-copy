import type { IsoDateTime } from './common';

/**
 * The global suppression list. Nothing overrides it: no automation, admin, CSV import or
 * re-imported consent column. The only way back is the person opting in again themselves.
 *
 * Entries hold a one-way hash of the identifier, never the identifier itself, so the list
 * survives erasure requests without keeping personal data.
 */
export type SuppressionIdentifierKind = 'email' | 'phone' | 'app_user';

export type SuppressionScope =
  /** Blocks marketing and business outreach. Transactional still goes. */
  | 'marketing'
  /** Blocks everything, including transactional. */
  | 'all';

export type SuppressionReason =
  | 'unsubscribed'
  | 'hard_bounce'
  | 'spam_complaint'
  | 'erasure'
  | 'do_not_contact'
  | 'admin';

export interface SuppressionEntry {
  /** `${kind}:${hash}` — also the document id. */
  id: string;
  kind: SuppressionIdentifierKind;
  hash: string;
  scope: SuppressionScope;
  reason: SuppressionReason;
  createdAt: IsoDateTime;
  /** 'system' or an admin id. */
  createdBy: string;
}

/** Which reasons block everything. Unsubscribe only blocks marketing (essential emails still go). */
export const SCOPE_FOR_REASON: Record<SuppressionReason, SuppressionScope> = {
  unsubscribed: 'marketing',
  hard_bounce: 'all',
  spam_complaint: 'all',
  erasure: 'all',
  do_not_contact: 'all',
  admin: 'all',
};

export function suppressionId(kind: SuppressionIdentifierKind, hash: string): string {
  return `${kind}:${hash}`;
}
