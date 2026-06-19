import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';

export interface City {
  city_id?: string;
  cityId?: string;
  id?: string;
  name: string;
  country_code?: string;
  country_id?: string;
  countryId?: string;
  country?: {
    countryId?: string;
    name?: string;
    code?: string;
  };
  is_active: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const CITIES_URL = apiEndPoint.CITIES_ENDPOINT as string;

/**
 * Fetches the list of cities.
 */
export async function fetchCities(params?: { search?: string; limit?: number; skip?: number }): Promise<City[]> {
  try {
    const queryParams: Record<string, any> = {};
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.skip !== undefined) queryParams.skip = params.skip;
    if (params?.search?.trim()) queryParams.search = params.search.trim();

    const res = await customAxios.get(CITIES_URL, { params: queryParams });
    const data = res.data?.result?.data ?? res.data?.data ?? res.data;
    const cities =
      res?.data?.result?.data?.items ??
      res?.data?.data?.items ??
      res?.data?.items ??
      res?.data?.cities ??
      (Array.isArray(data) ? data : null);

    if (!Array.isArray(cities)) {
      throw new Error('Unexpected response format from API');
    }

    const totalItems =
      res?.data?.result?.data?.totalItems ??
      res?.data?.data?.totalItems ??
      res?.data?.totalItems ??
      cities.length;

    const mappedCities = cities.map((item: any) => ({
      ...item,
      city_id: item.city_id ?? item.cityId,
      cityId: item.cityId ?? item.city_id,
      is_active: item.is_active ?? item.isActive,
      isActive: item.isActive ?? item.is_active,
      country_code: item.country_code ?? item.country?.code ?? item.countryCode ?? '',
      country_id: item.country_id ?? item.country?.countryId ?? item.countryId ?? '',
      countryId: item.countryId ?? item.country?.countryId ?? item.country_id ?? '',
    }));

    return Object.assign(mappedCities, { totalItems });
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message || 'Server responded with error';
    throw new Error(msg);
  }
}

/**
 * Creates a new city.
 */
export async function createCity(payload: { name: string; countryId: string; isActive: boolean }): Promise<City> {
  try {
    const res = await customAxios.post(CITIES_URL, payload);
    const item = res.data?.result?.data ?? res.data?.data ?? res.data;
    return {
      ...item,
      city_id: item.city_id ?? item.cityId,
      cityId: item.cityId ?? item.city_id,
      is_active: item.is_active ?? item.isActive,
      isActive: item.isActive ?? item.is_active,
      country_code: item.country_code ?? item.country?.code ?? item.countryCode ?? '',
      country_id: item.country_id ?? item.country?.countryId ?? item.countryId ?? '',
      countryId: item.countryId ?? item.country?.countryId ?? item.country_id ?? '',
    };
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Updates an existing city.
 */
export async function updateCity(cityId: string, payload: { name: string; countryId: string; isActive: boolean }): Promise<City> {
  try {
    const res = await customAxios.put(`${CITIES_URL}/${cityId}`, payload);
    const item = res.data?.result?.data ?? res.data?.data ?? res.data;
    return {
      ...item,
      city_id: item.city_id ?? item.cityId,
      cityId: item.cityId ?? item.city_id,
      is_active: item.is_active ?? item.isActive,
      isActive: item.isActive ?? item.is_active,
      country_code: item.country_code ?? item.country?.code ?? item.countryCode ?? '',
      country_id: item.country_id ?? item.country?.countryId ?? item.countryId ?? '',
      countryId: item.countryId ?? item.country?.countryId ?? item.country_id ?? '',
    };
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

