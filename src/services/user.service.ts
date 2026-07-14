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

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || (apiEndPoint.CITIES_ENDPOINT as string).replace('/cities', '');
export const ADMIN_CUSTOMERS_URL = `${BASE_URL}/user-service/admin/customers`;

export const guessCountryFromUser = (user: any): string => {
  const loc = (user.location || '').toLowerCase();
  if (/india|delhi|mumbai|chennai|bangalore|hyderabad|coimbatore|indore|kolkata/i.test(loc)) return 'India';
  if (/albania|tirana|durres|bajram curri|banaj/i.test(loc)) return 'Albania';
  if (/portugal|lisbon|porto/i.test(loc)) return 'Portugal';
  if (/germany|berlin|munich|frankfurt|essen|esen/i.test(loc)) return 'Germany';
  if (/japan|tokyo|yokohama/i.test(loc)) return 'Japan';
  if (/iceland|reykjavik|reykjavík/i.test(loc)) return 'Iceland';
  if (/morocco|marrakech|rabat/i.test(loc)) return 'Morocco';
  if (/vietnam|hanoi|saigon|ho chi minh/i.test(loc)) return 'Vietnam';
  if (/austria|vienna|innsbruck/i.test(loc)) return 'Austria';
  if (/united kingdom|london|leeds|uk/i.test(loc)) return 'United Kingdom';
  if (/united states|new york|austin|us|usa/i.test(loc)) return 'United States';
  if (/france|paris/i.test(loc)) return 'France';
  if (/spain|madrid|barcelona/i.test(loc)) return 'Spain';
  if (/italy|rome|milan/i.test(loc)) return 'Italy';
  if (/singapore/i.test(loc)) return 'Singapore';

  const phone = user.phone || '';
  if (phone.startsWith('+91')) return 'India';
  if (phone.startsWith('+355')) return 'Albania';
  if (phone.startsWith('+44')) return 'United Kingdom';
  if (phone.startsWith('+1')) return 'United States';
  if (phone.startsWith('+351')) return 'Portugal';
  if (phone.startsWith('+49')) return 'Germany';
  if (phone.startsWith('+81')) return 'Japan';
  if (phone.startsWith('+354')) return 'Iceland';
  if (phone.startsWith('+212')) return 'Morocco';
  if (phone.startsWith('+84')) return 'Vietnam';
  if (phone.startsWith('+43')) return 'Austria';
  if (phone.startsWith('+33')) return 'France';
  if (phone.startsWith('+34')) return 'Spain';
  if (phone.startsWith('+39')) return 'Italy';
  if (phone.startsWith('+65')) return 'Singapore';

  return user.country || '';
};

/**
 * Fetches a single customer/user by ID from the user-service.
 */
export async function fetchCustomerById(customerId: string): Promise<Customer> {
  try {
    const res = await customAxios.get(`${BASE_URL}/user-service/users/${customerId}`);
    return res.data?.result?.data ?? res.data?.data ?? res.data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

export interface UserDevice {
  id: string;
  platform: string | null;
  deviceId: string | null;
  createdAt: string;
}

/** Fetches registered device tokens and platforms for a user. */
export async function fetchUserDevices(userId: string): Promise<UserDevice[]> {
  try {
    const res = await customAxios.get(`${BASE_URL}/user-service/notifications/tokens`, {
      params: { userId }
    });
    return res.data?.result?.data ?? res.data?.data ?? res.data ?? [];
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/** Sends a targeted notification to a single user. */
export async function sendNotification(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, any> }
): Promise<any> {
  try {
    const res = await customAxios.post(
      `${BASE_URL}/user-service/notifications/send`,
      payload,
      { params: { userId } }
    );
    return res.data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/** Sends a broadcast notification to all active users. */
export async function broadcastNotification(
  payload: { title: string; body: string; data?: Record<string, any> }
): Promise<any> {
  try {
    const res = await customAxios.post(
      `${BASE_URL}/user-service/notifications/broadcast`,
      payload
    );
    return res.data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Fetches the list of customers/users from the backend user-service.
 *
 * Supported backend query parameters:
 *   - search    : partial name/phone search
 *   - limit     : page size
 *   - skip      : offset
 *   - status    : user status (e.g. 'active', 'inactive')
 *   - medium    : referral medium (e.g. 'INVITE_CODE', 'WISHLIST')
 *   - minScore  : minimum reliability score
 *   - maxScore  : maximum reliability score
 *   - cityIds   : filter by one or more city names (multi-select array)
 *   - countries : filter by one or more country names (multi-select array)
 */
export async function fetchCustomers(params?: {
  limit?: number;
  skip?: number;
  search?: string;
  status?: string;
  medium?: string;
  minScore?: number;
  maxScore?: number;
  /** Array of city names for multi-select filter */
  cityNames?: string[];
  /** Array of country names for multi-select filter */
  countries?: string[];
  score?: string | number;
}): Promise<CustomersResponse> {
  const limit = params?.limit !== undefined ? params.limit : 10;
  const skip = params?.skip !== undefined ? params.skip : 0;
  const backendSearch = params?.search?.trim();

  // Build URLSearchParams to correctly handle repeated array params
  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  qs.set('skip', String(skip));

  if (backendSearch) qs.set('search', backendSearch);
  if (params?.status) qs.set('status', params.status);
  if (params?.medium) qs.set('medium', params.medium);

  // Multi-select arrays: send as repeated query params
  // e.g. cityNames=London&cityNames=Mumbai  or  countries=India&countries=Albania
  (params?.cityNames ?? []).forEach((c) => qs.append('cityNames', c));
  (params?.countries ?? []).forEach((c) => qs.append('countries', c));

  let finalMinScore = params?.minScore;
  if (finalMinScore === undefined && params?.score !== undefined) {
    const num = Number(params.score);
    if (!isNaN(num)) finalMinScore = num;
  }
  if (finalMinScore !== undefined) qs.set('minScore', String(finalMinScore));
  if (params?.maxScore !== undefined) qs.set('maxScore', String(params.maxScore));

  const url = `${ADMIN_CUSTOMERS_URL}?${qs.toString()}`;

  try {
    const res = await customAxios.get(url);
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

export const ADMIN_WAITLIST_URL = `${BASE_URL}/user-service/admin/waitlist`;

/**
 * Fetches the waitlist users from the backend user-service.
 *
 * Supported backend query parameters (confirmed):
 *   - search   : partial name/phone search
 *   - limit    : page size
 *   - skip     : offset
 *   - status   : user status (e.g. 'pending', 'rejected')
 *   - medium   : referral medium
 *   - minScore : minimum reliability score
 *   - maxScore : maximum reliability score
 *   - cityId   : filter by city UUID (snowflake)
 *
 * NOT supported: country, city (as string)
 */
export async function fetchWaitlist(params?: {
  limit?: number;
  skip?: number;
  search?: string;
  status?: string;
  medium?: string;
  minScore?: number;
  maxScore?: number;
  /** Array of city names for multi-select filter */
  cityNames?: string[];
  /** Array of country names for multi-select filter */
  countries?: string[];
  score?: string | number;
}): Promise<WaitlistResponse> {
  const limit = params?.limit !== undefined ? params.limit : 10;
  const skip = params?.skip !== undefined ? params.skip : 0;
  const backendSearch = params?.search?.trim();

  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  qs.set('skip', String(skip));

  if (backendSearch) qs.set('search', backendSearch);
  if (params?.status) qs.set('status', params.status);
  if (params?.medium) qs.set('medium', params.medium);

  (params?.cityNames ?? []).forEach((c) => qs.append('cityNames', c));
  (params?.countries ?? []).forEach((c) => qs.append('countries', c));

  let finalMinScore = params?.minScore;
  if (finalMinScore === undefined && params?.score !== undefined) {
    const num = Number(params.score);
    if (!isNaN(num)) finalMinScore = num;
  }
  if (finalMinScore !== undefined) qs.set('minScore', String(finalMinScore));
  if (params?.maxScore !== undefined) qs.set('maxScore', String(params.maxScore));

  const url = `${ADMIN_WAITLIST_URL}?${qs.toString()}`;


  try {
    const res = await customAxios.get(url);
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
 * Fetches rejected waitlist users.
 *
 * Same supported params as fetchWaitlist.
 */
export async function fetchRejectedWaitlist(params?: {
  limit?: number;
  skip?: number;
  search?: string;
  status?: string;
  medium?: string;
  minScore?: number;
  maxScore?: number;
  /** Array of city names for multi-select filter */
  cityNames?: string[];
  /** Array of country names for multi-select filter */
  countries?: string[];
  score?: string | number;
}): Promise<WaitlistResponse> {
  const limit = params?.limit !== undefined ? params.limit : 10;
  const skip = params?.skip !== undefined ? params.skip : 0;
  const backendSearch = params?.search?.trim();

  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  qs.set('skip', String(skip));

  if (backendSearch) qs.set('search', backendSearch);
  if (params?.status) qs.set('status', params.status);
  if (params?.medium) qs.set('medium', params.medium);

  (params?.cityNames ?? []).forEach((c) => qs.append('cityNames', c));
  (params?.countries ?? []).forEach((c) => qs.append('countries', c));

  let finalMinScore = params?.minScore;
  if (finalMinScore === undefined && params?.score !== undefined) {
    const num = Number(params.score);
    if (!isNaN(num)) finalMinScore = num;
  }
  if (finalMinScore !== undefined) qs.set('minScore', String(finalMinScore));
  if (params?.maxScore !== undefined) qs.set('maxScore', String(params.maxScore));

  const url = `${ADMIN_WAITLIST_URL}/rejected?${qs.toString()}`;


  try {
    const res = await customAxios.get(url);
    const data = res.data?.data;

    const usersList = data?.items || [];
    const totalCount = data?.totalItems || 0;

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

export const ADMIN_PROFILE_USERS_URL = `${BASE_URL}/user-service/admin/customers/pending-verification`;

/**
 * Fetches the list of profile users for verification.
 *
 * Supported backend query parameters (confirmed):
 *   - search   : partial name/phone search
 *   - limit    : page size
 *   - skip     : offset
 *   - status   : user status
 *   - medium   : referral medium
 *   - minScore : minimum reliability score
 *   - maxScore : maximum reliability score
 *   - cityId   : filter by city UUID (snowflake)
 *
 * NOT supported: country, city (as string)
 */
export async function fetchProfileUsersGetAll(params?: {
  limit?: number;
  skip?: number;
  search?: string;
  status?: string;
  verificationStatus?: string;
  medium?: string;
  minScore?: number;
  maxScore?: number;
  /** Array of city names for multi-select filter */
  cityNames?: string[];
  /** Array of country names for multi-select filter */
  countries?: string[];
  score?: string | number;
}): Promise<ProfileUsersResponse> {
  const limit = params?.limit !== undefined ? params.limit : 10;
  const skip = params?.skip !== undefined ? params.skip : 0;
  const backendSearch = params?.search?.trim();

  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  qs.set('skip', String(skip));

  if (backendSearch) qs.set('search', backendSearch);
  if (params?.status) qs.set('status', params.status);
  if (params?.verificationStatus) qs.set('verificationStatus', params.verificationStatus);
  if (params?.medium) qs.set('medium', params.medium);

  (params?.cityNames ?? []).forEach((c) => qs.append('cityNames', c));
  (params?.countries ?? []).forEach((c) => qs.append('countries', c));

  let finalMinScore = params?.minScore;
  if (finalMinScore === undefined && params?.score !== undefined) {
    const num = Number(params.score);
    if (!isNaN(num)) finalMinScore = num;
  }
  if (finalMinScore !== undefined) qs.set('minScore', String(finalMinScore));
  if (params?.maxScore !== undefined) qs.set('maxScore', String(params.maxScore));

  const url = `${ADMIN_PROFILE_USERS_URL}?${qs.toString()}`;


  try {
    const res = await customAxios.get(url);
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
  const url = `${BASE_URL}/user-service/admin/customers/${userId}/profile-verification/images/${imageId}`;

  try {
    const res = await customAxios.patch(url, { verified });
    return res.data?.result?.data ?? res.data?.data ?? res.data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Rejects specific (or all) verification images and notifies the user to re-upload.
 *
 * - If `imageIds` is non-empty, only those images are rejected.
 * - If `imageIds` is empty/undefined, all images are rejected.
 */
export async function rejectAndReuploadVerification(
  userId: string,
  reason: string,
  imageIds?: string[]
): Promise<any> {
  const url = `${BASE_URL}/user-service/admin/customers/${userId}/profile-verification/reject-and-reupload`;

  try {
    const res = await customAxios.post(url, {
      reason,
      ...(imageIds?.length ? { imageIds } : {}),
    });
    return res.data?.result?.data ?? res.data?.data ?? res.data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}
