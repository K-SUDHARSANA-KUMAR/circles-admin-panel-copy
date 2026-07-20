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
 *
 * Supported backend query parameters (confirmed via API):
 *   - search      : partial name search
 *   - limit       : page size
 *   - skip        : offset
 *   - countryId   : filter by country UUID (snowflake)
 *   - countryIds  : filter by multiple country UUIDs
 *   - countries   : filter by country names (multi-select, sent as repeated params)
 *   - cityNames   : filter by city names (multi-select, sent as repeated params)
 *   - isActive    : filter by active status (boolean)
 *
 * NOT supported (returns 400): country, countryCode, city, status
 */
export async function fetchCities(params?: {
  search?: string;
  limit?: number;
  skip?: number;
  /** Pass the backend countryIds (UUID/snowflake array) to filter by country */
  countryIds?: string[];
  /** Pass country names array to filter by country name (multi-select) */
  countries?: string[];
  /** Pass city names array to filter by city name (multi-select) */
  cityNames?: string[];
  /** Pass true/false to filter active/inactive cities */
  isActive?: boolean;
  hasVenues?: boolean;
  countryCode?: string;
  country?: string;
  city?: string;
  status?: string;
}): Promise<City[]> {
  try {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.skip !== undefined) qs.set('skip', String(params.skip));
    if (params?.search?.trim()) qs.set('search', params.search.trim());
    if (params?.isActive !== undefined) qs.set('isActive', params.isActive ? 'true' : 'false');
    if (params?.hasVenues !== undefined) qs.set('hasVenues', params.hasVenues ? 'true' : 'false');

    (params?.countryIds ?? []).forEach((id) => qs.append('countryIds', id));
    (params?.countries ?? []).forEach((c) => qs.append('countries', c));
    (params?.cityNames ?? []).forEach((n) => qs.append('cityNames', n));

    const url = `${CITIES_URL}?${qs.toString()}`;
    const res = await customAxios.get(url);
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
