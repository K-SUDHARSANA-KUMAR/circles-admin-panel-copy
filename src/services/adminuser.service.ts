import { apiEndPoint } from '@/features/apiEndPoint';

export interface AdminUser {
  id: string;
  email: string;
  phone: string;
  status: string;
  role: string;
  name: string;
  lastName: string;
  gender: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
}

const USER_SERVICE_URL = process.env.NEXT_PUBLIC_USER_SERVICE_URL || (apiEndPoint.CITIES_ENDPOINT as string).replace('/cities', '');
export const ADMIN_USERS_URL = `${USER_SERVICE_URL}/admin/users`;

/**
 * Generates custom authorization headers for admin endpoints,
 * including accessToken and idToken with default fallback tokens.
 */
function getAdminHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  const idToken = localStorage.getItem('idToken') || '';

  return {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(accessToken ? { accessToken } : {}),
    ...(idToken ? { idToken } : {}),
    'Content-Type': 'application/json',
  };
}

/**
 * Fetches the list of admin users from the user-service endpoint.
 */
export async function fetchAdminUsers(params?: {
  limit?: number;
  skip?: number;
  search?: string;
}): Promise<AdminUsersResponse> {
  const url = new URL(ADMIN_USERS_URL);
  
  if (params?.limit !== undefined) {
    url.searchParams.append('limit', params.limit.toString());
  }
  if (params?.skip !== undefined) {
    url.searchParams.append('skip', params.skip.toString());
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
  
  // Handle both formats: wrapped in result/data or direct top-level array
  const data = json?.result?.data ?? json?.data ?? json;

  let usersList: AdminUser[] = [];
  let totalCount = 0;

  if (Array.isArray(data)) {
    usersList = data;
    totalCount = data.length;
  } else if (data && typeof data === 'object') {
    const possibleArray = data.users ?? data.adminUsers ?? data.items ?? data.records;
    if (Array.isArray(possibleArray)) {
      usersList = possibleArray;
      totalCount = data.total ?? data.totalItems ?? possibleArray.length;
    } else {
      // Fallback: look for any array in the keys
      const arrayKey = Object.keys(data).find(key => Array.isArray((data as any)[key]));
      if (arrayKey) {
        usersList = (data as any)[arrayKey];
        totalCount = data.total ?? usersList.length;
      } else {
        throw new Error('Unexpected response format from admin users API');
      }
    }
  } else {
    throw new Error('Unexpected response format from admin users API');
  }

  return {
    users: usersList,
    total: totalCount,
  };
}
