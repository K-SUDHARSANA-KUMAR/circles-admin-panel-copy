/**
 * Turning third-party webhooks into CRM events, and checking they're genuine.
 *
 * RevenueCat is the source of truth for subscriptions; Luma for event registrations and
 * check-ins; Framer for the website form. Each mapper returns a validated CrmEvent or a reason
 * it was ignored. Nothing here trusts the payload until the signature has been checked.
 */
import { normaliseEmail } from '../contacts/addressKind';
import { parseEvent, type CrmEvent } from './contract';

// ---------------------------------------------------------------------------------------
// Signature checks (Web Crypto, so they run anywhere)

const enc = new TextEncoder();

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(key: Uint8Array, message: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(message)));
}
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** RevenueCat sends the Authorization header value you set in its dashboard. */
export function verifyRevenueCatAuth(header: string | undefined, expected: string): boolean {
  return !!header && !!expected && constantTimeEqual(header.trim(), expected.trim());
}

/**
 * Framer: "Framer-Signature: sha256=<hex>" = HMAC-SHA256(secret, rawBody + submissionId).
 * TODO-SECURITY: confirm the exact concatenation against Framer's docs when wiring up.
 */
export async function verifyFramerSignature(secret: string, rawBody: string, submissionId: string, header: string | undefined): Promise<boolean> {
  if (!header?.startsWith('sha256=') || !secret) return false;
  const expected = hex(await hmac(enc.encode(secret), rawBody + submissionId));
  return constantTimeEqual(header.slice(7), expected);
}

/**
 * Svix-style signatures (Resend webhooks): base64 HMAC-SHA256 of "id.timestamp.body", keyed with
 * the base64 part of the "whsec_…" secret. Rejects anything older than 5 minutes (replays).
 */
export async function verifySvixSignature(
  secret: string,
  headers: { id?: string; timestamp?: string; signature?: string },
  rawBody: string,
  nowMs: number,
): Promise<boolean> {
  if (!headers.id || !headers.timestamp || !headers.signature || !secret.startsWith('whsec_')) return false;
  const ts = Number(headers.timestamp) * 1000;
  if (!Number.isFinite(ts) || Math.abs(nowMs - ts) > 5 * 60_000) return false;
  const expected = b64(await hmac(fromB64(secret.slice(6)), `${headers.id}.${headers.timestamp}.${rawBody}`));
  return headers.signature.split(' ').some((part) => constantTimeEqual(part.replace(/^v1,/, ''), expected));
}

/**
 * Luma: "Webhook-Signature: t=<unix>,v1=<hex>" with a "whsec_" secret.
 * TODO-SECURITY: Luma's docs describe the header; confirm the signed string ("t.body" assumed here)
 * against a real delivery before go-live, and keep the 5-minute replay window.
 */
export async function verifyLumaSignature(secret: string, header: string | undefined, rawBody: string, nowMs: number): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.trim().split('=') as [string, string]));
  const t = Number(parts.t) * 1000;
  if (!parts.v1 || !Number.isFinite(t) || Math.abs(nowMs - t) > 5 * 60_000) return false;
  const expected = hex(await hmac(enc.encode(secret), `${parts.t}.${rawBody}`));
  return constantTimeEqual(parts.v1, expected);
}

// ---------------------------------------------------------------------------------------
// RevenueCat

export interface RevenueCatWebhook {
  api_version?: string;
  event: {
    id: string;
    type: string;
    app_user_id: string;
    original_app_user_id?: string;
    aliases?: string[];
    period_type?: string;
    store?: string;
    environment?: string;
    product_id?: string;
    event_timestamp_ms?: number;
    purchased_at_ms?: number;
    expiration_at_ms?: number | null;
    is_trial_conversion?: boolean;
  };
}

const STORES: Record<string, 'app_store' | 'play_store' | 'web' | 'promotional'> = {
  APP_STORE: 'app_store',
  MAC_APP_STORE: 'app_store',
  PLAY_STORE: 'play_store',
  PROMOTIONAL: 'promotional',
  STRIPE: 'web',
  RC_BILLING: 'web',
  PADDLE: 'web',
};

export type MapResult = { event: CrmEvent } | { ignored: string };

export function mapRevenueCatEvent(body: RevenueCatWebhook, options: { acceptSandbox: boolean }): MapResult {
  const e = body?.event;
  if (!e?.id || !e.type || !e.app_user_id) return { ignored: 'Not a RevenueCat event' };
  if (e.type === 'TEST') return { ignored: 'RevenueCat test event' };
  if (e.environment === 'SANDBOX' && !options.acceptSandbox) return { ignored: 'Sandbox purchase (test), ignored in production' };
  const store = e.store ? STORES[e.store] : undefined;
  const expiresAt = e.expiration_at_ms ? new Date(e.expiration_at_ms).toISOString() : undefined;
  const freePeriod = e.period_type === 'TRIAL' || e.period_type === 'PROMOTIONAL' || store === 'promotional';
  let kind: Extract<CrmEvent, { type: 'subscription.changed' }>['data']['kind'] | undefined;
  switch (e.type) {
    case 'INITIAL_PURCHASE':
      kind = freePeriod ? 'free_period_started' : 'started';
      break;
    case 'RENEWAL':
      kind = e.is_trial_conversion ? 'started' : 'renewed';
      break;
    case 'NON_RENEWING_PURCHASE':
      // RevenueCat reports a promotional grant (how the free 3 months are given) this way.
      kind = freePeriod ? 'free_period_started' : 'started';
      break;
    case 'CANCELLATION':
      kind = freePeriod ? undefined : 'cancelled';
      break;
    case 'UNCANCELLATION':
      kind = 'uncancelled';
      break;
    case 'BILLING_ISSUE':
      kind = 'billing_issue';
      break;
    case 'EXPIRATION':
      kind = freePeriod ? undefined : 'expired';
      break;
    case 'PRODUCT_CHANGE':
      kind = 'product_changed';
      break;
    case 'SUBSCRIPTION_PAUSED':
      kind = 'paused';
      break;
    default:
      kind = undefined;
  }
  if (!kind) return { ignored: `RevenueCat ${e.type}${freePeriod ? ' (free period)' : ''}: nothing to change` };
  const parsed = parseEvent({
    eventId: `rc:${e.id}`,
    type: 'subscription.changed',
    occurredAt: new Date(e.event_timestamp_ms ?? e.purchased_at_ms ?? Date.now()).toISOString(),
    source: 'revenuecat',
    subject: { appUserId: e.app_user_id },
    data: {
      kind,
      ...(store ? { store } : {}),
      ...(e.product_id ? { productId: e.product_id } : {}),
      ...(expiresAt ? { expiresAt } : {}),
      ...(kind === 'cancelled' ? { willRenew: false } : kind === 'started' || kind === 'renewed' || kind === 'uncancelled' ? { willRenew: true } : {}),
    },
    schemaVersion: 1,
  });
  return parsed.ok ? { event: parsed.event } : { ignored: `Invalid RevenueCat event: ${parsed.errors.join('; ')}` };
}

// ---------------------------------------------------------------------------------------
// Luma

/** Luma's guest payload. Field names changed in June 2026; the old ones are still read. */
export interface LumaGuestPayload {
  id?: string;
  /** Older name for `id`. */
  api_id?: string;
  /** Older payloads only: the event's id. Current payloads nest the whole event under `event`. */
  event_api_id?: string;
  event?: { id?: string; api_id?: string };
  user_email?: string;
  user_name?: string;
  user_first_name?: string;
  user_last_name?: string;
  phone_number?: string;
  approval_status?: string;
  registered_at?: string;
  created_at?: string;
  registration_answers?: { label?: string; question?: string; answer?: unknown; value?: unknown }[];
  event_tickets?: { id?: string; event_ticket_type_id?: string; checked_in_at?: string | null; amount?: number }[];
  /** Only on ticket.registered: the ticket this delivery is about. */
  event_ticket?: { id?: string; event_ticket_type_id?: string; amount?: number };
  event_ticket_orders?: { id?: string; amount?: number; amount_refunded?: number; currency?: string; coupon_info?: { code?: string } | null }[];
  /** Only on guest.refunded. */
  refund?: { amount?: number; currency?: string; event_ticket_order_id?: string };
  utm_source?: string | null;
  checked_in_at?: string | null;
}

export interface LumaWebhook {
  type: string;
  data: LumaGuestPayload;
}

export const LUMA_GUEST_WEBHOOKS = ['guest.registered', 'guest.updated', 'ticket.registered', 'guest.refunded'] as const;

const LUMA_STATUS: Record<string, 'registered' | 'approved' | 'waitlist' | 'cancelled'> = {
  approved: 'approved',
  pending_approval: 'registered',
  invited: 'registered',
  session: 'registered',
  waitlist: 'waitlist',
  declined: 'cancelled',
};

/** The guest's id and their event's id, from either the current or the older field names. */
export function lumaGuestIds(d: LumaGuestPayload): { guestId?: string; lumaEventId?: string } {
  const guestId = d.id ?? d.api_id;
  const lumaEventId = d.event?.id ?? d.event?.api_id ?? d.event_api_id;
  return { ...(guestId ? { guestId } : {}), ...(lumaEventId ? { lumaEventId } : {}) };
}

/** Money and codes across a guest's orders, in pence (Luma amounts are in minor units). */
export function lumaMoney(d: LumaGuestPayload): { amountPaidPence?: number; refundedPence?: number; couponCode?: string } {
  const orders = d.event_ticket_orders ?? [];
  const sum = (xs: (number | undefined)[]) => xs.reduce<number>((t, x) => t + (Number.isFinite(x) ? Math.max(0, Math.round(x!)) : 0), 0);
  const paid = orders.length ? sum(orders.map((o) => o.amount)) : d.event_tickets?.length ? sum(d.event_tickets.map((t) => t.amount)) : undefined;
  const refunded = orders.length ? sum(orders.map((o) => o.amount_refunded)) : d.refund?.amount !== undefined ? sum([d.refund.amount]) : undefined;
  const code = orders.map((o) => o.coupon_info?.code).find((x): x is string => !!x);
  const couponCode = code ? code.replace(/\s+/g, '').toUpperCase().slice(0, 20) : undefined;
  return {
    ...(paid !== undefined ? { amountPaidPence: paid } : {}),
    ...(refunded !== undefined ? { refundedPence: refunded } : {}),
    ...(couponCode && /^[A-Z0-9_-]+$/.test(couponCode) ? { couponCode } : {}),
  };
}

/**
 * A stable fingerprint of a webhook body, used as its id when Luma doesn't send a Webhook-Id, so a
 * retry is still recognised as the same delivery. FNV-1a over the body with its keys sorted.
 */
export function lumaFingerprint(body: unknown): string {
  const canonical = (v: unknown): string => {
    if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
    if (v && typeof v === 'object') {
      return `{${Object.keys(v as Record<string, unknown>)
        .sort()
        .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
        .join(',')}}`;
    }
    return JSON.stringify(v ?? null);
  };
  const text = canonical(body);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x811c9dc5) >>> 0;
  }
  return `fp${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

/**
 * Turns a Luma guest webhook into a CRM event.
 *
 * `deliveryId` is Luma's Webhook-Id header (or lumaFingerprint(body) if there isn't one).
 * `sentAt` is when Luma sent it (the Webhook-Timestamp header): it orders changes that arrive out
 * of order. `consentQuestion` is the exact wording of the luma-v1 Checkbox question.
 */
export function mapLumaWebhook(body: LumaWebhook, deliveryId: string, sentAt: string, consentQuestion: string): MapResult {
  if (!(LUMA_GUEST_WEBHOOKS as readonly string[]).includes(body?.type)) return { ignored: `Luma ${body?.type ?? 'unknown'}: not a guest change` };
  const d = body.data ?? {};
  const { guestId, lumaEventId } = lumaGuestIds(d);
  if (!guestId || !lumaEventId) return { ignored: 'Luma guest without ids' };
  const checkedIn = d.checked_in_at ?? d.event_tickets?.find((t) => t.checked_in_at)?.checked_in_at ?? undefined;
  const question = consentQuestion.trim().toLowerCase();
  const answer = d.registration_answers?.find((a) => (a.label ?? a.question ?? '').trim().toLowerCase() === question);
  const consentAnswer = answer ? answer.answer === true || answer.value === true || /^(yes|true|checked)$/i.test(String(answer.answer ?? answer.value ?? '')) : undefined;
  const name = d.user_name ?? [d.user_first_name, d.user_last_name].filter(Boolean).join(' ');
  const money = lumaMoney(d);
  const fullyRefunded = (money.refundedPence ?? 0) > 0 && (money.refundedPence ?? 0) >= (money.amountPaidPence ?? 0);
  const status = fullyRefunded ? 'refunded' : (LUMA_STATUS[d.approval_status ?? 'approved'] ?? 'registered');
  const ticketTypeId = d.event_ticket?.event_ticket_type_id ?? d.event_tickets?.[0]?.event_ticket_type_id;
  const parsed = parseEvent({
    eventId: `luma:${deliveryId}`,
    type: 'luma.guest_changed',
    occurredAt: sentAt,
    source: 'luma',
    subject: { ...(d.user_email ? { email: normaliseEmail(d.user_email) } : {}), ...(d.phone_number ? { phone: d.phone_number } : {}), ...(!d.user_email && !d.phone_number ? { installId: `luma-${guestId}` } : {}) },
    data: {
      lumaEventId,
      guestId,
      ...(name ? { name } : {}),
      status,
      ...(ticketTypeId ? { ticketTypeId } : {}),
      ...(d.registered_at ?? d.created_at ? { registeredAt: (d.registered_at ?? d.created_at)! } : {}),
      ...(checkedIn ? { checkedInAt: checkedIn } : {}),
      ...(consentAnswer !== undefined ? { consentAnswer } : {}),
      ...money,
    },
    schemaVersion: 1,
  });
  return parsed.ok ? { event: parsed.event } : { ignored: `Invalid Luma guest: ${parsed.errors.join('; ')}` };
}

// ---------------------------------------------------------------------------------------
// Framer

/** Framer posts the form's fields as JSON: { email, name, keep_posted, wording_version, … }. */
export function mapFramerSubmission(fields: Record<string, unknown>, submissionId: string, receivedAt: string, defaults: { wordingVersion: string }): MapResult {
  const str = (k: string) => (typeof fields[k] === 'string' ? (fields[k] as string).trim() : undefined);
  const email = str('email') ?? str('Email');
  if (!email) return { ignored: 'Website form without an email' };
  const name = str('name') ?? str('Name') ?? '';
  const [first, ...rest] = name.split(/\s+/).filter(Boolean);
  const tick = fields.keep_posted ?? fields.keepPosted ?? fields.consent;
  const parsed = parseEvent({
    eventId: `framer:${submissionId}`,
    type: 'website.lead_captured',
    occurredAt: receivedAt,
    source: 'website',
    subject: { email: normaliseEmail(email) },
    data: {
      ...(str('first_name') ?? first ? { firstName: (str('first_name') ?? first)! } : {}),
      ...(str('last_name') ?? (rest.length ? rest.join(' ') : undefined) ? { lastName: (str('last_name') ?? rest.join(' '))! } : {}),
      ...(str('city') ? { city: str('city')! } : {}),
      ...(str('interest') ? { interest: str('interest')! } : {}),
      ...(str('page') ? { page: str('page')! } : {}),
      consent: tick === true || tick === 'true' || tick === 'on' || tick === 'yes',
      wordingVersion: str('wording_version') ?? defaults.wordingVersion,
    },
    schemaVersion: 1,
  });
  return parsed.ok ? { event: parsed.event } : { ignored: `Invalid website form: ${parsed.errors.join('; ')}` };
}
