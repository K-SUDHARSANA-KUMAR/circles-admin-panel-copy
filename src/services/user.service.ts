import { apiEndPoint } from '@/features/apiEndPoint';

export interface Customer {
  id: string;
  email: string;
  phone: string;
  status: string;
  name: string;
  lastName?: string;
  reliabilityScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomersResponse {
  customers: Customer[];
  total: number;
}

const USER_SERVICE_URL = process.env.NEXT_PUBLIC_USER_SERVICE_URL || (apiEndPoint.CITIES_ENDPOINT as string).replace('/cities', '');
export const ADMIN_CUSTOMERS_URL = `${USER_SERVICE_URL}/admin/customers`;

function getAdminHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const origin = window.location.origin ? window.location.origin.replace(/\/$/, '') : '';

  const headers: Record<string, string> = {
    'X-Admin-Api-Key': 'local-admin-key-123',
    'Content-Type': 'application/json',
  };

  if (origin) {
    try {
      headers['Origin'] = origin;
    } catch (e) {
      // ignore browser restriction
    }
  }

  return headers;
}

/**
 * Fetches the list of customers/users from the backend user-service.
 */
export async function fetchCustomers(params?: {
  limit?: number;
  skip?: number;
  search?: string;
}): Promise<CustomersResponse> {
  const url = new URL(ADMIN_CUSTOMERS_URL);

  if (params?.limit !== undefined) {
    url.searchParams.append('limit', params.limit.toString());
  } else {
    url.searchParams.append('limit', '10');
  }
  if (params?.skip !== undefined) {
    url.searchParams.append('skip', params.skip.toString());
  } else {
    url.searchParams.append('skip', '0');
  }
  if (params?.search !== undefined && params.search.trim() !== '') {
    url.searchParams.append('search', params.search.trim());
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: getAdminHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Server responded with status code ${res.status}`);
  }

  const json = await res.json();

  // Handle response format variations
  const data = json?.result?.data ?? json?.data ?? json;

  let customersList: Customer[] = [];
  let totalCount = 0;

  if (Array.isArray(data)) {
    customersList = data;
    totalCount = data.length;
  } else if (data && typeof data === 'object') {
    const possibleArray = data.customers ?? data.items ?? data.records ?? data.users;
    if (Array.isArray(possibleArray)) {
      customersList = possibleArray;
      totalCount = data.total ?? data.totalItems ?? possibleArray.length;
    } else {
      // Fallback: look for any array in the keys
      const arrayKey = Object.keys(data).find(key => Array.isArray((data as any)[key]));
      if (arrayKey) {
        customersList = (data as any)[arrayKey];
        totalCount = data.total ?? customersList.length;
      } else {
        // If it is just an empty result or single customer, format accordingly
        customersList = [];
        totalCount = 0;
      }
    }
  }

  return {
    customers: customersList,
    total: totalCount,
  };
}

export interface WaitlistUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  lastName?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WaitlistResponse {
  users: WaitlistUser[];
  total: number;
}

export const ADMIN_WAITLIST_URL = `${USER_SERVICE_URL}/admin/waitlist`;

/**
 * Fetches the waitlist/verification users from the backend user-service.
 */
export async function fetchWaitlist(params?: {
  limit?: number;
  skip?: number;
  search?: string;
}): Promise<WaitlistResponse> {
  const url = new URL(ADMIN_WAITLIST_URL);

  if (params?.limit !== undefined) {
    url.searchParams.append('limit', params.limit.toString());
  } else {
    url.searchParams.append('limit', '10');
  }
  if (params?.skip !== undefined) {
    url.searchParams.append('skip', params.skip.toString());
  } else {
    url.searchParams.append('skip', '0');
  }
  if (params?.search !== undefined && params.search.trim() !== '') {
    url.searchParams.append('search', params.search.trim());
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: getAdminHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Server responded with status code ${res.status}`);
  }

  const json = await res.json();

  // Handle response format variations
  const data = json?.result?.data ?? json?.data ?? json;

  let waitlistList: WaitlistUser[] = [];
  let totalCount = 0;

  if (Array.isArray(data)) {
    waitlistList = data;
    totalCount = data.length;
  } else if (data && typeof data === 'object') {
    const possibleArray = data.waitlist ?? data.items ?? data.records ?? data.users ?? data.customers;
    if (Array.isArray(possibleArray)) {
      waitlistList = possibleArray;
      totalCount = data.total ?? data.totalItems ?? possibleArray.length;
    } else {
      // Fallback: look for any array in the keys
      const arrayKey = Object.keys(data).find(key => Array.isArray((data as any)[key]));
      if (arrayKey) {
        waitlistList = (data as any)[arrayKey];
        totalCount = data.total ?? waitlistList.length;
      } else {
        waitlistList = [];
        totalCount = 0;
      }
    }
  }

  return {
    users: waitlistList,
    total: totalCount,
  };
}

/**
 * Fetches the rejected waitlist users from the standalone backend endpoint.
 */
export async function fetchRejectedWaitlist(params?: {
  limit?: number;
  skip?: number;
  search?: string;
}): Promise<WaitlistResponse> {
  const url = new URL(`${ADMIN_WAITLIST_URL}/rejected`);

  if (params?.limit !== undefined) {
    url.searchParams.append('limit', params.limit.toString());
  } else {
    url.searchParams.append('limit', '10');
  }
  if (params?.skip !== undefined) {
    url.searchParams.append('skip', params.skip.toString());
  } else {
    url.searchParams.append('skip', '0');
  }
  if (params?.search !== undefined && params.search.trim() !== '') {
    url.searchParams.append('search', params.search.trim());
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: getAdminHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Server responded with status code ${res.status}`);
  }

  const json = await res.json();
  const data = json?.data;

  return {
    users: data?.items || [],
    total: data?.totalItems || 0,
  };
}

/**
 * Updates a waitlist user's status.
 */
export async function updateWaitlistStatus(waitlistId: string, status: 'active' | 'rejected'): Promise<any> {
  const res = await fetch(`${ADMIN_WAITLIST_URL}/${waitlistId}`, {
    method: 'PATCH',
    headers: getAdminHeaders(),
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.result?.message || body?.message || `Server responded with status code ${res.status}`;
    throw new Error(msg);
  }

  const json = await res.json();
  return json?.result?.data ?? json?.data ?? json;
}

/**
 * Approves a waitlist/verification user.
 */
export async function approveWaitlistUser(waitlistId: string): Promise<any> {
  return await updateWaitlistStatus(waitlistId, 'active');
}

/**
 * Rejects a waitlist/verification user.
 */
export async function rejectWaitlistUser(waitlistId: string): Promise<any> {
  return await updateWaitlistStatus(waitlistId, 'rejected');
}

/**
 * Updates a customer's status (active/inactive).
 */
export async function updateCustomerStatus(customerId: string, status: 'active' | 'inactive'): Promise<any> {
  const res = await fetch(`${ADMIN_CUSTOMERS_URL}/${customerId}`, {
    method: 'PATCH',
    headers: getAdminHeaders(),
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.result?.message || body?.message || `Server responded with status code ${res.status}`;
    throw new Error(msg);
  }

  const json = await res.json();
  return json?.result?.data ?? json?.data ?? json;
}
