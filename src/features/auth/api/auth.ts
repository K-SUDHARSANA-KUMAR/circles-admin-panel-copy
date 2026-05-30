import axios from 'axios';
import { ILoginCredentials, ILoginResponse } from '../types/auth.types';

export const authApi = {
  signInWithPassword: async (
    data: ILoginCredentials
  ): Promise<ILoginResponse> => {
    const loginUrl = process.env.NEXT_PUBLIC_USER_SERVICE_URL + 'user-service/admin-auth/login';
    const payload = {
      email: (data.email || data.username || data.employeeCode || '').trim(),
      password: data.password ? data.password.trim() : '',
    };
    const response = await axios.post(loginUrl, payload);
    const apiData = response.data?.data;
    
    return {
      accessToken: apiData?.tokens?.accessToken || null,
      idToken: apiData?.tokens?.idToken || null,
      refreshToken: apiData?.tokens?.refreshToken || null,
      user: apiData?.adminUser ? {
        id: apiData.adminUser.id,
        userId: apiData.adminUser.id,
        name: apiData.adminUser.name + (apiData.adminUser.lastName ? ' ' + apiData.adminUser.lastName : ''),
        email: apiData.adminUser.email,
        phone: apiData.adminUser.phone,
        roleName: apiData.adminUser.role,
        ...apiData.adminUser
      } : null
    };
  },
  signInJWT: async (data: ILoginCredentials): Promise<ILoginResponse> => {
    const loginUrl = process.env.NEXT_PUBLIC_USER_SERVICE_URL + '/user-service/admin-auth/login';
    const payload = { 
      email: (data.email || data.username || data.employeeCode || '').trim(),
      password: data.password ? data.password.trim() : '',
    };
    const response = await axios.post(loginUrl, payload);
    const apiData = response.data?.data;
    
    return {
      accessToken: apiData?.tokens?.accessToken || null,
      idToken: apiData?.tokens?.idToken || null,
      refreshToken: apiData?.tokens?.refreshToken || null,
      user: apiData?.adminUser ? {
        id: apiData.adminUser.id,
        userId: apiData.adminUser.id,
        name: apiData.adminUser.name + (apiData.adminUser.lastName ? ' ' + apiData.adminUser.lastName : ''),
        email: apiData.adminUser.email,
        phone: apiData.adminUser.phone,
        roleName: apiData.adminUser.role,
        ...apiData.adminUser
      } : null
    };
  },
};
