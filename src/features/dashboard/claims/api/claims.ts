import { apiEndPoint } from '@/features/apiEndPoint';
import { CreateClaimPayload } from '../types/claim.types';
import customAxios from '@/lib/axios';

const { CLAIM_ENDPOINT } = apiEndPoint;

export const claimsApi = {
  getAll: async () => {
    const response = await customAxios.get(CLAIM_ENDPOINT);
    return response.data;
  },

  create: async (payload: CreateClaimPayload) => {
    const response = await customAxios.post(CLAIM_ENDPOINT, payload);
    return response.data;
  },
};
