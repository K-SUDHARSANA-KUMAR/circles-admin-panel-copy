import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';
import axios from 'axios';

const { STOCKAUDIT_ENDPOINT } = apiEndPoint;

export const stockAuditApi = {
  fetchByOutletId: async (outletId: string) => {
    const url = `${STOCKAUDIT_ENDPOINT}/outlet/${outletId}`;
    const response = await customAxios.get(url);
    return response.data;
  },

  create: async (data: {
    outletId: string;
    visitOrderId: string;
    products: { productId: string; currentStock: number }[];
  }) => {
    const response = await customAxios.post(STOCKAUDIT_ENDPOINT, data);
    return response.data;
  },

  update: async (
    stockAuditId: string,
    data: {
      outletId: string;
      products: { productId: string; currentStock: number }[];
      isDeleted?: boolean;
    }
  ) => {
    const url = `${STOCKAUDIT_ENDPOINT}/${stockAuditId}`;
    const response = await customAxios.patch(url, data);
    return response.data;
  },
};
