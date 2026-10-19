import { normaliseEmail } from '../contacts/addressKind';
import type { Contact } from '../model/contact';
import {
  SCOPE_FOR_REASON,
  suppressionId,
  type SuppressionEntry,
  type SuppressionIdentifierKind,
  type SuppressionReason,
  type SuppressionScope,
} from '../model/suppression';
import type { Clock, Hasher, SuppressionStore } from '../ports';

export interface Identifier {
  kind: SuppressionIdentifierKind;
  value: string;
}

/** Every identifier that could reach this person: all emails, all phones and the app account. */
export function identifiersFor(contact: Pick<Contact, 'emails' | 'phones' | 'appUserId'>): Identifier[] {
  const ids: Identifier[] = [];
  for (const e of contact.emails) ids.push({ kind: 'email', value: normaliseEmail(e.normalised || e.address) });
  for (const p of contact.phones) ids.push({ kind: 'phone', value: p.e164 });
  if (contact.appUserId) ids.push({ kind: 'app_user', value: contact.appUserId });
  return ids;
}

export async function suppressionIdsFor(identifiers: readonly Identifier[], hasher: Hasher): Promise<string[]> {
  return Promise.all(identifiers.map(async (i) => suppressionId(i.kind, await hasher.hash(`${i.kind}:${i.value}`))));
}

/** The scopes of any suppression entries that match this contact. Read fresh at send time. */
export async function suppressedScopesFor(
  contact: Pick<Contact, 'emails' | 'phones' | 'appUserId'>,
  deps: { hasher: Hasher; suppression: SuppressionStore },
): Promise<SuppressionScope[]> {
  const ids = await suppressionIdsFor(identifiersFor(contact), deps.hasher);
  if (ids.length === 0) return [];
  const entries = await deps.suppression.getMany(ids);
  return [...new Set(entries.map((e) => e.scope))];
}

/**
 * Add identifiers to the suppression list. Used for unsubscribes, hard bounces, spam complaints,
 * erasure and "never contact me". Scope follows the reason and is only ever widened.
 */
export async function suppress(
  identifiers: readonly Identifier[],
  reason: SuppressionReason,
  createdBy: string,
  deps: { hasher: Hasher; suppression: SuppressionStore; clock: Clock },
): Promise<SuppressionEntry[]> {
  const scope = SCOPE_FOR_REASON[reason];
  const at = deps.clock.now().toISOString();
  const entries: SuppressionEntry[] = [];
  for (const identifier of identifiers) {
    const hash = await deps.hasher.hash(`${identifier.kind}:${identifier.value}`);
    const entry: SuppressionEntry = { id: suppressionId(identifier.kind, hash), kind: identifier.kind, hash, scope, reason, createdAt: at, createdBy };
    await deps.suppression.add(entry);
    entries.push(entry);
  }
  return entries;
}
