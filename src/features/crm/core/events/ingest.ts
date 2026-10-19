/**
 * Event ingestion: turn one validated event into changes on the right person's record.
 *
 *   1. Ignore it if we've seen its eventId before (idempotent).
 *   2. Find the person: app account, then email, then phone. Create them if the event introduces
 *      someone new (a signup, a website lead, a Luma registration).
 *   3. Update the small read-only summary (signals), add timeline lines, record consent.
 *   4. Recompute their lifecycle and segment membership.
 *   5. Return triggers for the automation engine (stage 4): "verified", "billing issue",
 *      "joined segment X" and so on.
 */
import { recordConsent } from '../consent/consentService';
import { makeEmailAddress, normaliseEmail } from '../contacts/addressKind';
import { normalisePhone } from '../contacts/phone';
import type { CoreDeps } from '../deps';
import { applyLifecycle } from '../lifecycle/derive';
import type { AppTriggerEvent, SubscriptionTriggerEvent } from '../model/automation';
import type { Contact, LifecycleStage } from '../model/contact';
import type { InboxCategory } from '../model/inbox';
import { refreshMembership } from '../segments/membership';
import type { CrmEvent } from './contract';
import { handleLumaGuest } from './luma';

export type TriggerSignal =
  | { kind: 'app_event'; event: AppTriggerEvent; contactId: string; occasion: string; at: string }
  | { kind: 'subscription_event'; event: SubscriptionTriggerEvent; contactId: string; occasion: string; at: string }
  | { kind: 'lifecycle_changed'; contactId: string; from: LifecycleStage; to: LifecycleStage; at: string }
  | { kind: 'segment_joined'; contactId: string; segmentId: string; occasion: string; at: string }
  | { kind: 'pipeline_stage_changed'; contactId: string; pipelineId: string; stageId: string; itemId: string; occasion: string; at: string }
  | { kind: 'inbound_email'; contactId: string; category: InboxCategory; occasion: string; at: string };

export interface IngestResult {
  status: 'processed' | 'duplicate' | 'ignored' | 'queued';
  contactId?: string;
  created?: boolean;
  triggers: TriggerSignal[];
  note?: string;
}

export type IngestDeps = Pick<
  CoreDeps,
  | 'clock'
  | 'ids'
  | 'hasher'
  | 'logger'
  | 'config'
  | 'contacts'
  | 'consentLedger'
  | 'suppression'
  | 'timeline'
  | 'processedEvents'
  | 'registrations'
  | 'lumaEvents'
  | 'matchQueue'
  | 'segments'
  | 'lifecycle'
>;

/** Events that may introduce a new person. */
const CREATES: ReadonlySet<CrmEvent['type']> = new Set(['signup.contact_captured', 'signup.completed', 'website.lead_captured', 'signup.started']);

export function newProspect(
  deps: Pick<IngestDeps, 'ids'>,
  input: { first?: string; last?: string; email?: string; phone?: string; channel: Contact['source']['channel']; detail: string; at: string },
): Contact {
  const first = input.first ?? (input.email ? input.email.split('@')[0]!.split(/[._+]/)[0]!.replace(/^./, (c) => c.toUpperCase()) : 'New');
  return {
    id: deps.ids.next('c'),
    name: { first, ...(input.last ? { last: input.last } : {}) },
    emails: input.email ? [makeEmailAddress(input.email, true)] : [],
    phones: input.phone ? [{ e164: input.phone, primary: true }] : [],
    types: ['Prospect'],
    lifecycle: { stage: 'Prospect', since: input.at, flags: [] },
    orgIds: [],
    treatAsIndividual: false,
    tags: [],
    source: { channel: input.channel, detail: input.detail, capturedAt: input.at },
    timezone: 'Europe/London',
    consent: {},
    signals: {},
    segmentIds: [],
    ownerOnly: false,
    createdAt: input.at,
    updatedAt: input.at,
  };
}

export async function findContact(deps: Pick<IngestDeps, 'contacts'>, subject: CrmEvent['subject']): Promise<Contact | undefined> {
  const live = (c: Contact | undefined) => (c && !c.mergedInto ? c : undefined);
  if (subject.appUserId) {
    const c = live(await deps.contacts.findByAppUserId(subject.appUserId));
    if (c) return c;
  }
  if (subject.email) {
    const c = (await deps.contacts.findByEmail(normaliseEmail(subject.email))).find((x) => !x.mergedInto);
    if (c) return c;
  }
  const phone = normalisePhone(subject.phone);
  if (phone) {
    const c = (await deps.contacts.findByPhone(phone)).find((x) => !x.mergedInto);
    if (c) return c;
  }
  return undefined;
}

function addIdentifiers(c: Contact, subject: CrmEvent['subject']): Contact {
  let next = c;
  if (subject.appUserId && !c.appUserId) next = { ...next, appUserId: subject.appUserId, revenueCatId: subject.appUserId };
  if (subject.email && !c.emails.some((e) => e.normalised === normaliseEmail(subject.email!))) {
    next = { ...next, emails: [...next.emails, makeEmailAddress(subject.email, next.emails.length === 0)] };
  }
  const phone = normalisePhone(subject.phone);
  if (phone && !c.phones.some((p) => p.e164 === phone)) next = { ...next, phones: [...next.phones, { e164: phone, primary: next.phones.length === 0 }] };
  return next;
}

const STATUS_FOR_KIND = {
  started: 'active',
  renewed: 'active',
  uncancelled: 'active',
  cancelled: 'cancelled_active',
  paused: 'cancelled_active',
  billing_issue: 'billing_issue',
  expired: 'expired',
} as const;

export async function ingestEvent(deps: IngestDeps, event: CrmEvent): Promise<IngestResult> {
  const now = deps.clock.now();
  if (!(await deps.processedEvents.claim(event.eventId, now.toISOString()))) return { status: 'duplicate', triggers: [] };
  if (event.type === 'app.first_open') return { status: 'ignored', triggers: [], note: 'Counted for the funnel only; no personal data' };
  if (event.type === 'luma.guest_changed') return handleLumaGuest(deps, event);

  const at = event.occurredAt;
  let contact = await findContact(deps, event.subject);
  let created = false;
  if (!contact) {
    if (!CREATES.has(event.type) || !(event.subject.email || event.subject.appUserId || event.subject.phone)) {
      deps.logger.warn('ingest.unknown_person', { type: event.type, eventId: event.eventId });
      return { status: 'ignored', triggers: [], note: 'No matching person and this event doesn’t introduce one' };
    }
    const data = event.data as { firstName?: string; lastName?: string };
    contact = newProspect(deps, {
      ...(data.firstName ? { first: data.firstName } : {}),
      ...(data.lastName ? { last: data.lastName } : {}),
      ...(event.subject.email ? { email: event.subject.email } : {}),
      ...(normalisePhone(event.subject.phone) ? { phone: normalisePhone(event.subject.phone)! } : {}),
      channel: event.type === 'website.lead_captured' ? 'website' : 'app',
      detail: event.type === 'website.lead_captured' ? 'Website form' : 'Started signing up in the app',
      at,
    });
    created = true;
  }
  let c = addIdentifiers(contact, event.subject);
  const triggers: TriggerSignal[] = [];
  const lines: { kind: Parameters<IngestDeps['timeline']['append']>[0]['kind']; summary: string }[] = [];
  const trigger = (e: AppTriggerEvent, occasion: string) => triggers.push({ kind: 'app_event', event: e, contactId: c.id, occasion, at });
  const subTrigger = (e: SubscriptionTriggerEvent, occasion: string) => triggers.push({ kind: 'subscription_event', event: e, contactId: c.id, occasion, at });
  const sig = (patch: Partial<Contact['signals']>) => (c = { ...c, signals: { ...c.signals, ...patch } });
  let consentAfter: Parameters<typeof recordConsent>[1] | undefined;

  switch (event.type) {
    case 'signup.started':
    case 'signup.contact_captured': {
      if (c.lifecycle?.stage === 'Prospect') {
        const first = !c.dropOff;
        c = { ...c, dropOff: { point: 'signup_started', ...(event.data.step ? { lastStep: event.data.step } : {}), at } };
        if (first || created) lines.push({ kind: 'app_milestone', summary: 'Started signing up in the app' });
        if (event.type === 'signup.contact_captured') trigger('signup.dropped_off', `signup:${c.id}`);
      }
      break;
    }
    case 'signup.step_completed':
      if (c.lifecycle?.stage === 'Prospect') c = { ...c, dropOff: { point: 'signup_step', lastStep: event.data.step, at }, signals: { ...c.signals, signupStep: event.data.step } };
      break;
    case 'signup.completed': {
      const inviter = event.data.invitedByUserId ? await deps.contacts.findByAppUserId(event.data.invitedByUserId) : undefined;
      c = {
        ...c,
        name: { first: event.data.firstName, ...(event.data.lastName ? { last: event.data.lastName } : {}) },
        ...(event.data.timezone ? { timezone: event.data.timezone } : {}),
        dropOff: { point: 'application_started', at },
        lifecycle: c.lifecycle ?? { stage: 'Prospect', since: at, flags: [] },
      };
      const code = event.data.inviteCode?.replace(/\s+/g, '').toUpperCase();
      sig({
        hasAccount: true,
        joinedAt: at,
        ...(event.data.city ? { city: event.data.city } : {}),
        ...(inviter ? { inviterContactId: inviter.id } : {}),
        ...(code && !c.signals.signupCode ? { signupCode: code } : {}),
      });
      lines.push({ kind: 'app_milestone', summary: inviter ? `Signed up in the app (invited by ${inviter.name.first} ${inviter.name.last ?? ''})`.trim() : 'Signed up in the app' });
      break;
    }
    case 'application.submitted': {
      const { dropOff: _d, ...rest } = c;
      c = rest;
      sig({ application: { ...c.signals.application, submittedAt: at } });
      lines.push({ kind: 'app_milestone', summary: event.data.route === 'invite' ? 'Applied with an invite' : 'Applied to join' });
      trigger('application.submitted', `application:${c.id}`);
      break;
    }
    case 'application.decided': {
      sig({ application: { ...c.signals.application, decision: event.data.decision, decidedAt: at }, ...(event.data.decision === 'approved' ? { verifiedAt: at } : {}) });
      lines.push({ kind: 'app_milestone', summary: event.data.decision === 'approved' ? 'Verified' : event.data.decision === 'rejected' ? 'Application not approved' : 'Application put on hold' });
      if (event.data.decision === 'approved') trigger('verified', `verified:${c.id}`);
      break;
    }
    case 'membership.free_period_started':
      sig({ freePeriod: { startedAt: event.data.startedAt, endsAt: event.data.endsAt } });
      lines.push({ kind: 'subscription', summary: 'Free 3 months started' });
      subTrigger('free_period.started', `free:${c.id}`);
      break;
    case 'consent.updated': {
      const d = event.data;
      const soft = d.granted && d.method === 'opt_out_not_ticked';
      consentAfter = {
        contactId: c.id,
        channel: d.channel,
        purpose: d.purpose,
        status: d.granted ? 'granted' : 'withdrawn',
        ...(d.granted && d.channel === 'email' ? { basis: soft ? ('soft_opt_in' as const) : ('consent' as const) } : {}),
        source: d.source,
        method: d.method,
        ...(d.wordingVersion ? { wordingVersion: d.wordingVersion } : {}),
        capturedAt: at,
        recordedBy: 'system',
        ...(soft ? { evidence: { softOptIn: { optOutOfferedAt: d.optOutOfferedAt ?? at, context: 'signup' as const } } } : {}),
      };
      break;
    }
    case 'push_permission.changed':
      sig({ pushEnabled: event.data.granted });
      lines.push({ kind: 'consent', summary: event.data.granted ? 'Allowed notifications on their phone' : 'Turned off notifications on their phone' });
      break;
    case 'profile.updated': {
      const d = event.data;
      c = addIdentifiers(c, { ...(d.email ? { email: d.email } : {}), ...(d.phone ? { phone: d.phone } : {}) });
      if (d.firstName) c = { ...c, name: { ...c.name, first: d.firstName } };
      if (d.lastName) c = { ...c, name: { ...c.name, last: d.lastName } };
      if (d.timezone) c = { ...c, timezone: d.timezone };
      sig({ ...(d.city ? { city: d.city } : {}), ...(d.interests ? { interests: d.interests } : {}), ...(d.foundingBadge !== undefined ? { foundingBadge: d.foundingBadge } : {}) });
      if (d.foundingBadge !== undefined && c.signals.subscription?.tier) sig({ subscription: { ...c.signals.subscription, tier: d.foundingBadge ? 'founding' : 'member' } });
      break;
    }
    case 'invite.sent':
      lines.push({ kind: 'app_milestone', summary: 'Sent an invite' });
      break;
    case 'invite.accepted': {
      sig({ invitedJoined: (c.signals.invitedJoined ?? 0) + 1, invitedActive: (c.signals.invitedActive ?? 0) + 1 });
      const invitee = await deps.contacts.findByAppUserId(event.data.inviteeUserId);
      if (invitee && !invitee.signals.inviterContactId) await deps.contacts.save({ ...invitee, signals: { ...invitee.signals, inviterContactId: c.id } });
      lines.push({ kind: 'app_milestone', summary: invitee ? `${invitee.name.first} joined from their invite` : 'Someone joined from their invite' });
      break;
    }
    case 'friend.added':
      sig({ friendsCount: event.data.totalFriends });
      if (event.data.totalFriends === 1) {
        lines.push({ kind: 'app_milestone', summary: 'Added first friend' });
        trigger('friend.first_added', `friend1:${c.id}`);
      }
      break;
    case 'user.active': {
      const t = `${event.data.date}T12:00:00.000Z` > at ? at : `${event.data.date}T12:00:00.000Z`;
      if (!c.signals.lastActiveAt || t > c.signals.lastActiveAt) sig({ lastActiveAt: t });
      break;
    }
    case 'plan.created':
      sig({ plansCount: event.data.totalPlans });
      if (event.data.totalPlans === 1) {
        lines.push({ kind: 'app_milestone', summary: 'Made first plan' });
        trigger('plan.first_created', `plan1:${c.id}`);
      }
      break;
    case 'plan.completed':
      if (event.data.friendAttendees > 0) {
        const n = (c.signals.plansWithFriendsCount ?? 0) + 1;
        sig({ plansWithFriendsCount: n });
        if (n === 1) {
          lines.push({ kind: 'app_milestone', summary: 'Completed first plan with friends' });
          trigger('plan.first_completed_with_friends', `planfriends1:${c.id}`);
        }
      }
      break;
    case 'event.registration_started':
      sig({ lumaTaps: [...(c.signals.lumaTaps ?? []), { lumaEventId: event.data.lumaEventId, at }].slice(-5) });
      break;
    case 'perk.redeemed':
      lines.push({ kind: 'event', summary: `Redeemed a perk: ${event.data.perk}` });
      break;
    case 'account.status_changed':
      sig({ accountStatus: event.data.status === 'banned' ? 'suspended' : event.data.status });
      lines.push({ kind: 'app_milestone', summary: `Account ${event.data.status}` });
      break;
    case 'subscription.changed': {
      const d = event.data;
      const prev = c.signals.subscription ?? { status: 'none' as const, tier: null };
      if (d.kind === 'free_period_started') {
        if (d.expiresAt) sig({ freePeriod: { startedAt: at, endsAt: d.expiresAt } });
        subTrigger('free_period.started', `free:${c.id}`);
        lines.push({ kind: 'subscription', summary: 'Free 3 months started' });
        break;
      }
      if (d.kind === 'product_changed') {
        lines.push({ kind: 'subscription', summary: 'Changed membership plan' });
        break;
      }
      const status = STATUS_FOR_KIND[d.kind];
      const tier = status === 'expired' ? null : c.signals.foundingBadge ? 'founding' : 'member';
      sig({
        subscription: {
          ...prev,
          status,
          tier,
          ...(d.store ? { store: d.store } : {}),
          ...(d.expiresAt ? { expiresAt: d.expiresAt } : {}),
          willRenew: d.willRenew ?? (status === 'active'),
          everPaid: prev.everPaid || d.kind === 'started' || d.kind === 'renewed',
          ...(prev.startedAt ? { startedAt: prev.startedAt } : d.kind === 'started' || d.kind === 'renewed' ? { startedAt: at } : {}),
        },
      });
      const summary = {
        started: `Became a ${tier === 'founding' ? 'Founding Member' : 'Member'}${d.store === 'app_store' ? ' (App Store)' : d.store === 'play_store' ? ' (Google Play)' : ''}`,
        renewed: 'Membership renewed',
        uncancelled: 'Changed their mind: membership will renew',
        cancelled: 'Cancelled: membership ends at the end of this period',
        paused: 'Membership paused',
        billing_issue: 'Billing issue: payment failed',
        expired: 'Membership expired',
      }[d.kind];
      lines.push({ kind: 'subscription', summary });
      if (d.kind === 'started') subTrigger('subscribed', `subscribed:${event.eventId}`);
      if (d.kind === 'cancelled') subTrigger('cancelled', `cancelled:${event.eventId}`);
      if (d.kind === 'billing_issue') subTrigger('billing_issue', `billing:${event.eventId}`);
      if (d.kind === 'expired') subTrigger('expired', `expired:${event.eventId}`);
      break;
    }
    case 'website.lead_captured': {
      const d = event.data;
      if (c.lifecycle?.stage === 'Prospect' && !c.dropOff) c = { ...c, dropOff: { point: 'website_lead', at } };
      if (d.city && !c.signals.city) sig({ city: d.city });
      if (d.interest) sig({ interests: [...new Set([...(c.signals.interests ?? []), d.interest.toLowerCase()])] });
      lines.push({ kind: 'app_milestone', summary: `Left their email on the website${d.page ? ` (${d.page})` : ''}` });
      if (d.consent) {
        consentAfter = {
          contactId: c.id,
          channel: 'email',
          purpose: 'marketing',
          status: 'granted',
          basis: 'consent',
          source: 'website',
          method: 'checkbox_opt_in',
          wordingVersion: d.wordingVersion ?? deps.config.consentWording.website,
          capturedAt: at,
          recordedBy: 'system',
        };
      }
      break;
    }
  }

  // Lifecycle and segments.
  const life = applyLifecycle(c, now, deps.lifecycle);
  c = life.contact;
  if (life.change) triggers.push({ kind: 'lifecycle_changed', contactId: c.id, from: life.change.from, to: life.change.to, at });
  const membership = refreshMembership(c, await deps.segments.list(), now);
  c = { ...c, segmentIds: membership.segmentIds, updatedAt: now.toISOString() };
  for (const segmentId of membership.joined) triggers.push({ kind: 'segment_joined', contactId: c.id, segmentId, occasion: `seg:${segmentId}:${now.toISOString().slice(0, 10)}`, at });

  await deps.contacts.save(c);
  for (const l of lines) await deps.timeline.append({ id: deps.ids.next('tl'), contactId: c.id, kind: l.kind, summary: l.summary, at, actor: `system:${event.source}`, ownerOnly: c.ownerOnly });

  if (consentAfter) {
    if (event.type === 'website.lead_captured') {
      // One tick on the website form covers all three email purposes (see templates/consent/website-v1.md).
      for (const purpose of ['marketing', 'event_invites', 'product_updates'] as const) await recordConsent(deps, { ...consentAfter, purpose });
    } else await recordConsent(deps, consentAfter);
    // Consent can move someone in or out of segments (e.g. "agreed to event invites").
    const fresh = await deps.contacts.get(c.id);
    if (fresh) {
      const m = refreshMembership(fresh, await deps.segments.list(), now);
      for (const segmentId of m.joined) triggers.push({ kind: 'segment_joined', contactId: c.id, segmentId, occasion: `seg:${segmentId}:${now.toISOString().slice(0, 10)}`, at });
      if (m.joined.length || m.left.length) await deps.contacts.save({ ...fresh, segmentIds: m.segmentIds });
    }
  }

  deps.logger.info('ingest.processed', { eventId: event.eventId, type: event.type, contactId: c.id, created, triggers: triggers.length });
  return { status: 'processed', contactId: c.id, created, triggers };
}
