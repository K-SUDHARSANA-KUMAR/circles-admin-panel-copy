import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';

const { CONFIGURATIONS_ENDPOINT } = apiEndPoint;

export const configurationsApi = {
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
  }) => {
    const queryParams = new URLSearchParams();

    if (params?.skip !== undefined) {
      queryParams.append('skip', params.skip.toString());
    }
    if (params?.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.search) {
      queryParams.append('search', params.search);
    }

    const url = `${CONFIGURATIONS_ENDPOINT}/context${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await customAxios.get(url);
    return response.data;
  },

  getByContext: async (contextName: string) => {
    const url = `${CONFIGURATIONS_ENDPOINT}/context/${contextName}`;
    const response = await customAxios.get(url);
    return response.data;
  },

  updateByContext: async (contextName: string, data: any) => {
    const url = `${CONFIGURATIONS_ENDPOINT}/context/${contextName}`;
    const response = await customAxios.put(url, data);
    return response.data;
  },

  patchByConfigId: async (configId: string, data: any) => {
    const url = `${CONFIGURATIONS_ENDPOINT}/${configId}`;
    const response = await customAxios.patch(url, data);
    return response.data;
  },
};
