import { apiEndPoint } from '@/features/apiEndPoint';

export interface City {
  city_id?: string;
  id?: string;
  name: string;
  country_code: string;
  is_active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const CITIES_URL = apiEndPoint.CITIES_ENDPOINT as string;

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const origin = window.location.origin ? window.location.origin.replace(/\/$/, '') : '';

  const headers: Record<string, string> = {
    'X-Admin-Api-Key': 'local-admin-key-123',
  };

  if (origin) {
    try {
      headers['Origin'] = origin;
    } catch (e) {
      // ignore browser restriction
    }
  }

  return headers;
}

export async function fetchCities(): Promise<City[]> {
  const res = await fetch(CITIES_URL, {
    method: 'GET',
    headers: {
      ...authHeaders()
    }
  });

  if (!res.ok) {
    throw new Error(`Server responded with ${res.status}`);
  }

  const json = await res.json();
  const data = json?.result?.data ?? json?.data ?? json;
  if (!Array.isArray(data)) {
    throw new Error('Unexpected response format from API');
  }
  return data;
}

export async function createCity(payload: { name: string; country_code: string; is_active: boolean }): Promise<City> {
  const res = await fetch(CITIES_URL, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.result?.message || body?.message || `Server responded with ${res.status}`;
    throw new Error(msg);
  }

  const json = await res.json();
  return json?.result?.data ?? json?.data ?? json;
}

export async function updateCity(cityId: string, payload: { name: string; country_code: string; is_active: boolean }): Promise<City> {
  const res = await fetch(`${CITIES_URL}/${cityId}`, {
    method: 'PUT',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.result?.message || body?.message || `Server responded with ${res.status}`;
    throw new Error(msg);
  }

  const json = await res.json();
  return json?.result?.data ?? json?.data ?? json;
}

export async function deleteCity(cityId: string): Promise<void> {
  const res = await fetch(`${CITIES_URL}/${cityId}`, {
    method: 'DELETE',
    headers: {
      ...authHeaders()
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.result?.message || body?.message || `Server responded with ${res.status}`;
    throw new Error(msg);
  }
}
