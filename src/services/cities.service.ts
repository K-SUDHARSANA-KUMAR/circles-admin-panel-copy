import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';

export interface City {
  cityId?: string;
  city_id?: string;
  id?: string;
  name: string;
  country_code: string;
  is_active: boolean;
  country?: {
    code: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export const CITIES_URL = apiEndPoint.CITIES_ENDPOINT as string;

/**
 * Fetches the list of cities.
 */
export async function fetchCities(): Promise<City[]> {
  try {
    const res = await customAxios.get(CITIES_URL);
    const data = res.data?.result?.data ?? res.data?.data ?? res.data;
    if (!Array.isArray(data)) {
      throw new Error('Unexpected response format from API');
    }
    return data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message || 'Server responded with error';
    throw new Error(msg);
  }
}

/**
 * Creates a new city.
 */
export async function createCity(payload: { name: string; country_code: string; is_active: boolean }): Promise<City> {
  try {
    const res = await customAxios.post(CITIES_URL, payload);
    return res.data?.result?.data ?? res.data?.data ?? res.data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Updates an existing city.
 */
export async function updateCity(cityId: string, payload: { name: string; country_code: string; is_active: boolean }): Promise<City> {
  try {
    const res = await customAxios.put(`${CITIES_URL}/${cityId}`, payload);
    return res.data?.result?.data ?? res.data?.data ?? res.data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Deletes a city.
 */
export async function deleteCity(cityId: string): Promise<void> {
  try {
    await customAxios.delete(`${CITIES_URL}/${cityId}`);
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}
