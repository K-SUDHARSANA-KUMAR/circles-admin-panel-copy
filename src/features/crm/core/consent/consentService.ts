import {
  applyConsentRecord,
  PURPOSE_LABELS,
  type ConsentChannel,
  type ConsentMethod,
  type ConsentRecord,
  type ConsentSource,
  type MarketingBasis,
  type Purpose,
} from '../model/consent';
import type { ContactId, IsoDateTime } from '../model/common';
import type { CoreDeps } from '../deps';
import { suppressionId } from '../model/suppression';

/** Sources where the person themselves acted. Only these can lift an unsubscribe. */
export const SELF_SERVICE_SOURCES: ReadonlySet<ConsentSource> = new Set<ConsentSource>(['signup', 'settings', 'website', 'luma']);

/** Methods that are an active "yes" from the person (not a soft opt-in). */
export const ACTIVE_OPT_IN_METHODS: ReadonlySet<ConsentMethod> = new Set<ConsentMethod>(['checkbox_opt_in', 'settings_toggle']);

export interface RecordConsentInput {
  contactId: ContactId;
  channel: ConsentChannel;
  purpose: Purpose;
  status: 'granted' | 'withdrawn';
  basis?: MarketingBasis;
  source: ConsentSource;
  method: ConsentMethod;
  wordingVersion?: string;
  capturedAt: IsoDateTime;
  /** 'system' or an admin id. */
  recordedBy: string;
  evidence?: ConsentRecord['evidence'];
}

export class ConsentValidationError extends Error {
  constructor(readonly problems: string[]) {
    super(`Consent record rejected: ${problems.join('; ')}`);
    this.name = 'ConsentValidationError';
  }
}

/**
 * Rules for what counts as valid consent evidence. A grant that fails these is rejected outright,
 * so the gate can trust whatever is in the ledger.
 */
export function validateConsentInput(input: RecordConsentInput, now: Date): string[] {
  const problems: string[] = [];
  const captured = Date.parse(input.capturedAt);
  if (Number.isNaN(captured)) problems.push('capturedAt is not a valid date');
  else if (captured > now.getTime() + 5 * 60_000) problems.push('capturedAt is in the future');

  if (input.status === 'withdrawn') {
    if (input.basis) problems.push('a withdrawal has no basis');
    return problems;
  }

  if (input.channel === 'email') {
    if (!input.basis) problems.push('an email grant needs a basis (consent or soft_opt_in)');
    if (input.basis === 'soft_opt_in') {
      if (input.source !== 'signup') problems.push('soft opt-in only applies to emails collected during signup');
      if (input.method !== 'opt_out_not_ticked') problems.push('soft opt-in must come from an opt-out box left unticked');
      const ev = input.evidence?.softOptIn;
      if (!ev || ev.context !== 'signup' || !ev.optOutOfferedAt) problems.push('soft opt-in needs evidence that the opt-out was offered at signup');
      if (!input.wordingVersion) problems.push('soft opt-in needs the wording version of the opt-out shown');
    }
    if (input.basis === 'consent') {
      const allowed: ConsentMethod[] = ['checkbox_opt_in', 'settings_toggle', 'import_declared', 'admin_recorded'];
      if (!allowed.includes(input.method)) problems.push(`method ${input.method} is not an opt-in`);
      if (input.method !== 'admin_recorded' && !input.wordingVersion) problems.push('consent needs the wording version they agreed to');
      if (input.method === 'admin_recorded' && !input.evidence?.note) problems.push('admin-recorded consent needs a note saying how it was given');
    }
  }

  if (input.source === 'import') {
    if (input.method !== 'import_declared') problems.push('imported consent must use method import_declared');
    if (!input.evidence?.importId) problems.push('imported consent must reference its import batch');
  }
  if (input.method === 'opt_out_ticked') problems.push('an opt-out ticked is a withdrawal, not a grant');
  return problems;
}

export interface RecordConsentOptions {
  /** True only for the Owner (capability consent.declareImportEvidence). */
  mayDeclareImportEvidence?: boolean;
}

/**
 * Append a consent change to the ledger and update the contact's current state.
 * Lifts a marketing unsubscribe only when the person themselves actively opts in again.
 */
export async function recordConsent(
  deps: Pick<CoreDeps, 'clock' | 'ids' | 'contacts' | 'consentLedger' | 'suppression' | 'hasher' | 'timeline' | 'logger'>,
  input: RecordConsentInput,
  options: RecordConsentOptions = {},
): Promise<ConsentRecord> {
  const now = deps.clock.now();
  const problems = validateConsentInput(input, now);
  if (input.source === 'import' && input.status === 'granted' && !options.mayDeclareImportEvidence) {
    problems.push('only the Owner can declare consent evidence for an import');
  }
  if (problems.length > 0) throw new ConsentValidationError(problems);

  const contact = await deps.contacts.get(input.contactId);
  if (!contact) throw new ConsentValidationError(['contact not found']);

  const record: ConsentRecord = {
    id: deps.ids.next('cns'),
    contactId: input.contactId,
    channel: input.channel,
    purpose: input.purpose,
    status: input.status,
    ...(input.basis ? { basis: input.basis } : {}),
    source: input.source,
    method: input.method,
    ...(input.wordingVersion ? { wordingVersion: input.wordingVersion } : {}),
    capturedAt: input.capturedAt,
    recordedAt: now.toISOString(),
    recordedBy: input.recordedBy,
    ...(input.evidence ? { evidence: input.evidence } : {}),
  };
  await deps.consentLedger.append(record);

  const updated = { ...contact, consent: applyConsentRecord(contact.consent, record), updatedAt: now.toISOString() };
  await deps.contacts.save(updated);

  // Only the person themselves, actively saying yes, can lift a marketing unsubscribe.
  // Bounces, complaints, erasure and "never contact me" ('all' scope) are never lifted here.
  if (
    record.status === 'granted' &&
    record.channel === 'email' &&
    SELF_SERVICE_SOURCES.has(record.source) &&
    ACTIVE_OPT_IN_METHODS.has(record.method)
  ) {
    for (const email of contact.emails) {
      const hash = await deps.hasher.hash(`email:${email.normalised}`);
      await deps.suppression.removeMarketingScope(suppressionId('email', hash));
    }
  }

  const verb = record.status === 'granted' ? (record.basis === 'soft_opt_in' ? 'Soft opt-in recorded for' : 'Agreed to') : 'Withdrew';
  await deps.timeline.append({
    id: deps.ids.next('tl'),
    contactId: contact.id,
    kind: 'consent',
    summary: `${verb} ${PURPOSE_LABELS[record.purpose].toLowerCase()} by ${record.channel} (${record.source}${record.wordingVersion ? `, wording ${record.wordingVersion}` : ''})`,
    at: now.toISOString(),
    actor: input.recordedBy === 'system' ? 'system:consent' : `admin:${input.recordedBy}`,
    ref: { kind: 'consent', id: record.id },
    ownerOnly: contact.ownerOnly,
  });
  deps.logger.info('consent.recorded', { contactId: contact.id, channel: record.channel, purpose: record.purpose, status: record.status, source: record.source });
  return record;
}
