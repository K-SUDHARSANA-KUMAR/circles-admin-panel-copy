import customAxios from '@/lib/axios';
import { PULSE_URL } from '@/services/pulse.service';

// ─── Types (mirror user-service PulseInvitesResponseDto) ─────────────────────

/** Rates are fractions (0.4 = 40%). Null means "nothing to divide by". */
export interface InviteStats {
  users: number;
  inviters: number;
  invites: number;
  joined: number;
  verified: number;
  invitedShare: number | null;
  invitesPerUser: number | null;
  joinRate: number | null;
  verifiedRate: number | null;
  /** Invites per user x % verified. Above 1 = growth sustains itself. */
  newVerifiedPerUser: number | null;
}

export interface InviteSummary extends InviteStats {
  contactInvites: number;
  codeSignUps: number;
}

export interface InviteMonth extends InviteStats {
  month: string;
  partial: boolean;
}

export interface PulseInvites {
  generatedAt: string;
  summary: InviteSummary;
  monthly: InviteMonth[];
  bySignUpMonth: InviteMonth[];
  notes: string[];
}

// ─── Calls ───────────────────────────────────────────────────────────────────

/** The gateway may wrap the body as `{ result: { data } }` or `{ data }`. */
interface Wrapped<T> {
  data?: T & { data?: T; result?: { data?: T } };
}

const unwrap = <T,>(res: Wrapped<T>): T =>
  (res.data?.result?.data ?? res.data?.data ?? res.data) as T;

const message = (err: unknown, fallback: string): string => {
  const e = err as {
    message?: string;
    response?: { data?: { message?: string; result?: { message?: string } } };
  };
  return (
    e?.response?.data?.result?.message ||
    e?.response?.data?.message ||
    e?.message ||
    fallback
  );
};

export async function fetchPulseInvites(): Promise<PulseInvites> {
  try {
    return unwrap<PulseInvites>(await customAxios.get(`${PULSE_URL}/invites`));
  } catch (err: unknown) {
    throw new Error(message(err, 'Failed to load invite tracking'));
  }
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/** Invites per user and new users per user: two decimals ("0.31"). */
export const fmtPerUser = (v: number | null) => (v == null ? '—' : v.toFixed(2));

/** Above 1 the flywheel turns by itself (the brief's only threshold). */
export const flywheelBand = (
  v: number | null,
): 'self-sustaining' | 'below' | 'unknown' => {
  if (v == null) return 'unknown';
  return v > 1 ? 'self-sustaining' : 'below';
};
