import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';

const USER_SERVICE_URL = process.env.NEXT_PUBLIC_USER_SERVICE_URL || (apiEndPoint.CITIES_ENDPOINT as string).replace('/cities', '');
export const ADMIN_AUTH_URL = `${USER_SERVICE_URL}/admin-auth`;

/**
 * Authenticates an admin user with email and password.
 */
export async function login(payload: { email: string; password?: string }): Promise<any> {
  try {
    const res = await customAxios.post(`${ADMIN_AUTH_URL}/login`, {
      email: payload.email.trim(),
      password: payload.password ? payload.password.trim() : '',
    });
    return res.data?.result?.data ?? res.data?.data ?? res.data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Initiates the forgot password flow by requesting a password reset code.
 */
export async function forgotPassword(payload: { email: string }): Promise<any> {
  try {
    const res = await customAxios.post(`${ADMIN_AUTH_URL}/forgot-password`, {
      email: payload.email.trim(),
    });
    return res.data?.result?.data ?? res.data?.data ?? res.data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}

/**
 * Confirms a password reset request using a code and setting a new password.
 */
export async function confirmForgotPassword(payload: {
  email: string;
  code: string;
  newPassword?: string;
}): Promise<any> {
  try {
    const res = await customAxios.post(`${ADMIN_AUTH_URL}/forgot-password/confirm`, {
      email: payload.email.trim(),
      code: payload.code.trim(),
      newPassword: payload.newPassword ? payload.newPassword.trim() : '',
    });
    return res.data?.result?.data ?? res.data?.data ?? res.data;
  } catch (err: any) {
    const msg = err.response?.data?.result?.message || err.response?.data?.message || err.message;
    throw new Error(msg);
  }
}
