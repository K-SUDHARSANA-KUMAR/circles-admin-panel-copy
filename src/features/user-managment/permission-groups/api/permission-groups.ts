import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';
import axios from 'axios';

const { PERMISSION_GROUPS_ENDPOINT } = apiEndPoint;

export const permissionGroupsApi = {
  getAll: async (params?: {
    search?: string;
    status?: string;
    userType?: string;
    roleId?: string;
    skip?: number;
    limit?: number;
    nonPaginated?: boolean;
    isActive?: boolean;
  }) => {
    const response = await customAxios.get(PERMISSION_GROUPS_ENDPOINT, { params });
    return response.data;
  },

  getById: async (permissionGroupId: string) => {
    const response = await customAxios.get(
      `${PERMISSION_GROUPS_ENDPOINT}/${permissionGroupId}`
    );
    return response.data;
  },

  getByUserId: async (userId: string) => {
    const response = await customAxios.get(
      `${PERMISSION_GROUPS_ENDPOINT}/user/${userId}`
    );
    return response.data;
  },

  create: async (data: any) => {
    const response = await customAxios.post(PERMISSION_GROUPS_ENDPOINT, data);
    return response.data;
  },

  update: async (permissionGroupId: string, data: any) => {
    const response = await customAxios.patch(
      `${PERMISSION_GROUPS_ENDPOINT}/${permissionGroupId}`,
      data
    );
    return response.data;
  },

  delete: async (permissionGroupId: string) => {
    const response = await customAxios.delete(
      `${PERMISSION_GROUPS_ENDPOINT}/${permissionGroupId}`
    );
    return response.data;
  },
};
