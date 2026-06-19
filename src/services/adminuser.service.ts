import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';

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

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || (apiEndPoint.CITIES_ENDPOINT as string).replace('/cities', '');
export const ADMIN_USERS_URL = `${BASE_URL}/user-service/admin/users`;
export const ADMIN_BOOTSTRAP_URL = `${BASE_URL}/user-service/admin/bootstrap`;

/**
 * Fetches the list of admin users from the user-service endpoint.
 */
export async function fetchAdminUsers(params?: {
  limit?: number;
  skip?: number;
  search?: string;
}): Promise<AdminUsersResponse> {
  const limit = params?.limit !== undefined ? params.limit : 10;
  const skip = params?.skip !== undefined ? params.skip : 0;
  let url = `${ADMIN_USERS_URL}?limit=${limit}&skip=${skip}`;

  if (params?.search !== undefined && params.search.trim() !== '') {
    url += `&search=${encodeURIComponent(params.search.trim())}`;
  }

  try {
    const res = await customAxios.get(url);
    
    const data = res.data?.result?.data ?? res.data?.data ?? res.data;

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
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Updates an admin user's details.
 */
export async function updateAdminUser(
  userId: string,
  payload: Partial<Omit<AdminUser, 'id'>>
): Promise<AdminUser> {
  try {
    const res = await customAxios.patch(`${ADMIN_USERS_URL}/${userId}`, payload);
    return res.data?.result?.data ?? res.data?.data ?? res.data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Deletes an admin user.
 */
export async function deleteAdminUser(userId: string): Promise<void> {
  try {
    await customAxios.delete(`${ADMIN_USERS_URL}/${userId}`);
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Creates/bootstraps a new admin user.
 */
export async function createAdminUser(payload: {
  email: string;
  name: string;
  lastName: string;
  password: string;
  cognitoUsername: string;
}): Promise<any> {
  try {
    const res = await customAxios.post(ADMIN_BOOTSTRAP_URL, payload);
    return res.data?.result?.data ?? res.data?.data ?? res.data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}
