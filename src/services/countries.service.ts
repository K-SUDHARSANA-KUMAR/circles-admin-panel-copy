import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';

export interface Country {
  countryId?: string;
  country_id?: string;
  id?: string;
  name: string;
  code: string;
  isActive: boolean;
  is_active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const COUNTRIES_URL = apiEndPoint.COUNTRIES_ENDPOINT as string;

/**
 * Fetches the list of countries.
 *
 * Supported backend query parameters (confirmed):
 *   - search   : partial name search
 *   - limit    : page size
 *   - skip     : offset
 *   - isActive : filter active/inactive (boolean)
 *
 * NOT supported (returns 400): country, status, code
 */
export async function fetchCountries(params?: {
  limit?: number;
  skip?: number;
  search?: string;
  /** Pass true/false to filter active/inactive countries */
  isActive?: boolean;
  name?: string;
  countryName?: string;
  code?: string;
  countryCode?: string;
  status?: string;
}): Promise<Country[]> {
  try {
    const queryParams: Record<string, any> = {};
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.skip !== undefined) queryParams.skip = params.skip;
    if (params?.search?.trim()) queryParams.search = params.search.trim();
    if (params?.isActive !== undefined) queryParams.isActive = params.isActive ? 'true' : '';


    const res = await customAxios.get(COUNTRIES_URL, { params: queryParams });
    const data = res.data?.result?.data ?? res.data?.data ?? res.data;
    const countries =
      res?.data?.result?.data?.items ??
      res?.data?.data?.items ??
      res?.data?.items ??
      res?.data?.countries ??
      (Array.isArray(data) ? data : null);

    if (!Array.isArray(countries)) {
      throw new Error('Unexpected response format from API');
    }

    const totalItems =
      res?.data?.result?.data?.totalItems ??
      res?.data?.data?.totalItems ??
      res?.data?.totalItems ??
      countries.length;

    const mapped = countries.map((item: any) => ({
      ...item,
      countryId: item.countryId ?? item.country_id ?? item.id,
      country_id: item.country_id ?? item.countryId ?? item.id,
      isActive: item.isActive ?? item.is_active ?? true,
      is_active: item.is_active ?? item.isActive ?? true,
    }));

    return Object.assign(mapped, { totalItems });
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message || 'Server responded with error';
    throw new Error(msg);
  }
}

/**
 * Creates a new country.
 */
export async function createCountry(payload: { name: string; code: string; isActive: boolean }): Promise<Country> {
  try {
    const res = await customAxios.post(COUNTRIES_URL, payload);
    const item = res.data?.result?.data ?? res.data?.data ?? res.data;
    return {
      ...item,
      countryId: item.countryId ?? item.country_id ?? item.id,
      country_id: item.country_id ?? item.countryId ?? item.id,
      isActive: item.isActive ?? item.is_active ?? true,
      is_active: item.is_active ?? item.isActive ?? true,
    };
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Updates an existing country.
 */
export async function updateCountry(countryId: string, payload: { name: string; code: string; isActive: boolean }): Promise<Country> {
  try {
    const res = await customAxios.put(`${COUNTRIES_URL}/${countryId}`, payload);
    const item = res.data?.result?.data ?? res.data?.data ?? res.data;
    return {
      ...item,
      countryId: item.countryId ?? item.country_id ?? item.id,
      country_id: item.country_id ?? item.countryId ?? item.id,
      isActive: item.isActive ?? item.is_active ?? true,
      is_active: item.is_active ?? item.isActive ?? true,
    };
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Deletes a country.
 */
export async function deleteCountry(countryId: string): Promise<void> {
  try {
    await customAxios.delete(`${COUNTRIES_URL}/${countryId}`);
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}
