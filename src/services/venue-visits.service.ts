import customAxios from '@/lib/axios';
import { ADMIN_VENUES_URL } from '@/services/venue.service';

// `${BASE_URL}/user-service/admin` — the visit totals sit beside admin/venues.
const ADMIN_URL = ADMIN_VENUES_URL.replace(/\/venues$/, '');

/** Visit numbers for one venue over one window. Totals only, never names. */
export interface VisitCounts {
  /** One member at one venue on one UK day = one visit (perk redeem and/or I'm here). */
  visits: number;
  /** Different members behind those visits. */
  visitors: number;
  /** Counted (not voided) perk redemptions. */
  perkRedemptions: number;
  /** "I'm here" check-ins. */
  checkIns: number;
}

export interface VenueVisits {
  venueId: string;
  /** The current UK month unless a window was asked for. */
  period: VisitCounts;
  allTime: VisitCounts;
}

interface ApiEnvelope<T> {
  data?: T | { data?: T; result?: { data?: T } };
}

const unwrap = <T,>(res: ApiEnvelope<T>): T | undefined => {
  const body = res.data as { data?: T; result?: { data?: T } } | undefined;
  return body?.result?.data ?? body?.data ?? (res.data as T | undefined);
};

interface ApiError {
  message?: string;
  response?: { data?: { message?: string; result?: { message?: string } } };
}

/** Verified-visit totals for up to 100 venues (one list page), keyed by venue id. */
export async function fetchVenueVisits(
  venueIds: string[],
): Promise<Map<string, VenueVisits>> {
  const ids = [...new Set(venueIds.filter(Boolean))];
  if (!ids.length) return new Map();
  try {
    const res = await customAxios.get(`${ADMIN_URL}/venue-visits`, {
      params: { venueIds: ids.join(',') },
    });
    const data = unwrap<{ venues?: VenueVisits[] }>(res);
    const venues = data?.venues ?? [];
    return new Map(venues.map((v) => [v.venueId, v]));
  } catch (caught) {
    const err = caught as ApiError;
    const msg =
      err.response?.data?.result?.message ||
      err.response?.data?.message ||
      err.message ||
      'Failed to load venue visits';
    throw new Error(msg);
  }
}
