/**
 * The only code that hands a message to an email or push provider.
 *
 *   1. Work out the idempotency key for this occasion.
 *   2. Load every fact fresh: kill switches, settings, contact, suppression, recent sends, devices.
 *   3. Ask the gate (consent/gate.ts).
 *   4. Atomically claim the key (and a frequency-cap slot) in the send log.
 *   5. Re-read Pause all sending one last time.
 *   6. Send, passing the key to the provider so a retry can't double-send.
 *   7. Record the outcome. If in doubt whether it went, never resend automatically.
 */
import type { CoreDeps } from '../deps';
import { sha256Hex } from '../crypto';
import { describeBlockReason, evaluateGate, type BlockReason } from '../consent/gate';
import { suppressedScopesFor } from '../consent/suppression';
import { buildUnsubscribeUrl, createUnsubscribeToken } from '../consent/unsubscribe';
import { assertCan, type AdminUser } from '../access/permissions';
import { normaliseEmail } from '../contacts/addressKind';
import type { SendRecord, SendRequest, TestSendRequest } from '../model/message';
import { ProviderError } from '../ports';
import { composeEmail } from './compose';
import { capWindowStart } from './frequencyCap';
import { reportProblem } from '../audit/problems';

export type SendResult =
  | { status: 'sent'; sendId: string; providerMessageId: string }
  | { status: 'deferred'; sendId: string; until: string; reason: 'quiet_hours' | 'frequency_cap' }
  | { status: 'blocked'; sendId: string; reason: BlockReason; explanation: string }
  | { status: 'duplicate'; sendId: string }
  | { status: 'retrying'; sendId: string; retryAt: string }
  | { status: 'failed'; sendId: string; error: string }
  | { status: 'unknown'; sendId: string };

/** Deterministic key: same automation + step + contact + occasion + channel → same key. */
export async function computeSendKey(request: Pick<SendRequest, 'automationId' | 'stepId' | 'templateId' | 'contactId' | 'occasion' | 'channel'>): Promise<string> {
  const parts = [
    `a=${request.automationId ?? 'manual'}`,
    `s=${request.stepId ?? request.templateId}`,
    `c=${request.contactId}`,
    `o=${request.occasion}`,
    `ch=${request.channel}`,
  ].join('|');
  return `snd_${(await sha256Hex(parts)).slice(0, 40)}`;
}

/** Exponential backoff with a cap: 1, 2, 4, 8, 16, 32… minutes, at most an hour. */
export function retryDelayMinutes(attempt: number): number {
  return Math.min(60, 2 ** Math.max(0, attempt - 1));
}

type SendDeps = Pick<
  CoreDeps,
  | 'clock'
  | 'ids'
  | 'hasher'
  | 'signer'
  | 'logger'
  | 'config'
  | 'contacts'
  | 'suppression'
  | 'sendLog'
  | 'killSwitches'
  | 'settings'
  | 'timeline'
  | 'email'
  | 'push'
  | 'pushTokens'
> & Partial<Pick<CoreDeps, 'problems'>>;

export async function send(deps: SendDeps, request: SendRequest): Promise<SendResult> {
  const now = deps.clock.now();
  const sendId = await computeSendKey(request);

  // Load every fact fresh for this send.
  const [killSwitches, settings, contact, existingSend] = await Promise.all([
    deps.killSwitches.read(),
    deps.settings.getSending(),
    deps.contacts.get(request.contactId),
    deps.sendLog.get(sendId),
  ]);
  const suppressedScopes = contact ? await suppressedScopesFor(contact, deps) : [];
  const countedSendTimes =
    request.messageClass === 'marketing' && contact
      ? (await deps.sendLog.listCounted(contact.id, request.channel, capWindowStart(now, settings.frequencyCap[request.channel].windowDays).toISOString()))
          .filter((r) => r.id !== sendId) // a retry of this same message doesn't count against itself
          .map((r) => r.sentAt ?? r.createdAt)
      : [];
  const pushTokens = request.channel === 'push' && contact?.appUserId ? await deps.pushTokens.getTokens(contact.appUserId) : [];

  const decision = evaluateGate({
    now,
    sendKey: sendId,
    request,
    killSwitches,
    settings,
    contact,
    suppressedScopes,
    existingSend,
    countedSendTimes,
    pushTokenCount: pushTokens.length,
  });

  const base: SendRecord = {
    id: sendId,
    contactId: request.contactId,
    channel: request.channel,
    messageClass: request.messageClass,
    ...(request.purpose ? { purpose: request.purpose } : {}),
    templateId: request.templateId,
    templateVersion: request.templateVersion,
    ...(request.automationId ? { automationId: request.automationId } : {}),
    ...(request.automationVersion !== undefined ? { automationVersion: request.automationVersion } : {}),
    ...(request.stepId ? { stepId: request.stepId } : {}),
    occasion: request.occasion,
    status: 'claimed',
    ownerOnly: contact?.ownerOnly ?? true,
    attempts: (existingSend?.attempts ?? 0) + 1,
    firstAttemptAt: existingSend?.firstAttemptAt ?? now.toISOString(),
    createdAt: existingSend?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };

  if (decision.outcome === 'block') {
    if (decision.reason === 'already_sent') return { status: 'duplicate', sendId };
    await deps.sendLog.recordOutcome({ ...base, status: 'blocked', blockReason: decision.reason });
    deps.logger.info('send.blocked', { sendId, contactId: request.contactId, reason: decision.reason });
    return { status: 'blocked', sendId, reason: decision.reason, explanation: describeBlockReason(decision.reason) };
  }

  if (decision.outcome === 'defer') {
    const until = decision.until.toISOString();
    await deps.sendLog.recordOutcome({ ...base, status: 'deferred', deferredUntil: until, basis: decision.basis, blockReason: decision.reason });
    deps.logger.info('send.deferred', { sendId, contactId: request.contactId, reason: decision.reason, until });
    return { status: 'deferred', sendId, until, reason: decision.reason };
  }

  // Claim the key, and a frequency-cap slot, atomically.
  const claim = await deps.sendLog.claim({ ...base, status: 'claimed', basis: decision.basis }, decision.capCheck);
  if (claim.result === 'duplicate') return { status: 'duplicate', sendId };
  if (claim.result === 'cap_reached') {
    // Another send won the race for the last slot. Same rule as the gate: hold it if a slot
    // frees within the allowed delay (and before it expires), otherwise skip it.
    const freesAt = Date.parse(claim.oldestInWindow) + settings.frequencyCap[request.channel].windowDays * 86_400_000 + 1000;
    const limit = now.getTime() + settings.frequencyCap.maxDeferDays * 86_400_000;
    const expired = request.expiresAt !== undefined && freesAt > Date.parse(request.expiresAt);
    if (freesAt > limit || expired) {
      const reason: BlockReason = expired ? 'expired' : 'frequency_cap';
      await deps.sendLog.recordOutcome({ ...base, status: 'blocked', blockReason: reason });
      return { status: 'blocked', sendId, reason, explanation: describeBlockReason(reason) };
    }
    const until = new Date(freesAt).toISOString();
    await deps.sendLog.recordOutcome({ ...base, status: 'deferred', deferredUntil: until, blockReason: 'frequency_cap' });
    return { status: 'deferred', sendId, until, reason: 'frequency_cap' };
  }

  // Last look at the kill switch, immediately before the provider call.
  if ((await deps.killSwitches.read()).pauseAllSending) {
    await deps.sendLog.update(sendId, { status: 'blocked', blockReason: 'paused', updatedAt: deps.clock.now().toISOString() });
    return { status: 'blocked', sendId, reason: 'paused', explanation: describeBlockReason('paused') };
  }

  try {
    let providerMessageId: string;
    let summary: string;
    if (request.channel === 'email' && request.email && decision.recipientEmail) {
      const unsubscribeUrl =
        request.messageClass === 'transactional'
          ? undefined
          : buildUnsubscribeUrl(
              deps.config,
              // Issued at the first attempt, so a retry sends a byte-identical email and the
              // provider recognises the repeat by its idempotency key.
              await createUnsubscribeToken(deps, { contactId: request.contactId, sendId, issuedAt: base.firstAttemptAt ?? base.createdAt }),
            );
      const outgoing = composeEmail({
        sendId,
        messageClass: request.messageClass,
        templateId: request.templateId,
        recipient: decision.recipientEmail,
        email: request.email,
        ...(unsubscribeUrl ? { unsubscribeUrl } : {}),
        config: deps.config,
      });
      ({ providerMessageId } = await deps.email.send(outgoing));
      summary = `Email sent: “${request.email.subject}”`;
    } else if (request.channel === 'push' && request.push && contact?.appUserId) {
      ({ providerMessageId } = await deps.push.send({
        tokens: pushTokens,
        title: request.push.title,
        body: request.push.body,
        ...(request.push.link ? { link: request.push.link } : {}),
        data: { send_id: sendId, template_id: request.templateId },
      }));
      summary = `Push sent: “${request.push.title}”`;
    } else {
      throw new ProviderError('Nothing to send', false, false);
    }

    const sentAt = deps.clock.now().toISOString();
    await deps.sendLog.update(sendId, { status: 'sent', providerMessageId, sentAt, updatedAt: sentAt });
    if (contact) {
      await deps.timeline.append({
        id: deps.ids.next('tl'),
        contactId: contact.id,
        kind: request.channel === 'email' ? 'email_out' : 'push_out',
        summary: `${summary}${request.automationId ? ' (automation)' : ''}`,
        at: sentAt,
        actor: request.automationId ? `system:automation:${request.automationId}` : 'system:send-service',
        ref: { kind: 'send', id: sendId },
        ownerOnly: contact.ownerOnly,
      });
    }
    deps.logger.info('send.sent', { sendId, contactId: request.contactId, channel: request.channel, messageClass: request.messageClass, basis: decision.basis });
    return { status: 'sent', sendId, providerMessageId };
  } catch (error) {
    return handleProviderError(deps, request, sendId, base, error);
  }
}

async function handleProviderError(deps: SendDeps, request: SendRequest, sendId: string, base: SendRecord, error: unknown): Promise<SendResult> {
  const now = deps.clock.now();
  const err = error instanceof ProviderError ? error : new ProviderError(error instanceof Error ? error.message : String(error), false, true);
  const providerDedupes = request.channel === 'email' && deps.email.supportsIdempotencyKey;
  const withinWindow =
    base.attempts < deps.config.retry.maxAttempts &&
    now.getTime() - Date.parse(base.firstAttemptAt ?? base.createdAt) < deps.config.retry.maxWindowHours * 3_600_000;

  // Ambiguous: it may have gone out. Only retry if the provider will de-duplicate on our key.
  if (err.ambiguous && !providerDedupes) {
    await deps.sendLog.update(sendId, { status: 'unknown', blockReason: 'provider_ambiguous', updatedAt: now.toISOString() });
    deps.logger.error('send.unknown', { sendId, contactId: request.contactId, error: err.message });
    await reportProblem(deps, { id: `send_${sendId}`, area: 'sending', message: `A ${request.channel === 'push' ? 'push notification' : 'message'} may or may not have gone out (the provider didn't answer clearly), so it wasn't retried.`, ref: { kind: 'send', id: sendId } });
    return { status: 'unknown', sendId };
  }
  if ((err.retryable || err.ambiguous) && withinWindow) {
    const retryAt = new Date(now.getTime() + retryDelayMinutes(base.attempts) * 60_000).toISOString();
    await deps.sendLog.update(sendId, { status: 'retrying', retryAt, blockReason: 'provider_error', updatedAt: now.toISOString() });
    deps.logger.warn('send.retrying', { sendId, contactId: request.contactId, attempt: base.attempts, error: err.message });
    return { status: 'retrying', sendId, retryAt };
  }
  const finalStatus = err.ambiguous ? 'unknown' : 'failed';
  await deps.sendLog.update(sendId, { status: finalStatus, blockReason: 'provider_error', updatedAt: now.toISOString() });
  deps.logger.error('send.failed', { sendId, contactId: request.contactId, error: err.message, finalStatus });
  await reportProblem(deps, {
    id: `send_${sendId}`,
    area: 'sending',
    message: finalStatus === 'unknown' ? 'A message may or may not have gone out after several tries, so it wasn’t retried again.' : `A ${request.channel === 'push' ? 'push notification' : 'message'} couldn’t be sent: the provider refused it.`,
    ref: { kind: 'send', id: sendId },
  });
  return finalStatus === 'unknown' ? { status: 'unknown', sendId } : { status: 'failed', sendId, error: err.message };
}

/**
 * Dry run: what would the gate decide for this message right now? Reads only; sends nothing,
 * claims nothing. Used by "preview with real data".
 */
export async function previewSend(
  deps: Pick<CoreDeps, 'clock' | 'hasher' | 'contacts' | 'suppression' | 'sendLog' | 'killSwitches' | 'settings' | 'pushTokens'>,
  request: SendRequest,
): Promise<ReturnType<typeof evaluateGate>> {
  const now = deps.clock.now();
  const sendId = await computeSendKey(request);
  const [killSwitches, settings, contact, existingSend] = await Promise.all([deps.killSwitches.read(), deps.settings.getSending(), deps.contacts.get(request.contactId), deps.sendLog.get(sendId)]);
  const suppressedScopes = contact ? await suppressedScopesFor(contact, deps) : [];
  const countedSendTimes =
    request.messageClass === 'marketing' && contact
      ? (await deps.sendLog.listCounted(contact.id, request.channel, capWindowStart(now, settings.frequencyCap[request.channel].windowDays).toISOString())).map((r) => r.sentAt ?? r.createdAt)
      : [];
  const pushTokens = request.channel === 'push' && contact?.appUserId ? await deps.pushTokens.getTokens(contact.appUserId) : [];
  return evaluateGate({ now, sendKey: sendId, request, killSwitches, settings, contact, suppressedScopes, existingSend, countedSendTimes, pushTokenCount: pushTokens.length });
}

/**
 * "Send test to me". Goes only to the signed-in admin's own address or an Owner-approved test
 * address — never to a contact. The only send allowed while Pause all sending is on.
 */
export async function sendTest(
  deps: Pick<CoreDeps, 'clock' | 'ids' | 'logger' | 'config' | 'settings' | 'email'>,
  admin: AdminUser,
  request: TestSendRequest,
): Promise<{ status: 'sent'; providerMessageId: string } | { status: 'rejected'; reason: string }> {
  assertCan(admin, 'sends.test');
  const settings = await deps.settings.getSending();
  const target = normaliseEmail(request.adminEmail);
  const allowed = new Set([normaliseEmail(admin.email), ...settings.testRecipients.map(normaliseEmail)]);
  if (!allowed.has(target)) return { status: 'rejected', reason: 'Test emails can only go to your own address or an approved test address' };

  const sendId = `test_${deps.ids.next('t')}`;
  const outgoing = composeEmail({
    sendId,
    messageClass: request.messageClass,
    templateId: request.templateId,
    recipient: target,
    email: { ...request.email, subject: `[TEST] ${request.email.subject}` },
    ...(request.messageClass !== 'transactional' ? { unsubscribeUrl: `${deps.config.unsubscribeBaseUrl}?t=TEST` } : {}),
    config: deps.config,
  });
  const { providerMessageId } = await deps.email.send(outgoing);
  deps.logger.info('send.test', { adminId: admin.id, templateId: request.templateId });
  return { status: 'sent', providerMessageId };
}
