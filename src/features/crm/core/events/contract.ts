/**
 * THE EVENT CONTRACT: every event the app and backend send to the CRM, validated strictly.
 * docs/events.md is written from this file. Anything that doesn't match is rejected and logged
 * (without personal data), never half-applied.
 *
 * TODO-SECURITY: events marked server-only must never be accepted from the phone. The callable
 * ingest function only accepts CLIENT_EVENT_TYPES and takes the appUserId from the verified
 * Firebase Auth token, ignoring whatever the payload claims.
 */
import { z } from 'zod/v4';
import { CONSENT_METHODS, PURPOSES } from '../model/consent';

const iso = z.iso.datetime({ offset: true });
const shortText = (max = 80) => z.string().trim().min(1).max(max);
const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_\-:.]+$/, 'letters, numbers and _-:. only');

export const subjectSchema = z
  .object({
    appUserId: id.optional(),
    installId: id.optional(),
    email: z.email().max(254).optional(),
    phone: z.string().max(32).optional(),
  })
  .strict()
  .refine((s) => !!(s.appUserId || s.installId || s.email || s.phone), 'subject needs at least one identifier');

export const EVENT_DATA = {
  'app.first_open': z.object({ platform: z.enum(['ios', 'android']), campaign: shortText(100).optional() }).strict(),
  'signup.started': z.object({ step: shortText(60).optional() }).strict(),
  'signup.contact_captured': z.object({ firstName: shortText().optional(), step: shortText(60).optional() }).strict(),
  'signup.step_completed': z.object({ step: shortText(60), stepIndex: z.number().int().min(0).max(50) }).strict(),
  'signup.completed': z
    .object({
      firstName: shortText(),
      lastName: shortText().optional(),
      city: shortText(60).optional(),
      timezone: shortText(60).optional(),
      invitedByUserId: id.optional(),
      inviteCode: shortText(40).optional(),
    })
    .strict(),
  'application.submitted': z.object({ route: z.enum(['invite', 'apply']), invitedByUserId: id.optional() }).strict(),
  'application.decided': z.object({ decision: z.enum(['approved', 'rejected', 'on_hold']), decidedBy: id, reasonCode: shortText(60).optional() }).strict(),
  'membership.free_period_started': z.object({ startedAt: iso, endsAt: iso }).strict(),
  'consent.updated': z
    .object({
      channel: z.enum(['email', 'push']),
      purpose: z.enum(PURPOSES),
      granted: z.boolean(),
      method: z.enum(CONSENT_METHODS),
      source: z.enum(['signup', 'settings']),
      wordingVersion: shortText(60).optional(),
      /** For soft opt-in at signup: when the opt-out box was shown. */
      optOutOfferedAt: iso.optional(),
    })
    .strict(),
  'push_permission.changed': z.object({ granted: z.boolean(), platform: z.enum(['ios', 'android']) }).strict(),
  'profile.updated': z
    .object({
      firstName: shortText().optional(),
      lastName: shortText().optional(),
      city: shortText(60).optional(),
      timezone: shortText(60).optional(),
      interests: z.array(shortText(40)).max(30).optional(),
      foundingBadge: z.boolean().optional(),
      email: z.email().max(254).optional(),
      phone: z.string().max(32).optional(),
    })
    .strict(),
  'invite.sent': z.object({ channel: shortText(30) }).strict(),
  'invite.accepted': z.object({ inviteeUserId: id }).strict(),
  'friend.added': z.object({ friendUserId: id, totalFriends: z.number().int().min(0).max(100_000), source: z.enum(['invite', 'discover', 'contacts', 'other']).optional() }).strict(),
  'user.active': z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).strict(),
  'plan.created': z.object({ planId: id, totalPlans: z.number().int().min(0) }).strict(),
  'plan.completed': z.object({ planId: id, friendAttendees: z.number().int().min(0) }).strict(),
  'event.registration_started': z.object({ lumaEventId: id }).strict(),
  'perk.redeemed': z.object({ venueId: id, perk: shortText() }).strict(),
  'account.status_changed': z.object({ status: z.enum(['active', 'suspended', 'banned', 'deleted']) }).strict(),
  /** Produced by the RevenueCat webhook mapper (never sent by the app). */
  'subscription.changed': z
    .object({
      kind: z.enum(['started', 'renewed', 'cancelled', 'uncancelled', 'billing_issue', 'expired', 'product_changed', 'paused', 'free_period_started']),
      store: z.enum(['app_store', 'play_store', 'web', 'promotional']).optional(),
      productId: shortText(120).optional(),
      expiresAt: iso.optional(),
      willRenew: z.boolean().optional(),
    })
    .strict(),
  /** Produced by the Framer webhook mapper. */
  'website.lead_captured': z
    .object({
      firstName: shortText().optional(),
      lastName: shortText().optional(),
      city: shortText(60).optional(),
      interest: shortText(60).optional(),
      page: shortText(200).optional(),
      consent: z.boolean(),
      wordingVersion: shortText(60).optional(),
    })
    .strict(),
  /** Produced by the Luma webhook mapper. */
  'luma.guest_changed': z
    .object({
      lumaEventId: id,
      guestId: id,
      name: shortText(120).optional(),
      status: z.enum(['registered', 'approved', 'waitlist', 'cancelled', 'refunded']),
      ticketTypeId: id.optional(),
      registeredAt: iso.optional(),
      checkedInAt: iso.optional(),
      consentAnswer: z.boolean().optional(),
      /** Across this guest's Luma orders, in pence. Refunds only ever grow. */
      amountPaidPence: z.number().int().min(0).max(100_000_000).optional(),
      refundedPence: z.number().int().min(0).max(100_000_000).optional(),
      /** The code used at Luma's checkout (a collaborator code or a member's personal code), upper case. */
      couponCode: z.string().trim().min(1).max(20).regex(/^[A-Z0-9_-]+$/).optional(),
      /** Booked by the club's backend for a member in the app, rather than by the guest on Luma. */
      inAppTicket: z.boolean().optional(),
    })
    .strict(),
} as const;

export type CrmEventType = keyof typeof EVENT_DATA;
export const CRM_EVENT_TYPES = Object.keys(EVENT_DATA) as CrmEventType[];

/** The only events the phone may send directly (through the callable, with App Check). */
export const CLIENT_EVENT_TYPES: readonly CrmEventType[] = ['app.first_open', 'signup.started', 'signup.step_completed', 'push_permission.changed', 'user.active', 'event.registration_started'];

export type CrmEvent = {
  [K in CrmEventType]: {
    eventId: string;
    type: K;
    occurredAt: string;
    source: 'app' | 'backend' | 'website' | 'luma' | 'revenuecat';
    subject: z.infer<typeof subjectSchema>;
    data: z.infer<(typeof EVENT_DATA)[K]>;
    schemaVersion: 1;
  };
}[CrmEventType];

const envelope = z
  .object({
    eventId: z.string().min(8).max(128).regex(/^[A-Za-z0-9_\-:.]+$/),
    type: z.enum(CRM_EVENT_TYPES as [CrmEventType, ...CrmEventType[]]),
    occurredAt: iso,
    source: z.enum(['app', 'backend', 'website', 'luma', 'revenuecat']),
    subject: subjectSchema,
    data: z.unknown(),
    schemaVersion: z.literal(1),
  })
  .strict();

export type ParseResult = { ok: true; event: CrmEvent } | { ok: false; errors: string[] };

export function parseEvent(raw: unknown): ParseResult {
  const env = envelope.safeParse(raw);
  if (!env.success) return { ok: false, errors: env.error.issues.map((i) => `${i.path.join('.') || '(event)'}: ${i.message}`) };
  const data = EVENT_DATA[env.data.type].safeParse(env.data.data);
  if (!data.success) return { ok: false, errors: data.error.issues.map((i) => `data.${i.path.join('.')}: ${i.message}`) };
  return { ok: true, event: { ...env.data, data: data.data } as CrmEvent };
}
