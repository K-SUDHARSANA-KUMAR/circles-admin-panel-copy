import customAxios from '@/lib/axios';
import { ADMIN_VENUES_URL, type PerkPeriod } from '@/services/venue.service';

// `${BASE_URL}/user-service/admin` — the perk logs sit beside admin/venues.
const ADMIN_URL = ADMIN_VENUES_URL.replace(/\/venues$/, '');

export interface PerkLogUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}

export interface PerkRedemption {
  id: string;
  venueId: string | null;
  venueName: string;
  perkTitle: string | null;
  perkLimit: number;
  perkPeriod: PerkPeriod;
  periodStartsAt: string;
  redeemedAt: string;
  platform: 'ios' | 'android' | null;
  user: PerkLogUser | null;
  voided: boolean;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
}

export interface PerkCaptureEvent {
  id: string;
  venueId: string | null;
  venueName: string | null;
  kind: 'screenshot' | 'screen_recording';
  platform: 'ios' | 'android' | null;
  createdAt: string;
  user: PerkLogUser | null;
}

export interface PerkLogParams {
  venueId?: string;
  userId?: string;
  /** ISO time, included. */
  from?: string;
  /** ISO time, not included. */
  to?: string;
  page?: number;
  limit?: number;
}

export interface PerkLogPage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type RedemptionPage = PerkLogPage<PerkRedemption> & {
  /** Counts for the same filter: still counted vs voided. */
  summary: { redeemed: number; voided: number };
};

/** The API wraps payloads as { result: { data } } or { data }; accept either. */
function unwrap<T>(body: unknown): Partial<T> {
  const b = body as { result?: { data?: T }; data?: T } | undefined;
  return (b?.result?.data ?? b?.data ?? body ?? {}) as Partial<T>;
}

function errorMessage(err: unknown, fallback: string): string {
  const e = err as
    | {
        message?: string;
        response?: { data?: { message?: string; result?: { message?: string } } };
      }
    | undefined;
  return (
    e?.response?.data?.result?.message || e?.response?.data?.message || e?.message || fallback
  );
}

/** Drops empty values so the API never gets e.g. `venueId=`. */
function cleanParams(params: PerkLogParams): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') out[k] = v as string | number;
  });
  return out;
}

export async function fetchPerkRedemptions(
  params: PerkLogParams,
): Promise<RedemptionPage> {
  try {
    const res = await customAxios.get(`${ADMIN_URL}/perk-redemptions`, {
      params: cleanParams(params),
    });
    const data = unwrap<RedemptionPage>(res.data);
    return {
      items: data.items ?? [],
      total: data.total ?? 0,
      page: data.page ?? params.page ?? 1,
      limit: data.limit ?? params.limit ?? 20,
      totalPages: data.totalPages ?? 1,
      summary: data.summary ?? { redeemed: 0, voided: 0 },
    };
  } catch (err: unknown) {
    throw new Error(errorMessage(err, 'Failed to load perk redemptions'));
  }
}

/** Voids a redeem: it stays in the log but no longer counts toward the member's limit. */
export async function voidPerkRedemption(
  id: string,
  reason?: string,
): Promise<PerkRedemption> {
  try {
    const res = await customAxios.post(`${ADMIN_URL}/perk-redemptions/${id}/void`, {
      reason: reason?.trim() || undefined,
    });
    return unwrap<PerkRedemption>(res.data) as PerkRedemption;
  } catch (err: unknown) {
    throw new Error(errorMessage(err, 'Failed to void the redemption'));
  }
}

export async function fetchPerkCaptureEvents(
  params: PerkLogParams,
): Promise<PerkLogPage<PerkCaptureEvent>> {
  try {
    const res = await customAxios.get(`${ADMIN_URL}/perk-capture-events`, {
      params: cleanParams(params),
    });
    const data = unwrap<PerkLogPage<PerkCaptureEvent>>(res.data);
    return {
      items: data.items ?? [],
      total: data.total ?? 0,
      page: data.page ?? params.page ?? 1,
      limit: data.limit ?? params.limit ?? 20,
      totalPages: data.totalPages ?? 1,
    };
  } catch (err: unknown) {
    throw new Error(errorMessage(err, 'Failed to load the screenshot log'));
  }
}
