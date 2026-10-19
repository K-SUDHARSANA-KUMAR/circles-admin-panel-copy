/**
 * One-click unsubscribe.
 *
 * Every marketing and business email carries a signed link and RFC 8058 headers
 * (List-Unsubscribe + List-Unsubscribe-Post), so Gmail and Apple Mail show their own button.
 * Unsubscribing takes effect immediately: the suppression entry and the consent withdrawals are
 * written before the confirmation page is returned, and the send gate reads suppression fresh,
 * so anything already queued is blocked.
 *
 * Tokens carry only an opaque contact id and are HMAC-signed, so a link can't be forged or used
 * to look anyone up.
 */
import { base64UrlDecodeString, base64UrlEncodeString } from '../crypto';
import { normaliseEmail } from '../contacts/addressKind';
import type { CoreConfig } from '../config/defaults';
import type { CoreDeps } from '../deps';
import type { ContactId } from '../model/common';
import type { Contact } from '../model/contact';
import { applyConsentRecord, PURPOSES, type ConsentMethod, type ConsentRecord } from '../model/consent';
import { identifiersFor, suppress, suppressedScopesFor } from './suppression';

export interface UnsubscribeTokenPayload {
  v: 1;
  /** Contact id. */
  c: ContactId;
  /** Send id the link came from, if any. */
  s?: string;
  /** Issued / expires, seconds since epoch. */
  iat: number;
  exp: number;
}

export async function createUnsubscribeToken(
  deps: Pick<CoreDeps, 'signer' | 'clock' | 'config'>,
  input: { contactId: ContactId; sendId?: string; issuedAt?: string },
): Promise<string> {
  const issued = input.issuedAt ? Date.parse(input.issuedAt) : deps.clock.now().getTime();
  const iat = Math.floor(issued / 1000);
  const payload: UnsubscribeTokenPayload = {
    v: 1,
    c: input.contactId,
    ...(input.sendId ? { s: input.sendId } : {}),
    iat,
    exp: iat + deps.config.unsubscribeTokenTtlDays * 86_400,
  };
  const body = base64UrlEncodeString(JSON.stringify(payload));
  return `${body}.${await deps.signer.sign(body)}`;
}

export type VerifyResult =
  | { ok: true; payload: UnsubscribeTokenPayload }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' };

export async function verifyUnsubscribeToken(deps: Pick<CoreDeps, 'signer' | 'clock'>, token: string): Promise<VerifyResult> {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'malformed' };
  const [body, signature] = parts as [string, string];
  if (!(await deps.signer.verify(body, signature))) return { ok: false, reason: 'bad_signature' };
  let payload: UnsubscribeTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecodeString(body)) as UnsubscribeTokenPayload;
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (payload.v !== 1 || typeof payload.c !== 'string' || typeof payload.exp !== 'number') return { ok: false, reason: 'malformed' };
  if (payload.exp * 1000 < deps.clock.now().getTime()) return { ok: false, reason: 'expired' };
  return { ok: true, payload };
}

export function buildUnsubscribeUrl(config: Pick<CoreConfig, 'unsubscribeBaseUrl'>, token: string): string {
  return `${config.unsubscribeBaseUrl}?t=${encodeURIComponent(token)}`;
}

/** RFC 2369 + RFC 8058 headers for one-click unsubscribe. */
export function listUnsubscribeHeaders(config: Pick<CoreConfig, 'unsubscribeMailto'>, url: string): Record<string, string> {
  const targets = [`<${url}>`];
  if (config.unsubscribeMailto) targets.push(`<mailto:${config.unsubscribeMailto}?subject=unsubscribe>`);
  return {
    'List-Unsubscribe': targets.join(', '),
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

export type UnsubscribeOutcome = 'unsubscribed' | 'already_unsubscribed' | 'invalid' | 'expired' | 'contact_gone';

type UnsubscribeDeps = Pick<CoreDeps, 'signer' | 'clock' | 'ids' | 'hasher' | 'contacts' | 'consentLedger' | 'suppression' | 'timeline' | 'logger'>;

/**
 * Handle an unsubscribe link click or a one-click POST. Idempotent: clicking twice changes nothing.
 * Withdraws every email marketing purpose and suppresses all the contact's email addresses for
 * marketing. Essential service emails (e.g. a payment problem) still go, as agreed with Gus.
 */
export async function processUnsubscribe(
  deps: UnsubscribeDeps,
  token: string,
  method: Extract<ConsentMethod, 'one_click_unsubscribe' | 'unsubscribe_page'>,
): Promise<UnsubscribeOutcome> {
  const verified = await verifyUnsubscribeToken(deps, token);
  if (!verified.ok) {
    deps.logger.warn('unsubscribe.token_rejected', { reason: verified.reason });
    return verified.reason === 'expired' ? 'expired' : 'invalid';
  }
  let contact = await deps.contacts.get(verified.payload.c);
  if (contact?.mergedInto) contact = await deps.contacts.get(contact.mergedInto);
  if (!contact) return 'contact_gone';
  return unsubscribeContact(deps, contact, method, verified.payload.s);
}

async function unsubscribeContact(
  deps: UnsubscribeDeps,
  contact: Contact,
  method: ConsentMethod,
  sendId?: string,
): Promise<UnsubscribeOutcome> {
  const now = deps.clock.now().toISOString();
  const scopesBefore = await suppressedScopesFor(contact, deps);
  const toWithdraw = PURPOSES.filter((p) => contact.consent.email?.[p]?.status !== 'withdrawn');

  // Suppress first: the gate checks suppression before consent, so this alone stops every queued send.
  const emailIds = identifiersFor(contact).filter((i) => i.kind === 'email');
  await suppress(emailIds, 'unsubscribed', 'system', deps);

  let consent = contact.consent;
  for (const purpose of toWithdraw) {
    const record: ConsentRecord = {
      id: deps.ids.next('cns'),
      contactId: contact.id,
      channel: 'email',
      purpose,
      status: 'withdrawn',
      source: 'unsubscribe_link',
      method,
      capturedAt: now,
      recordedAt: now,
      recordedBy: 'system',
      ...(sendId ? { evidence: { sendId } } : {}),
    };
    await deps.consentLedger.append(record);
    consent = applyConsentRecord(consent, record);
  }
  if (toWithdraw.length > 0) await deps.contacts.save({ ...contact, consent, updatedAt: now });

  const already = toWithdraw.length === 0 && (scopesBefore.includes('marketing') || scopesBefore.includes('all'));
  if (!already) {
    await deps.timeline.append({
      id: deps.ids.next('tl'),
      contactId: contact.id,
      kind: 'consent',
      summary: `Unsubscribed from all marketing emails (${method === 'one_click_unsubscribe' ? 'one-click' : 'unsubscribe page'})`,
      at: now,
      actor: `contact:${contact.id}`,
      ...(sendId ? { ref: { kind: 'send', id: sendId } } : {}),
      ownerOnly: contact.ownerOnly,
    });
  }
  deps.logger.info('unsubscribe.processed', { contactId: contact.id, method, already });
  return already ? 'already_unsubscribed' : 'unsubscribed';
}

/**
 * Fallback for an expired link: the page asks for an email address. The address is suppressed
 * whether or not we know it, and the response is the same either way, so the form can't be used
 * to find out who is in the CRM.
 */
export async function unsubscribeByEmail(deps: UnsubscribeDeps, rawEmail: string): Promise<'done'> {
  const email = normaliseEmail(rawEmail);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'done';
  await suppress([{ kind: 'email', value: email }], 'unsubscribed', 'system', deps);
  for (const contact of await deps.contacts.findByEmail(email)) {
    await unsubscribeContact(deps, contact, 'unsubscribe_page');
  }
  return 'done';
}
