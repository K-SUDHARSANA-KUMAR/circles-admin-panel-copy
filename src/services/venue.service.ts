import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ApiVenue {
  id?: string;
  venueId?: string;
  venue_id?: string;
  name: string;
  cityId?: string;
  city?: any;
  latitude: number | string;
  longitude: number | string;
  addressLine1: string;
  region: string;
  country: string;
  isVisible: boolean;
  coverImageS3FileName?: string;
  coverImageUrl?: string;
  s3ImageUrl?: string;
  image?: string;
  description?: string;
  interests?: string[];
  capacity?: number;
  status?: string;
  manager?: string;
  createdAt?: string;
  updatedAt?: string;
  popularity?: number;
  popularityScore?: number;
}

export interface Venue {
  id?: string;
  name: string;
  image: string | null;
  imageFile?: File | null;
  location?: string;
  addressLine1: string;
  city: string;
  cityId?: string;
  region: string;
  country?: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  interests: string[];
  description: string;
  capacity?: number;
  status?: string;
  manager?: string;
  isFeature?: boolean;
  isPartner?: boolean;
  isVisible?: boolean;
  createdAt?: string;
  updatedAt?: string;
  coverImageS3FileName?: string;
  popularity?: number;
  popularityScore?: number;
}

// ─── Endpoint Configuration ──────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || (apiEndPoint.CITIES_ENDPOINT as string).replace('/cities', '');
export const VENUES_URL = `${BASE_URL}/user-service/venues`;
export const ADMIN_VENUES_URL = `${BASE_URL}/user-service/admin/venues`;

// ─── Mapper Helpers ──────────────────────────────────────────────────────────

/**
 * Maps a single backend API venue record to the frontend UI Venue model.
 */
export function mapApiToVenue(api: ApiVenue): Venue {
  const id = api.venueId || api.id || api.venue_id || '';
  
  // Resolve city name string
  let cityName = '';
  if (typeof api.city === 'object' && api.city !== null) {
    cityName = api.city.name || '';
  } else if (typeof api.city === 'string') {
    cityName = api.city;
  }
  
  // Build premium cover image URL
  const image = api.coverImageUrl || api.s3ImageUrl || api.image || '';

  return {
    id,
    name: api.name || '',
    image: image || null,
    imageFile: null,
    location: api.addressLine1 ? `${api.addressLine1}${cityName ? `, ${cityName}` : ''}` : (cityName || 'No Location Details'),
    addressLine1: api.addressLine1 || '',
    city: cityName,
    cityId: api.cityId || (typeof api.city === 'object' ? api.city?.id || api.city?.city_id : undefined),
    region: api.region || '',
    country: api.country || 'IN',
    postalCode: '', // Not returned directly by API, keep fallback empty string
    latitude: api.latitude !== undefined ? String(api.latitude) : '0',
    longitude: api.longitude !== undefined ? String(api.longitude) : '0',
    interests: api.interests || [],
    description: api.description || '',
    capacity: api.capacity || 100,
    status: api.status || 'Available',
    manager: api.manager || 'Operational Staff',
    isFeature: false,
    isPartner: false,
    isVisible: api.isVisible !== undefined ? api.isVisible : true,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
    coverImageS3FileName: api.coverImageS3FileName || '',
    popularity: api.popularity,
    popularityScore: api.popularityScore !== undefined ? api.popularityScore : api.popularity,
  };
}

/**
 * Intelligently extracts an array of venues from any backend response envelope structure.
 */
function extractVenuesArray(resData: any): ApiVenue[] {
  if (!resData) return [];

  // If it's a direct array
  if (Array.isArray(resData)) return resData;

  const data = resData.result?.data ?? resData.data ?? resData.result ?? resData;
  if (Array.isArray(data)) return data;

  // Check nested object keys commonly used for lists
  if (data && typeof data === 'object') {
    const listKeys = ['venues', 'items', 'records', 'data', 'venueList', 'rows'];
    for (const key of listKeys) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }

    // Deep search for first array field
    const arrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
    if (arrayKey) {
      return data[arrayKey];
    }

    // Fallback if data is inside nested structures
    const resultObj = resData.result;
    if (resultObj && typeof resultObj === 'object') {
      for (const key of listKeys) {
        if (Array.isArray(resultObj[key])) {
          return resultObj[key];
        }
      }
      const resArrayKey = Object.keys(resultObj).find(key => Array.isArray(resultObj[key]));
      if (resArrayKey) {
        return resultObj[resArrayKey];
      }
    }
  }

  return [];
}

// ─── API Operations ──────────────────────────────────────────────────────────

/**
 * Fetches all venues.
 */
export async function fetchVenues(params?: {
  search?: string;
  page?: number;
  limit?: number;
  cityId?: string;
  cityNames?: string[];
  countries?: string[];
}): Promise<Venue[]> {
  try {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (typeof params?.search === 'string' && params.search.trim()) qs.set('search', params.search.trim());
    if (params?.cityId?.trim()) qs.set('cityId', params.cityId.trim());

    (params?.cityNames ?? []).forEach((c: string) => qs.append('cityNames', c));
    (params?.countries ?? []).forEach((c: string) => qs.append('countries', c));

    const url = `${ADMIN_VENUES_URL}?${qs.toString()}`;
    const res = await customAxios.get(url);
    let rawData = res.data;
    let venuesList = extractVenuesArray(rawData);
    
    // Fallback if no array extracted and no parameters provided
    if (venuesList.length === 0 && !params?.search && !params?.page) {
      try {
        const fallbackParams: Record<string, any> = {};
        if (params?.page !== undefined) fallbackParams.page = params.page;
        if (params?.limit !== undefined) fallbackParams.limit = params.limit;
        if (params?.search?.trim()) fallbackParams.search = params.search.trim();
        if (params?.cityId?.trim()) fallbackParams.cityId = params.cityId.trim();

        const fallbackRes = await customAxios.get(`${VENUES_URL}/`, { params: fallbackParams });
        const fallbackList = extractVenuesArray(fallbackRes.data);
        if (fallbackList.length > 0) {
          venuesList = fallbackList;
          rawData = fallbackRes.data;
        }
      } catch (fallbackErr) {
        console.warn("Trailing slash fallback request failed:", fallbackErr);
      }
    }
    
    const mappedVenues = venuesList.map(mapApiToVenue);
    const total = rawData?.data?.total ?? rawData?.result?.data?.total ?? rawData?.total ?? mappedVenues.length;
    const totalPages = rawData?.data?.totalPages ?? rawData?.result?.data?.totalPages ?? rawData?.totalPages ?? Math.ceil(total / (params?.limit ?? 10));

    return Object.assign(mappedVenues, { total, totalPages });
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message || 'Failed to fetch venues';
    throw new Error(msg);
  }
}

/**
 * Fetches a single venue by ID.
 */
export async function fetchVenueById(id: string): Promise<Venue> {
  try {
    const res = await customAxios.get(`${ADMIN_VENUES_URL}/${id}`);
    const data = res.data?.result?.data ?? res.data?.data ?? res.data;
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid venue data received from API');
    }
    
    return mapApiToVenue(data);
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message || `Failed to fetch venue with ID ${id}`;
    throw new Error(msg);
  }
}

/**
 * Creates a new venue.
 */
export async function createVenue(payload: {
  name: string;
  cityId: string;
  latitude: number;
  longitude: number;
  addressLine1: string;
  region: string;
  country: string;
  isVisible: boolean;
  coverImageS3FileName: string;
  isPartner?: boolean;
}): Promise<Venue> {
  try {
    const res = await customAxios.post(ADMIN_VENUES_URL, payload);
    const data = res.data?.result?.data ?? res.data?.data ?? res.data;
    return mapApiToVenue(data);
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message || 'Failed to create venue';
    throw new Error(msg);
  }
}

/**
 * Updates an existing venue.
 */
export async function updateVenue(
  id: string,
  payload: Partial<{
    name: string;
    cityId: string;
    latitude: number;
    longitude: number;
    addressLine1: string;
    region: string;
    country: string;
    isVisible: boolean;
    coverImageS3FileName: string;
    isPartner: boolean;
  }>
): Promise<Venue> {
  try {
    const res = await customAxios.patch(`${ADMIN_VENUES_URL}/${id}`, payload);
    const data = res.data?.result?.data ?? res.data?.data ?? res.data;
    return mapApiToVenue(data);
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message || 'Failed to update venue';
    throw new Error(msg);
  }
}

/**
 * Deletes a venue.
 */
export async function deleteVenue(id: string): Promise<void> {
  try {
    await customAxios.delete(`${ADMIN_VENUES_URL}/${id}`);
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message || 'Failed to delete venue';
    throw new Error(msg);
  }
}

/**
 * Fetches featured venues.
 */
export async function fetchFeaturedVenues(cityId: string = ''): Promise<Venue[]> {
  try {
    const res = await customAxios.get(`${VENUES_URL}/featured?cityId=${cityId}&limit=100`);
    const rawData = res.data;
    const venuesList = extractVenuesArray(rawData);
    return venuesList.map(mapApiToVenue);
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message || 'Failed to fetch featured venues';
    throw new Error(msg);
  }
}
