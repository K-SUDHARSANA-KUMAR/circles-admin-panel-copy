import axios from 'axios';
import { ILoginCredentials, ILoginResponse } from '../types/auth.types';
import { apiEndPoint } from '@/features/apiEndPoint';

const { AUTH_BASE_URL } = apiEndPoint;

// Validate AUTH_BASE_URL
const validateAuthBaseUrl = () => {
  if (!AUTH_BASE_URL) {
    throw new Error('AUTH_BASE_URL is not configured. Please check your environment variables.');
  }
};

export const authApi = {
  signInWithPassword: async (
    data: ILoginCredentials
  ): Promise<ILoginResponse> => {
    validateAuthBaseUrl();
    const response = await axios.post(
      `${AUTH_BASE_URL}/auth/signin/password`,
      data
    );
    return response.data.data;
  },
  signInJWT: async (data: ILoginCredentials): Promise<ILoginResponse> => {
    validateAuthBaseUrl();
    const response = await axios.post(`${AUTH_BASE_URL}/auth/login-jwt`, data);
    return response.data.data;
  },
};
