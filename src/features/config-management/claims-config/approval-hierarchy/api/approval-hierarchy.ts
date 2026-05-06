import { apiEndPoint } from "@/features/apiEndPoint";
import customAxios from "@/lib/axios";

const { CLAIM_APPROVAL_HIERARCHY_ENDPOINT } = apiEndPoint;

export const approvalHierarchyApi = {
  getAll: async () => {
    const response = await customAxios.get(CLAIM_APPROVAL_HIERARCHY_ENDPOINT);
    return response.data;
  },
  
  create: async (data: { hierarchyName: string; displayName: string; levels: any[] }) => {
    const response = await customAxios.post(CLAIM_APPROVAL_HIERARCHY_ENDPOINT, data);
    return response.data;
  },
  
  update: async (hierarchyId: string, data: { hierarchyName: string; displayName: string; levels: any[] }) => {
    const response = await customAxios.patch(`${CLAIM_APPROVAL_HIERARCHY_ENDPOINT}/${hierarchyId}`, data);
    return response.data;
  },
  
  delete: async (hierarchyId: string) => {
    const response = await customAxios.delete(`${CLAIM_APPROVAL_HIERARCHY_ENDPOINT}/${hierarchyId}`);
    return response.data;
  },
  
  getById: async (hierarchyId: string) => {
    const response = await customAxios.get(`${CLAIM_APPROVAL_HIERARCHY_ENDPOINT}/${hierarchyId}`);
    return response.data;
  }
};