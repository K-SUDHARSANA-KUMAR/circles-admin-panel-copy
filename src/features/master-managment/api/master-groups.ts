import { apiEndPoint } from "@/features/apiEndPoint";
import customAxios from "@/lib/axios";

const { GROUPS_ENDPOINT } = apiEndPoint;

export const groupsApi = {
  getAll: async () => {
    const response = await customAxios.get(GROUPS_ENDPOINT);
    return response.data;
  },
  
  create: async (data: { groupName: string; displayName: string }) => {
    const response = await customAxios.post(GROUPS_ENDPOINT, data);
    return response.data;
  },
  
  update: async (groupId: string, data: { groupName: string; displayName: string }) => {
    const response = await customAxios.patch(`${GROUPS_ENDPOINT}/${groupId}`, data);
    return response.data;
  },
  delete: async (groupId: string) => {
    const response = await customAxios.delete(`${GROUPS_ENDPOINT}/${groupId}`);
    return response.data;
  }
};