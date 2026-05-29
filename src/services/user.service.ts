import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';

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

/**
 * Fetches a single customer/user by ID from the user-service.
 */
export async function fetchCustomerById(customerId: string): Promise<Customer> {
  try {
    const res = await customAxios.get(`${USER_SERVICE_URL}/users/${customerId}`);
    return res.data?.result?.data ?? res.data?.data ?? res.data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
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

  try {
    const res = await customAxios.get(url.toString());
    const data = res.data?.result?.data ?? res.data?.data ?? res.data;

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
        const arrayKey = Object.keys(data).find(key => Array.isArray((data as any)[key]));
        if (arrayKey) {
          customersList = (data as any)[arrayKey];
          totalCount = data.total ?? customersList.length;
        } else {
          customersList = [];
          totalCount = 0;
        }
      }
    }

    return {
      customers: customersList,
      total: totalCount,
    };
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

export interface WaitlistUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  lastName?: string;
  status: string;
  profilePictureUrl?: string;
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

  try {
    const res = await customAxios.get(url.toString());
    const data = res.data?.result?.data ?? res.data?.data ?? res.data;

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
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
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

  try {
    const res = await customAxios.get(url.toString());
    const data = res.data?.data;

    return {
      users: data?.items || [],
      total: data?.totalItems || 0,
    };
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Updates a waitlist user's status.
 */
export async function updateWaitlistStatus(waitlistId: string, status: 'active' | 'rejected'): Promise<any> {
  try {
    const res = await customAxios.patch(`${ADMIN_WAITLIST_URL}/${waitlistId}`, { status });
    return res.data?.result?.data ?? res.data?.data ?? res.data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
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
  try {
    const res = await customAxios.patch(`${ADMIN_CUSTOMERS_URL}/${customerId}`, { status });
    return res.data?.result?.data ?? res.data?.data ?? res.data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

export interface VerificationImage {
  id: string;
  type: string;
  status: string;
  s3Key: string;
  url: string;
  verifiedAgainstSelfieImageId?: string | null;
  verifiedByAdminUserId?: string | null;
  verifiedAt?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
}

export interface ProfileVerificationUser {
  id: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastActiveAt?: string;
  onWaitlist: boolean;
  status: string;
  role: string;
  reliabilityScore?: number;
  referralCode?: string;
  referralMedium?: string;
  subscriptionStatus?: string | null;
  createdAt?: string;
  updatedAt?: string;
  profileVerificationStatus: string;
  profileVerified: boolean;
  email: string;
  phone?: string | null;
  name: string;
  lastName?: string | null;
  bio?: string | null;
  dob?: string | null;
  gender?: string | null;
  cityId?: string | null;
  location?: string | null;
  website?: string | null;
  profilePictureUrl?: string | null;
  profileS3ImageFileName?: string | null;
  selfieImageS3FileName?: string | null;
  selfieImageUrl?: string | null;
  coverPhotoUrl?: string | null;
  visibility?: string;
  socialLinks?: any;
  interests?: string;
  languages?: string;
  verificationImages?: VerificationImage[];
}

export interface ProfileUsersResponse {
  users: ProfileVerificationUser[];
  total: number;
}

export const ADMIN_PROFILE_USERS_URL = `${USER_SERVICE_URL}/admin/customers/pending-verification`;

/**
 * Fetches the list of profile users for verification.
 */
export async function fetchProfileUsersGetAll(params?: {
  limit?: number;
  skip?: number;
  search?: string;
}): Promise<ProfileUsersResponse> {
  const url = new URL(ADMIN_PROFILE_USERS_URL);

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

  try {
    const res = await customAxios.get(url.toString());
    const data = res.data?.result?.data ?? res.data?.data ?? res.data;

    let usersList: ProfileVerificationUser[] = [];
    let totalCount = 0;

    if (Array.isArray(data)) {
      usersList = data;
      totalCount = data.length;
    } else if (data && typeof data === 'object') {
      const possibleArray = data.items ?? data.users ?? data.records ?? data.data;
      if (Array.isArray(possibleArray)) {
        usersList = possibleArray;
        totalCount = data.total ?? data.totalItems ?? possibleArray.length;
      } else {
        const arrayKey = Object.keys(data).find(key => Array.isArray((data as any)[key]));
        if (arrayKey) {
          usersList = (data as any)[arrayKey];
          totalCount = data.totalItems ?? data.total ?? usersList.length;
        }
      }
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
 * Approves or rejects a profile verification image.
 */
export async function verifyProfileImage(
  userId: string,
  imageId: string,
  verified: boolean
): Promise<any> {
  const url = `${USER_SERVICE_URL}/admin/customers/${userId}/profile-verification/images/${imageId}`;
  
  try {
    const res = await customAxios.patch(url, { verified });
    return res.data?.result?.data ?? res.data?.data ?? res.data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}
