import { apiEndPoint } from '@/features/apiEndPoint';

const USER_SERVICE_URL = process.env.NEXT_PUBLIC_USER_SERVICE_URL || (apiEndPoint.CITIES_ENDPOINT as string).replace('/cities', '');
export const ADMIN_AUTH_URL = `${USER_SERVICE_URL}/admin-auth`;

/**
 * Generates authentication and authorization headers,
 * retrieving accessToken and idToken from local storage when in client-side environment.
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Admin-Api-Key': 'local-admin-key-123',
  };

  if (typeof window !== 'undefined') {
    const accessToken = localStorage.getItem('accessToken') || '';
    const idToken = localStorage.getItem('idToken') || '';
    const origin = window.location.origin ? window.location.origin.replace(/\/$/, '') : '';

    headers['Authorization'] = `Bearer ${accessToken}`;
    headers['accessToken'] = accessToken;
    headers['idToken'] = idToken;

    if (origin) {
      try {
        headers['Origin'] = origin;
      } catch (e) {
        // ignore browser restriction
      }
    }
  }

  return headers;
}

/**
 * Authenticates an admin user with email and password.
 */
export async function login(payload: { email: string; password?: string }): Promise<any> {
  const res = await fetch(`${ADMIN_AUTH_URL}/login`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password ? payload.password.trim() : '',
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.result?.message || body?.message || `Server responded with status code ${res.status}`;
    throw new Error(msg);
  }

  const json = await res.json();
  return json?.result?.data ?? json?.data ?? json;
}

/**
 * Initiates the forgot password flow by requesting a password reset code.
 */
export async function forgotPassword(payload: { email: string }): Promise<any> {
  const res = await fetch(`${ADMIN_AUTH_URL}/forgot-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email: payload.email.trim() }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.result?.message || body?.message || `Server responded with status code ${res.status}`;
    throw new Error(msg);
  }

  const json = await res.json();
  return json?.result?.data ?? json?.data ?? json;
}

/**
 * Confirms a password reset request using a code and setting a new password.
 */
export async function confirmForgotPassword(payload: {
  email: string;
  code: string;
  newPassword?: string;
}): Promise<any> {
  const res = await fetch(`${ADMIN_AUTH_URL}/forgot-password/confirm`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      email: payload.email.trim(),
      code: payload.code.trim(),
      newPassword: payload.newPassword ? payload.newPassword.trim() : '',
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.result?.message || body?.message || `Server responded with status code ${res.status}`;
    throw new Error(msg);
  }

  const json = await res.json();
  return json?.result?.data ?? json?.data ?? json;
}
