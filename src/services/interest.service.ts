import { apiEndPoint } from '@/features/apiEndPoint';

// ─── Endpoint ────────────────────────────────────────────────────────────────
// /interest-groups already embeds each group's interests as `tags[]`
// so a single call is enough — no separate /interests fetch needed.

export const INTEREST_GROUPS_URL = apiEndPoint.INTEREST_GROUPS_ENDPOINT as string;
export const INTERESTS_URL = apiEndPoint.INTERESTS_ENDPOINT as string;

// ─── API response types ───────────────────────────────────────────────────────

export interface ApiInterest {
  Interestid: string;
  name: string;
  slug: string;
  iconUrl: string;
  s3ImageFileName: string;
  s3ImageUrl: string;
  isActive: boolean;
  interestGroupId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiInterestGroup {
  Interestgroup_id: string;
  name: string;
  slug: string;
  iconUrl: string;
  tags: ApiInterest[]; // ← interests that belong to this group
  isActive: boolean;
  s3ImageFileName: string;
  cover_image_url: string;
}

export interface ApiGroupsResult {
  statusCode: number;
  message: string;
  data: ApiInterestGroup[];
}

export interface ApiGroupsResponse {
  result: ApiGroupsResult;
}

// ─── UI types ────────────────────────────────────────────────────────────────

export type GroupColor =
  | 'blue'
  | 'emerald'
  | 'violet'
  | 'warning'
  | 'success'
  | 'destructive';

export interface SubInterest {
  id: string;
  name: string;
}

export interface InterestGroup {
  id: string;
  name: string;
  color: GroupColor;
  subInterests: SubInterest[];
}

export interface GroupStyle {
  border: string;
  text: string;
  bg: string;
  badge: GroupColor;
  glow: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const COLOR_CYCLE: GroupColor[] = [
  'blue',
  'emerald',
  'violet',
  'warning',
  'success',
  'destructive',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Maps the raw API response to the local `InterestGroup` UI shape.
 * Each group's `tags[]` array already contains its interests — no join needed.
 */
export function buildInterestGroups(groups: ApiInterestGroup[]): InterestGroup[] {
  return groups.map((group, index) => ({
    id: group.Interestgroup_id,
    name: group.name,
    color: COLOR_CYCLE[index % COLOR_CYCLE.length],
    subInterests: (group.tags ?? []).map((tag) => ({
      id: tag.Interestid,
      name: tag.name,
    })),
  }));
}

// ─── Helper: Auth ────────────────────────────────────────────────────────────

function getAuthHeader(): string {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  // Use the provided active Bearer token if token is missing, mock, or invalid
  const useProvidedToken = !token || token === 'mock-access-token' || !token.startsWith('eyJ');
  return useProvidedToken
    ? 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjMDVhZjM1NC00ZWZkLTQ0NmQtOWRmYS03ZWRiMDA0OGQxZmYiLCJpYXQiOjE3Nzk0NTQ0NjUsImV4cCI6MTc4MjA0NjQ2NX0.9nt5US9IHDfClT9WnwFjN8f_MN-rnstGEfT6Gx-KoTI'
    : `Bearer ${token}`;
}

// ─── API call ────────────────────────────────────────────────────────────────

/**
 * Fetches all interest groups (with their interests embedded as `tags[]`).
 * Throws an error if the request fails or the response shape is unexpected.
 */
export async function fetchInterestGroups(): Promise<InterestGroup[]> {
  const res = await fetch(INTEREST_GROUPS_URL, {
    headers: {
      'Authorization': getAuthHeader()
    }
  });

  if (!res.ok) {
    throw new Error(`Server responded with ${res.status}`);
  }

  const json = await res.json();

  // Handle both formats: wrapped in result or direct top-level data
  const data = json?.result?.data ?? json?.data ?? json;

  if (!Array.isArray(data)) {
    throw new Error('Unexpected response format from API');
  }

  return buildInterestGroups(data);
}

// ─── Create ──────────────────────────────────────────────────────────────────

export interface CreateInterestGroupPayload {
  name: string;
  slug: string;
  iconUrl: string;
  s3ImageFileName: string;
  tag: string[];
  isActive: boolean;
}

/**
 * Creates a new interest group via POST.
 * Generates a slug and default icon/image from the group name.
 */
export async function createInterestGroup(name: string): Promise<void> {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const payload: CreateInterestGroupPayload = {
    name,
    slug,
    iconUrl: `https://cdn.circles.com/icons/${slug}.svg`,
    s3ImageFileName: `${slug}.png`,
    tag: [],
    isActive: true,
  };

  const res = await fetch(INTEREST_GROUPS_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader()
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.result?.message || body?.message || `Server responded with ${res.status}`;
    throw new Error(msg);
  }
}

/**
 * Deletes an interest group via DELETE.
 */
export async function deleteInterestGroup(id: string): Promise<void> {
  const res = await fetch(`${INTEREST_GROUPS_URL}/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': getAuthHeader()
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.result?.message || body?.message || `Server responded with ${res.status}`;
    throw new Error(msg);
  }
}

export interface CreateSubInterestPayload {
  name: string;
  slug: string;
  iconUrl: string;
  s3ImageFileName: string;
  interestGroupId: string;
  isActive: boolean;
}

/**
 * Creates a new sub-interest (tag) under a specific group via POST.
 */
export async function createSubInterest(name: string, interestGroupId: string): Promise<void> {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const payload: CreateSubInterestPayload = {
    name,
    slug,
    iconUrl: `https://cdn.circles.com/icons/${slug}.svg`,
    s3ImageFileName: `${slug}.png`,
    interestGroupId,
    isActive: true,
  };

  const res = await fetch(INTERESTS_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader()
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.result?.message || body?.message || `Server responded with ${res.status}`;
    throw new Error(msg);
  }
}

/**
 * Deletes a sub-interest (tag) via DELETE.
 */
export async function deleteSubInterest(id: string): Promise<void> {
  const res = await fetch(`${INTERESTS_URL}/${id}`, { 
    method: 'DELETE',
    headers: {
      'Authorization': getAuthHeader()
    }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.result?.message || body?.message || `Server responded with ${res.status}`);
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Updates an interest group name (and optionally its tag IDs) via PUT.
 */
export async function updateInterestGroup(id: string, name: string, tagIds: string[]): Promise<void> {
  const res = await fetch(`${INTEREST_GROUPS_URL}/${id}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader()
    },
    body: JSON.stringify({ name, tags: tagIds }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.result?.message || body?.message || `Server responded with ${res.status}`);
  }
}

/**
 * Updates a sub-interest name via PUT.
 */
export async function updateSubInterest(id: string, name: string): Promise<void> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const res = await fetch(`${INTERESTS_URL}/${id}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader()
    },
    body: JSON.stringify({ name, slug }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.result?.message || body?.message || `Server responded with ${res.status}`);
  }
}


