import customAxios from '@/lib/axios';
import { ADMIN_VENUES_URL } from '@/services/venue.service';

// `${BASE_URL}/user-service/admin/collaborators`
const COLLABORATORS_URL = ADMIN_VENUES_URL.replace(/\/venues$/, '/collaborators');

/** Letters and digits only, so the code reads the same on Luma and in the app. */
export const COLLABORATOR_CODE_PATTERN = /^[A-Z0-9]{4,20}$/;

// Mirror user-service CollaboratorSummaryDto / CollaboratorMemberDto.
export interface Collaborator {
  id: string;
  name: string;
  code: string;
  /** false = paused: new sign-ups with the code are refused. */
  active: boolean;
  createdAt: string;
}

export interface CollaboratorSummary extends Collaborator {
  /** Accounts created with the code in the chosen period. */
  signups: number;
  /** Of those, finished signup and are in the app. */
  activeMembers: number;
  /** Of those, on a paid plan right now (not the free trial). */
  payingMembers: number;
}

export interface CollaboratorMember {
  id: string;
  name: string | null;
  status: string;
  signedUpAt: string;
  paying: boolean;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
}

export interface CollaboratorMembersPage {
  items: CollaboratorMember[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RangeParams {
  /** ISO time, included. */
  from?: string;
  /** ISO time, not included. */
  to?: string;
}

/** The API wraps payloads as { result: { data } } or { data }; accept either. */
function unwrap<T>(body: unknown): T | undefined {
  const b = body as { result?: { data?: T }; data?: T } | undefined;
  return (b?.result?.data ?? b?.data ?? body) as T | undefined;
}

function errorMessage(err: unknown, fallback: string): string {
  const e = err as
    | {
        message?: string;
        response?: {
          data?: { message?: string | string[]; result?: { message?: string } };
        };
      }
    | undefined;
  const message = e?.response?.data?.message;
  return (
    e?.response?.data?.result?.message ||
    (Array.isArray(message) ? message.join(', ') : message) ||
    e?.message ||
    fallback
  );
}

/** Drops empty values so the API never gets e.g. `from=`. */
function cleanParams(params: object): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') out[k] = v as string | number;
  });
  return out;
}

export async function fetchCollaborators(
  params: RangeParams,
): Promise<CollaboratorSummary[]> {
  try {
    const res = await customAxios.get(COLLABORATORS_URL, { params: cleanParams(params) });
    const data = unwrap<CollaboratorSummary[]>(res.data);
    return Array.isArray(data) ? data : [];
  } catch (err: unknown) {
    throw new Error(errorMessage(err, 'Failed to load collaborators'));
  }
}

export async function createCollaborator(input: {
  name: string;
  code: string;
}): Promise<Collaborator> {
  try {
    const res = await customAxios.post(COLLABORATORS_URL, input);
    return unwrap<Collaborator>(res.data) as Collaborator;
  } catch (err: unknown) {
    throw new Error(errorMessage(err, 'Failed to create the collaborator'));
  }
}

export async function updateCollaborator(
  id: string,
  input: { name?: string; active?: boolean },
): Promise<Collaborator> {
  try {
    const res = await customAxios.patch(`${COLLABORATORS_URL}/${id}`, input);
    return unwrap<Collaborator>(res.data) as Collaborator;
  } catch (err: unknown) {
    throw new Error(errorMessage(err, 'Failed to update the collaborator'));
  }
}

export async function fetchCollaboratorMembers(
  id: string,
  params: RangeParams & { page?: number; limit?: number },
): Promise<CollaboratorMembersPage> {
  try {
    const res = await customAxios.get(`${COLLABORATORS_URL}/${id}/members`, {
      params: cleanParams(params),
    });
    const data = unwrap<Partial<CollaboratorMembersPage>>(res.data) ?? {};
    return {
      items: data.items ?? [],
      total: data.total ?? 0,
      page: data.page ?? params.page ?? 1,
      limit: data.limit ?? params.limit ?? 20,
      totalPages: data.totalPages ?? 1,
    };
  } catch (err: unknown) {
    throw new Error(errorMessage(err, 'Failed to load the sign-ups'));
  }
}
