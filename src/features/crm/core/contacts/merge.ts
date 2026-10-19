/**
 * Merging two records of the same person. The kept record gains everything from the other one;
 * the other is left as a pointer (mergedInto) with no emails or phones, so links still resolve
 * but nothing can be sent to it. Two different app accounts are never merged.
 */
import { assertCan, type AdminUser } from '../access/permissions';
import { recordAudit } from '../audit/audit';
import type { CoreDeps } from '../deps';
import { CONSENT_CHANNELS, PURPOSES, type ConsentState } from '../model/consent';
import type { Contact } from '../model/contact';

export class MergeRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MergeRefusedError';
  }
}

/** Something else that holds a contact id and needs pointing at the kept record. */
export interface MergePart {
  name: string;
  repoint(fromId: string, toId: string): Promise<void>;
}

type MergeDeps = Pick<CoreDeps, 'clock' | 'ids' | 'contacts' | 'consentLedger' | 'timeline' | 'audit' | 'logger'>;

const earliest = (a?: string, b?: string) => (a && b ? (a < b ? a : b) : (a ?? b));

/** Per channel and purpose, the most recent choice wins; on a tie, a withdrawal wins. */
export function mergeConsentStates(a: ConsentState, b: ConsentState): ConsentState {
  const out: ConsentState = {};
  for (const channel of CONSENT_CHANNELS) {
    for (const purpose of PURPOSES) {
      const x = a[channel]?.[purpose];
      const y = b[channel]?.[purpose];
      const pick = !x ? y : !y ? x : x.at > y.at ? x : y.at > x.at ? y : x.status === 'withdrawn' ? x : y;
      if (pick) out[channel] = { ...(out[channel] ?? {}), [purpose]: pick };
    }
  }
  return out;
}

export async function mergeContacts(deps: MergeDeps, admin: AdminUser, keepId: string, mergeId: string, parts: MergePart[] = []): Promise<Contact> {
  assertCan(admin, 'contacts.write');
  if (keepId === mergeId) throw new MergeRefusedError('That’s the same record');
  const [keep, other] = await Promise.all([deps.contacts.get(keepId), deps.contacts.get(mergeId)]);
  if (!keep || !other) throw new MergeRefusedError('One of the records no longer exists');
  if (keep.mergedInto || other.mergedInto) throw new MergeRefusedError('One of the records has already been merged');
  if (keep.appUserId && other.appUserId && keep.appUserId !== other.appUserId) throw new MergeRefusedError('These are two different app accounts, so they can’t be merged here');
  if ((keep.ownerOnly || other.ownerOnly) && admin.role !== 'owner') throw new MergeRefusedError('Only the Owner can merge investor records');

  const now = deps.clock.now().toISOString();
  // Move everything else over first, then rebuild consent from the combined ledger.
  for (const part of parts) await part.repoint(mergeId, keepId);
  for (const r of await deps.consentLedger.listForContact(mergeId)) await deps.consentLedger.append({ ...r, id: deps.ids.next('cns'), contactId: keepId });
  await deps.consentLedger.deleteForContact(mergeId);
  for (const e of await deps.timeline.listForContact(mergeId)) await deps.timeline.append({ ...e, id: deps.ids.next('tl'), contactId: keepId, ownerOnly: keep.ownerOnly || other.ownerOnly });
  await deps.timeline.deleteForContact(mergeId);

  const appSide = keep.appUserId ? keep : other.appUserId ? other : keep;
  const merged: Contact = {
    ...keep,
    emails: [...keep.emails, ...other.emails.filter((e) => !keep.emails.some((k) => k.normalised === e.normalised)).map((e) => ({ ...e, primary: false }))],
    phones: [...keep.phones, ...other.phones.filter((p) => !keep.phones.some((k) => k.e164 === p.e164)).map((p) => ({ ...p, primary: false }))],
    types: [...new Set([...keep.types, ...other.types])],
    tags: [...new Set([...keep.tags, ...other.tags])],
    orgIds: [...new Set([...keep.orgIds, ...other.orgIds])],
    lifecycle: appSide.lifecycle ?? keep.lifecycle ?? other.lifecycle,
    signals: appSide.signals,
    ...(appSide.appUserId ? { appUserId: appSide.appUserId } : {}),
    ...(appSide.revenueCatId ? { revenueCatId: appSide.revenueCatId } : {}),
    ...(keep.jobTitle ?? other.jobTitle ? { jobTitle: keep.jobTitle ?? other.jobTitle } : {}),
    ...(earliest(keep.nextFollowUpAt, other.nextFollowUpAt) ? { nextFollowUpAt: earliest(keep.nextFollowUpAt, other.nextFollowUpAt)! } : {}),
    treatAsIndividual: keep.treatAsIndividual || other.treatAsIndividual,
    consent: mergeConsentStates(keep.consent, other.consent),
    ownerOnly: keep.ownerOnly || other.ownerOnly,
    createdAt: earliest(keep.createdAt, other.createdAt)!,
    updatedAt: now,
  };
  if (appSide.lifecycle && merged.lifecycle) merged.types = [...new Set([...appSide.types, ...merged.types.filter((t) => !['Prospect', 'Applicant', 'Trial', 'Member', 'Guest'].includes(t))])];
  await deps.contacts.save(merged);
  // The merged record stays as a pointer, with nothing that could receive a message.
  const { appUserId: _a, revenueCatId: _r, nextFollowUpAt: _n, ...otherRest } = other;
  await deps.contacts.save({ ...otherRest, emails: [], phones: [], mergedInto: keepId, updatedAt: now });
  await deps.timeline.append({ id: deps.ids.next('tl'), contactId: keepId, kind: 'system', summary: `Merged with a duplicate record (${other.name.first} ${other.name.last ?? ''})`.trim(), at: now, actor: `admin:${admin.id}`, ownerOnly: merged.ownerOnly });
  await recordAudit(deps, { actor: `admin:${admin.id}`, action: 'contacts.merge', target: `crmContacts/${keepId}`, before: { merged: mergeId }, after: { into: keepId } });
  deps.logger.info('contacts.merged', { keepId, mergeId });
  return merged;
}
