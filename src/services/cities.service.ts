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

export const CITIES_URL = (apiEndPoint.CITIES_ENDPOINT as string) || 'http://ec2-13-48-49-25.eu-north-1.compute.amazonaws.com/api/user-service/cities';

export async function fetchCities(): Promise<City[]> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  // Use the provided active Bearer token if token is missing, mock, or invalid
  const useProvidedToken = !token || token === 'mock-access-token' || !token.startsWith('eyJ');
  const authHeader = useProvidedToken
    ? 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjMDVhZjM1NC00ZWZkLTQ0NmQtOWRmYS03ZWRiMDA0OGQxZmYiLCJpYXQiOjE3Nzk0NTQ0NjUsImV4cCI6MTc4MjA0NjQ2NX0.9nt5US9IHDfClT9WnwFjN8f_MN-rnstGEfT6Gx-KoTI'
    : `Bearer ${token}`;

  const res = await fetch(CITIES_URL, {
    method: 'GET',
    headers: {
      'Authorization': authHeader
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
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  // Use the provided active Bearer token if token is missing, mock, or invalid
  const useProvidedToken = !token || token === 'mock-access-token' || !token.startsWith('eyJ');
  const authHeader = useProvidedToken
    ? 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjMDVhZjM1NC00ZWZkLTQ0NmQtOWRmYS03ZWRiMDA0OGQxZmYiLCJpYXQiOjE3Nzk0NTQ0NjUsImV4cCI6MTc4MjA0NjQ2NX0.9nt5US9IHDfClT9WnwFjN8f_MN-rnstGEfT6Gx-KoTI'
    : `Bearer ${token}`;

  const res = await fetch(CITIES_URL, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
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
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  // Use the provided active Bearer token if token is missing, mock, or invalid
  const useProvidedToken = !token || token === 'mock-access-token' || !token.startsWith('eyJ');
  const authHeader = useProvidedToken
    ? 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjMDVhZjM1NC00ZWZkLTQ0NmQtOWRmYS03ZWRiMDA0OGQxZmYiLCJpYXQiOjE3Nzk0NTQ0NjUsImV4cCI6MTc4MjA0NjQ2NX0.9nt5US9IHDfClT9WnwFjN8f_MN-rnstGEfT6Gx-KoTI'
    : `Bearer ${token}`;

  const res = await fetch(`${CITIES_URL}/${cityId}`, {
    method: 'PUT',
    headers: {
      'Authorization': authHeader,
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
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  // Use the provided active Bearer token if token is missing, mock, or invalid
  const useProvidedToken = !token || token === 'mock-access-token' || !token.startsWith('eyJ');
  const authHeader = useProvidedToken
    ? 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjMDVhZjM1NC00ZWZkLTQ0NmQtOWRmYS03ZWRiMDA0OGQxZmYiLCJpYXQiOjE3Nzk0NTQ0NjUsImV4cCI6MTc4MjA0NjQ2NX0.9nt5US9IHDfClT9WnwFjN8f_MN-rnstGEfT6Gx-KoTI'
    : `Bearer ${token}`;

  const res = await fetch(`${CITIES_URL}/${cityId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': authHeader
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.result?.message || body?.message || `Server responded with ${res.status}`;
    throw new Error(msg);
  }
}
