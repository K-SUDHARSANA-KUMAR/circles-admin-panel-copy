import { apiEndPoint } from '@/features/apiEndPoint';
import { isAxiosError } from 'axios';
import customAxios from '@/lib/axios';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || (apiEndPoint.CITIES_ENDPOINT as string).replace('/cities', '');
export const ADMIN_EVENTS_URL = `${BASE_URL}/core-service/admin/admin-events`;

/** everyone: all users see and join. members_only: all users see, only members join. */
export type AdminEventAudience = 'everyone' | 'members_only';

/** Admin-created event pinned to the top of the app's All Moments tab. Tickets live on Luma. */
export interface AdminEvent {
  id: string;
  title: string;
  description: string | null;
  venue: { id: string; name: string } | null;
  locationName: string | null;
  startsAt: string;
  endsAt: string;
  visibleUntil: string | null;
  coverImageS3FileName: string | null;
  coverImageUrl: string | null;
  lumaUrl: string;
  isPublished: boolean;
  audience: AdminEventAudience;
  /** Member early access: everyone else can join from this time. Null = no early access. */
  generalAccessAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminEventPayload {
  title: string;
  description: string | null;
  venueId: string | null;
  locationName: string | null;
  startsAt: string;
  endsAt: string;
  visibleUntil: string | null;
  coverImageS3FileName: string | null;
  lumaUrl: string;
  isPublished: boolean;
  audience: AdminEventAudience;
  generalAccessAt: string | null;
}

type Envelope = { result?: { data?: unknown }; data?: unknown };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- callers know the shape; same unwrap as venue.service
const unwrap = (res: { data: Envelope }): any => res.data?.result?.data ?? res.data?.data ?? res.data;

const toError = (err: unknown, fallback: string) => {
  const body = isAxiosError(err) ? err.response?.data : undefined;
  const raw = body?.result?.message || body?.message || (err instanceof Error ? err.message : '') || fallback;
  return new Error(Array.isArray(raw) ? raw.join(', ') : raw);
};

export async function fetchAdminEvents(params: { page: number; limit: number; search?: string }) {
  try {
    const qs = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
    if (params.search?.trim()) qs.set('search', params.search.trim());
    const data = unwrap(await customAxios.get(`${ADMIN_EVENTS_URL}?${qs.toString()}`));
    return {
      items: (data?.items ?? []) as AdminEvent[],
      total: (data?.total ?? 0) as number,
      totalPages: (data?.totalPages ?? 1) as number,
    };
  } catch (err) {
    throw toError(err, 'Failed to fetch events');
  }
}

export async function fetchAdminEventById(id: string): Promise<AdminEvent> {
  try {
    return unwrap(await customAxios.get(`${ADMIN_EVENTS_URL}/${id}`));
  } catch (err) {
    throw toError(err, 'Failed to fetch event');
  }
}

export async function createAdminEvent(payload: AdminEventPayload): Promise<AdminEvent> {
  try {
    return unwrap(await customAxios.post(ADMIN_EVENTS_URL, payload));
  } catch (err) {
    throw toError(err, 'Failed to create event');
  }
}

export async function updateAdminEvent(id: string, payload: Partial<AdminEventPayload>): Promise<AdminEvent> {
  try {
    return unwrap(await customAxios.patch(`${ADMIN_EVENTS_URL}/${id}`, payload));
  } catch (err) {
    throw toError(err, 'Failed to update event');
  }
}

export async function deleteAdminEvent(id: string): Promise<void> {
  try {
    await customAxios.delete(`${ADMIN_EVENTS_URL}/${id}`);
  } catch (err) {
    throw toError(err, 'Failed to delete event');
  }
}
