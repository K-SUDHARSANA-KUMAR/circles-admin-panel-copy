import customAxios from '@/lib/axios';
import { apiEndPoint } from '@/features/apiEndPoint';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ReportUserRef {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profilePhoto: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  createdAt: string | null;
  reliabilityScore: number | null;
}

export interface ReportChatMessage {
  messageId: string;
  senderId: string;
  senderName?: string;
  text: string;
  timestamp: string;
  messageType?: string;
}

export interface Report {
  id: string;
  reporter: ReportUserRef;
  reportedUser: ReportUserRef;
  reasonCode: string;
  reasonText: string | null;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: ReportChatMessage[];
}

export interface PaginatedReportsResponse {
  items: Report[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Endpoint Configuration ──────────────────────────────────────────────────

const getCoreServiceUrl = () => {
  if (process.env.NEXT_PUBLIC_CORE_SERVICE_URL) {
    return process.env.NEXT_PUBLIC_CORE_SERVICE_URL;
  }
  let url = process.env.NEXT_PUBLIC_BASE_URL
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/core-service`
    : (apiEndPoint.CITIES_ENDPOINT as string).replace('/user-service/cities', '/core-service');

  if (url.includes('localhost:3005')) {
    url = url.replace('localhost:3005', 'localhost:3002');
  }
  return url;
};

export const REPORTS_URL = `${getCoreServiceUrl()}/reports`;

// ─── API Operations ──────────────────────────────────────────────────────────

/**
 * Fetches all reports (paginated, filterable by status).
 */
export async function fetchReports(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<PaginatedReportsResponse> {
  try {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.status && params.status !== 'ALL') qs.set('status', params.status);

    const url = `${REPORTS_URL}?${qs.toString()}`;
    const res = await customAxios.get(url);
    const data = res.data?.result?.data ?? res.data?.data ?? res.data;

    if (data && Array.isArray(data.items)) {
      return {
        items: data.items,
        total: data.total ?? data.items.length,
        page: data.page ?? params?.page ?? 1,
        limit: data.limit ?? params?.limit ?? 10,
        totalPages: data.totalPages ?? 1,
      };
    }

    throw new Error('Unexpected response format from reports API');
  } catch (err: any) {
    const msg =
      err.response?.data?.result?.message ||
      err.response?.data?.message ||
      err.message;
    throw new Error(msg);
  }
}

/**
 * Fetches a single report by ID.
 */
export async function fetchReportById(id: string): Promise<Report> {
  try {
    const res = await customAxios.get(`${REPORTS_URL}/${id}`);
    const data = res.data?.result?.data ?? res.data?.data ?? res.data;

    if (data && typeof data === 'object') {
      return data;
    }

    throw new Error('Unexpected response format from report detail API');
  } catch (err: any) {
    const msg =
      err.response?.data?.result?.message ||
      err.response?.data?.message ||
      err.message;
    throw new Error(msg);
  }
}

/**
 * Updates a report's status (RESOLVED, REJECTED, or RESOLVED_BLOCK) with optional admin notes.
 */
export async function updateReportStatus(
  id: string,
  payload: {
    status: 'RESOLVED' | 'REJECTED' | 'RESOLVED_BLOCK';
    adminNotes?: string;
  }
): Promise<Report> {
  try {
    const res = await customAxios.patch(`${REPORTS_URL}/${id}/status`, payload);
    const data = res.data?.result?.data ?? res.data?.data ?? res.data;

    if (data && typeof data === 'object') {
      return data;
    }

    throw new Error('Unexpected response format from update report status API');
  } catch (err: any) {
    const msg =
      err.response?.data?.result?.message ||
      err.response?.data?.message ||
      err.message;
    throw new Error(msg);
  }
}
