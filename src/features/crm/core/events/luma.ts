/**
 * Luma registrations and check-ins, joined to the right person.
 *
 * Luma doesn't promise to deliver webhooks in order, so changes are merged, not overwritten:
 * a status change older than the one already applied is ignored; a check-in, once recorded, stays;
 * refunds only grow. Repeats change nothing.
 *
 * Matching, in order: an existing registration for this guest → app account (in-app tickets) → email → phone → the person who
 * tapped "Register" for this event in the app shortly before (so it works even if they used a
 * different email on Luma) → otherwise, if someone with the same name exists, the "Needs
 * matching" list for a human; if not, a new Prospect.
 */
import { recordConsent } from '../consent/consentService';
import { normaliseEmail } from '../contacts/addressKind';
import { normalisePhone } from '../contacts/phone';
import { applyLifecycle } from '../lifecycle/derive';
import type { Contact } from '../model/contact';
import type { MatchQueueItem, Registration } from '../model/events';
import { refreshMembership } from '../segments/membership';
import type { CrmEvent } from './contract';
import { findContact, newProspect, type IngestDeps, type IngestResult, type TriggerSignal } from './ingest';

type LumaEvent = Extract<CrmEvent, { type: 'luma.guest_changed' }>;

/** How long before registering a tap on "Register" in the app still counts. */
const TAP_WINDOW_MS = 2 * 3_600_000;

async function matchByTap(deps: Pick<IngestDeps, 'contacts' | 'registrations'>, lumaEventId: string, registeredAt: string): Promise<Contact | undefined> {
  const t = Date.parse(registeredAt);
  const already = new Set((await deps.registrations.listForEvent(lumaEventId)).map((r) => r.contactId).filter(Boolean));
  const tappers = (await deps.contacts.list()).filter(
    (c) => !c.mergedInto && !already.has(c.id) && (c.signals.lumaTaps ?? []).some((tap) => tap.lumaEventId === lumaEventId && Date.parse(tap.at) <= t && t - Date.parse(tap.at) <= TAP_WINDOW_MS),
  );
  return tappers.length === 1 ? tappers[0] : undefined;
}

async function suggestionsFor(deps: Pick<IngestDeps, 'contacts'>, name: string | undefined, phone: string | undefined): Promise<string[]> {
  const n = (name ?? '').trim().toLowerCase();
  const tail = phone?.slice(-6);
  if (!n && !tail) return [];
  return (await deps.contacts.list())
    .filter((c) => !c.mergedInto && ((n && `${c.name.first} ${c.name.last ?? ''}`.trim().toLowerCase() === n) || (tail && c.phones.some((p) => p.e164.endsWith(tail)))))
    .map((c) => c.id)
    .slice(0, 5);
}

/** Apply a registration's effects to the person: timeline, check-in counts, consent, triggers. */
export async function applyRegistration(deps: IngestDeps, contact: Contact, reg: Registration, previous: Registration | undefined): Promise<TriggerSignal[]> {
  const now = deps.clock.now();
  const triggers: TriggerSignal[] = [];
  const event = await deps.lumaEvents.get(reg.lumaEventId);
  const name = event?.name ?? 'an event';
  let c = contact;
  const lines: { kind: 'event'; summary: string; at: string }[] = [];
  if (!previous?.contactId || previous.contactId !== c.id) {
    if (reg.status !== 'cancelled' && reg.status !== 'refunded') lines.push({ kind: 'event', summary: `Registered for ${name}${reg.inAppTicket ? ' (in the app)' : ''}`, at: reg.registeredAt });
  }
  if (reg.status === 'cancelled' && previous && previous.status !== 'cancelled') lines.push({ kind: 'event', summary: `Cancelled their place at ${name}`, at: now.toISOString() });
  if (reg.status === 'refunded' && previous?.status !== 'refunded') lines.push({ kind: 'event', summary: `Refunded for ${name}`, at: now.toISOString() });
  if (reg.checkedInAt && (!previous?.checkedInAt || previous.contactId !== c.id)) {
    c = {
      ...c,
      signals: {
        ...c.signals,
        eventsAttended: (c.signals.eventsAttended ?? 0) + 1,
        lastEventAt: !c.signals.lastEventAt || reg.checkedInAt > c.signals.lastEventAt ? reg.checkedInAt : c.signals.lastEventAt,
      },
    };
    lines.push({ kind: 'event', summary: `Came to ${name}`, at: reg.checkedInAt });
    triggers.push({ kind: 'app_event', event: 'event.checked_in', contactId: c.id, occasion: `checkin:${reg.lumaGuestId}`, at: reg.checkedInAt });
  }
  const life = applyLifecycle(c, now, deps.lifecycle);
  c = life.contact;
  if (life.change) triggers.push({ kind: 'lifecycle_changed', contactId: c.id, from: life.change.from, to: life.change.to, at: now.toISOString() });
  const m = refreshMembership(c, await deps.segments.list(), now);
  c = { ...c, segmentIds: m.segmentIds, updatedAt: now.toISOString() };
  for (const segmentId of m.joined) triggers.push({ kind: 'segment_joined', contactId: c.id, segmentId, occasion: `seg:${segmentId}:${now.toISOString().slice(0, 10)}`, at: now.toISOString() });
  await deps.contacts.save(c);
  for (const l of lines) await deps.timeline.append({ id: deps.ids.next('tl'), contactId: c.id, kind: l.kind, summary: l.summary, at: l.at, actor: 'system:luma', ownerOnly: c.ownerOnly });

  // The optional "Keep me posted" question on the Luma form (templates/consent/luma-v1.md).
  if (reg.consentAnswer === true && previous?.consentAnswer !== true) {
    for (const purpose of ['event_invites', 'marketing'] as const) {
      await recordConsent(deps, {
        contactId: c.id,
        channel: 'email',
        purpose,
        status: 'granted',
        basis: 'consent',
        source: 'luma',
        method: 'checkbox_opt_in',
        wordingVersion: deps.config.consentWording.luma,
        capturedAt: reg.registeredAt,
        recordedBy: 'system',
        evidence: { lumaGuestId: reg.lumaGuestId },
      });
    }
  }
  return triggers;
}

/** Rank of a status when two changes carry the same time: the later stage of a booking wins. */
const STATUS_RANK: Record<Registration['status'], number> = { waitlist: 0, registered: 1, approved: 2, cancelled: 3, refunded: 4 };

/**
 * Merge one Luma change into what we already know about a guest. Pure, so it can be tested in any
 * order: the result is the same however the deliveries arrive.
 */
export function mergeRegistration(previous: Registration | undefined, event: LumaEvent, newId: () => string): Registration {
  const d = event.data;
  const at = event.occurredAt;
  const last = previous?.lumaUpdatedAt;
  const newer = !previous || !last || at > last || (at === last && STATUS_RANK[d.status] >= STATUS_RANK[previous.status]);
  const status = newer ? d.status : previous!.status;
  const earliest = (a?: string, b?: string) => (a && b ? (a < b ? a : b) : (a ?? b));
  const checkedInAt = earliest(previous?.checkedInAt, d.checkedInAt);
  const ticketTypeId = newer ? (d.ticketTypeId ?? previous?.ticketTypeId) : (previous?.ticketTypeId ?? d.ticketTypeId);
  const consentAnswer = newer ? (d.consentAnswer ?? previous?.consentAnswer) : (previous?.consentAnswer ?? d.consentAnswer);
  const amountPaidPence = Math.max(previous?.amountPaidPence ?? 0, d.amountPaidPence ?? 0);
  const refundedPence = Math.max(previous?.refundedPence ?? 0, d.refundedPence ?? 0);
  const couponCode = previous?.couponCode ?? d.couponCode;
  return {
    id: previous?.id ?? newId(),
    lumaEventId: d.lumaEventId,
    lumaGuestId: d.guestId,
    status,
    registeredAt: earliest(previous?.registeredAt, d.registeredAt) ?? at,
    lumaUpdatedAt: last && last > at ? last : at,
    ...(ticketTypeId ? { ticketTypeId } : {}),
    ...(checkedInAt ? { checkedInAt } : {}),
    ...(consentAnswer !== undefined ? { consentAnswer } : {}),
    ...(amountPaidPence ? { amountPaidPence } : {}),
    ...(refundedPence ? { refundedPence } : {}),
    ...(couponCode ? { couponCode } : {}),
    ...(previous?.inAppTicket || d.inAppTicket ? { inAppTicket: true } : {}),
    ...(previous?.contactId ? { contactId: previous.contactId } : {}),
    ...(previous?.matchedBy ? { matchedBy: previous.matchedBy } : {}),
  };
}

export async function handleLumaGuest(deps: IngestDeps, event: LumaEvent): Promise<IngestResult> {
  const d = event.data;
  const now = deps.clock.now().toISOString();
  const previous = await deps.registrations.findByGuestId(d.guestId);
  const reg = mergeRegistration(previous, event, () => deps.ids.next('reg'));

  let contact = reg.contactId ? await deps.contacts.get(reg.contactId) : undefined;
  let created = false;
  if (!contact) {
    contact = await findContact(deps, event.subject);
    if (contact) {
      reg.matchedBy =
        event.subject.appUserId && contact.appUserId === event.subject.appUserId
          ? 'app_ticket'
          : event.subject.email && contact.emails.some((e) => e.normalised === normaliseEmail(event.subject.email!))
            ? 'email'
            : 'phone';
    }
  }
  if (!contact) {
    contact = await matchByTap(deps, d.lumaEventId, reg.registeredAt);
    if (contact) reg.matchedBy = 'app_tap';
  }
  if (!contact) {
    const phone = normalisePhone(event.subject.phone);
    const suggestions = await suggestionsFor(deps, d.name, phone);
    if (suggestions.length > 0) {
      await deps.registrations.save(reg);
      const item: MatchQueueItem = {
        id: deps.ids.next('mq'),
        kind: 'luma_guest',
        lumaEventId: d.lumaEventId,
        lumaGuestId: d.guestId,
        name: d.name ?? event.subject.email ?? 'Unknown guest',
        ...(event.subject.email ? { email: normaliseEmail(event.subject.email) } : {}),
        ...(phone ? { phone } : {}),
        suggestions,
        createdAt: now,
      };
      await deps.matchQueue.save(item);
      return { status: 'queued', triggers: [], note: 'Possible match needs a person to confirm' };
    }
    const [first, ...rest] = (d.name ?? '').trim().split(/\s+/);
    contact = newProspect(deps, {
      ...(first ? { first } : {}),
      ...(rest.length ? { last: rest.join(' ') } : {}),
      ...(event.subject.email ? { email: event.subject.email } : {}),
      ...(phone ? { phone } : {}),
      channel: 'luma',
      detail: 'Registered for an event on Luma',
      at: event.occurredAt,
    });
    contact = { ...contact, dropOff: { point: 'luma_registration', at: event.occurredAt } };
    await deps.contacts.save(contact);
    created = true;
    reg.matchedBy = 'email';
  }
  reg.contactId = contact.id;
  await deps.registrations.save(reg);
  const triggers = await applyRegistration(deps, contact, reg, previous);
  return { status: 'processed', contactId: contact.id, created, triggers };
}

/** A person resolves an item on the "Needs matching" list: link to a contact, or create a new one. */
export async function resolveMatch(deps: IngestDeps, adminId: string, itemId: string, to: string | 'new'): Promise<IngestResult> {
  const item = await deps.matchQueue.get(itemId);
  if (!item || item.resolvedAt) return { status: 'ignored', triggers: [] };
  const reg = await deps.registrations.findByGuestId(item.lumaGuestId);
  if (!reg) return { status: 'ignored', triggers: [] };
  let contact: Contact | undefined;
  let created = false;
  if (to === 'new') {
    const [first, ...rest] = item.name.trim().split(/\s+/);
    contact = newProspect(deps, {
      ...(first ? { first } : {}),
      ...(rest.length ? { last: rest.join(' ') } : {}),
      ...(item.email ? { email: item.email } : {}),
      ...(item.phone ? { phone: item.phone } : {}),
      channel: 'luma',
      detail: 'Registered for an event on Luma',
      at: reg.registeredAt,
    });
    contact = { ...contact, dropOff: { point: 'luma_registration', at: reg.registeredAt } };
    await deps.contacts.save(contact);
    created = true;
  } else {
    contact = await deps.contacts.get(to);
    if (!contact) return { status: 'ignored', triggers: [] };
    // Remember their Luma email so next time they match automatically.
    if (item.email && !contact.emails.some((e) => e.normalised === item.email)) {
      contact = { ...contact, emails: [...contact.emails, { address: item.email, normalised: item.email, kind: 'personal', primary: contact.emails.length === 0 }] };
      await deps.contacts.save(contact);
    }
  }
  const linked: Registration = { ...reg, contactId: contact.id, matchedBy: 'manual' };
  await deps.registrations.save(linked);
  await deps.matchQueue.save({ ...item, resolvedAt: deps.clock.now().toISOString(), resolvedTo: to === 'new' ? 'new' : contact.id, resolvedBy: adminId });
  // Treat it as new for this person, so their check-in and consent answer are applied now.
  const { checkedInAt: _c, consentAnswer: _a, contactId: _id, ...unlinked } = reg;
  const triggers = await applyRegistration(deps, contact, linked, unlinked);
  return { status: 'processed', contactId: contact.id, created, triggers };
}
