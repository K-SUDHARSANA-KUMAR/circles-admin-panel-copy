import { apiEndPoint } from "@/features/apiEndPoint";
import customAxios from "@/lib/axios";

const { APPROVAL_HIERARCHY_ENDPOINT } = apiEndPoint;

export const approvalHierarchyApi = {
  getAll: async (
    skip?: number,
    limit?: number,
    contextName?: string,
    channelId?: string[]
  ) => {
    let query = '';
    if (contextName) {
      query += `contextName=${encodeURIComponent(contextName)}`;
    }
    if (channelId && Array.isArray(channelId) && channelId.length > 0) {
      query += (query ? '&' : '') + `channelId=${encodeURIComponent(JSON.stringify(channelId))}`;
    }
    if (typeof skip === 'number') {
      query += (query ? '&' : '') + `skip=${skip}`;
    }
    if (typeof limit === 'number') {
      query += (query ? '&' : '') + `limit=${limit}`;
    }
    const url = query ? `${APPROVAL_HIERARCHY_ENDPOINT}?${query}` : APPROVAL_HIERARCHY_ENDPOINT;
    const response = await customAxios.get(url);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await customAxios.post(APPROVAL_HIERARCHY_ENDPOINT, data);
    return response.data;
  },
  
  update: async (hierarchyId: string, data: any) => {
    const response = await customAxios.patch(`${APPROVAL_HIERARCHY_ENDPOINT}/${hierarchyId}`, data);
    return response.data;
  },
  
  delete: async (hierarchyId: string) => {
    const response = await customAxios.delete(`${APPROVAL_HIERARCHY_ENDPOINT}/${hierarchyId}`);
    return response.data;
  },
  
  getById: async (hierarchyId: string) => {
    const response = await customAxios.get(`${APPROVAL_HIERARCHY_ENDPOINT}/${hierarchyId}`);
    return response.data;
  }
};