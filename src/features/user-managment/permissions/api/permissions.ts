import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';
import axios from 'axios';

const { PERMISSIONS_ENDPOINT } = apiEndPoint;

export const permissionsApi = {
  getAll: async (params?: {
    search?: string;
    status?: string;
    skip?: number;
    limit?: number;
    nonPaginated?: boolean;
  }) => {
    const response = await customAxios.get(PERMISSIONS_ENDPOINT, { params });
    return response.data;
  },

  getById: async (permissionId: string) => {
    const response = await customAxios.get(`${PERMISSIONS_ENDPOINT}/${permissionId}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await customAxios.post(PERMISSIONS_ENDPOINT, data);
    return response.data;
  },

  update: async (permissionId: string, data: any) => {
    const response = await customAxios.patch(
      `${PERMISSIONS_ENDPOINT}/${permissionId}`,
      data
    );
    return response.data;
  },

  delete: async (permissionId: string) => {
    const response = await customAxios.delete(
      `${PERMISSIONS_ENDPOINT}/${permissionId}`
    );
    return response.data;
  },
};
