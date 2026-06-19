import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';

// ─── Endpoint ────────────────────────────────────────────────────────────────
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
  tags: ApiInterest[];
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

function extractArray(obj: unknown): unknown[] | null {
  if (Array.isArray(obj)) return obj;
  if (!obj || typeof obj !== 'object') return null;

  const record = obj as Record<string, unknown>;
  const directFields = ['items', 'interests', 'interestGroups', 'groups', 'data'];
  for (const field of directFields) {
    const val = record[field];
    if (Array.isArray(val)) {
      return val;
    }
  }

  const nestedFields = ['result', 'data'];
  for (const field of nestedFields) {
    const nested = record[field];
    if (nested && typeof nested === 'object') {
      const arr = extractArray(nested);
      if (arr) return arr;
    }
  }

  for (const key of Object.keys(record)) {
    const val = record[key];
    if (Array.isArray(val)) {
      return val;
    }
  }

  return null;
}

export function buildInterestGroups(groups: ApiInterestGroup[]): InterestGroup[] {
  if (!Array.isArray(groups)) return [];
  return groups
    .filter((group) => group && group.Interestgroup_id)
    .map((group, index) => ({
      id: group.Interestgroup_id,
      name: group.name || '',
      color: COLOR_CYCLE[index % COLOR_CYCLE.length],
      subInterests: (group.tags ?? [])
        .filter((tag) => tag && tag.Interestid)
        .map((tag) => ({
          id: tag.Interestid,
          name: tag.name || '',
        })),
    }));
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Fetches all interest groups (with interests embedded).
 * Optionally filters by group name via backend search param.
 */
export async function fetchInterestGroups(search?: string): Promise<InterestGroup[]> {
  try {
    const url = search?.trim() ? `${INTEREST_GROUPS_URL}?search=${encodeURIComponent(search.trim())}` : INTEREST_GROUPS_URL;
    const res = await customAxios.get(url);
    const groupsList = extractArray(res.data);
    if (!groupsList) {
      throw new Error('Unexpected response format from API');
    }
    return buildInterestGroups(groupsList as ApiInterestGroup[]);
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Searches interests (sub-interests) by name via backend API.
 * Returns matching ApiInterest objects that include their interestGroupId.
 */
export async function fetchInterestsBySearch(search: string): Promise<ApiInterest[]> {
  try {
    const url = `${INTERESTS_URL}?search=${encodeURIComponent(search.trim())}`;
    const res = await customAxios.get(url);
    const data = extractArray(res.data);
    if (!data) return [];
    return (data as ApiInterest[]).filter((i) => i && i.Interestid);
  } catch {
    // Interest name search is best-effort — silently fall back to empty
    return [];
  }
}

/**
 * Fetches a single interest group by its ID.
 * Used to load parent groups discovered via interest-name search.
 */
export async function fetchInterestGroupById(id: string): Promise<InterestGroup | null> {
  try {
    const res = await customAxios.get(`${INTEREST_GROUPS_URL}/${id}`);
    const raw = res.data;
    let group: ApiInterestGroup | null = null;
    if (raw && raw.Interestgroup_id) {
      group = raw as ApiInterestGroup;
    } else if (raw?.result?.data) {
      group = raw.result.data as ApiInterestGroup;
    } else if (raw?.data) {
      group = raw.data as ApiInterestGroup;
    }
    if (!group) return null;
    const built = buildInterestGroups([group]);
    return built[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Creates a new interest group.
 */
export async function createInterestGroup(name: string): Promise<void> {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const payload = {
    name,
    slug,
    iconUrl: `https://cdn.circles.com/icons/${slug}.svg`,
    s3ImageFileName: `${slug}.png`,
    tag: [],
    isActive: true,
  };

  try {
    await customAxios.post(INTEREST_GROUPS_URL, payload);
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Deletes an interest group.
 */
export async function deleteInterestGroup(id: string): Promise<void> {
  try {
    await customAxios.delete(`${INTEREST_GROUPS_URL}/${id}`);
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Creates a new sub-interest (tag) under a specific group.
 */
export async function createSubInterest(name: string, interestGroupId: string): Promise<void> {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const payload = {
    name,
    slug,
    iconUrl: `https://cdn.circles.com/icons/${slug}.svg`,
    s3ImageFileName: `${slug}.png`,
    interestGroupId,
    isActive: true,
  };

  try {
    await customAxios.post(INTERESTS_URL, payload);
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Deletes a sub-interest (tag).
 */
export async function deleteSubInterest(id: string): Promise<void> {
  try {
    await customAxios.delete(`${INTERESTS_URL}/${id}`);
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Updates an interest group name and tags.
 */
export async function updateInterestGroup(id: string, name: string, tagIds: string[]): Promise<void> {
  try {
    await customAxios.put(`${INTEREST_GROUPS_URL}/${id}`, { name, tags: tagIds });
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Updates a sub-interest name.
 */
export async function updateSubInterest(id: string, name: string): Promise<void> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  try {
    await customAxios.put(`${INTERESTS_URL}/${id}`, { name, slug });
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}
