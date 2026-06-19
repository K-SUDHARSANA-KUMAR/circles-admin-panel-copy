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
 */
export async function fetchCountries(): Promise<Country[]> {
  try {
    const res = await customAxios.get(COUNTRIES_URL);
    const data = res.data?.data?.items;
    if (!Array.isArray(data)) {
      throw new Error('Unexpected response format from API');
    }
    return data.map((item: any) => ({
      ...item,
      countryId: item.countryId ?? item.country_id ?? item.id,
      country_id: item.country_id ?? item.countryId ?? item.id,
      isActive: item.isActive ?? item.is_active ?? true,
      is_active: item.is_active ?? item.isActive ?? true,
    }));
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
