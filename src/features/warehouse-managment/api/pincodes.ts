import { apiEndPoint } from '@/features/apiEndPoint';
import axios from 'axios';

const { PINCODE_ENDPOINT, PINCODE_PARTNER_ENDPOINT } = apiEndPoint;

export interface Pincode {
  id?: string;
  _id?: string;
  pincode: number;
  city: string;
  district: string;
  state: string;
  isDeleted?: boolean;
}

export const pincodesApi = {
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    filter?: string;
    deleted?: boolean;
  }) => {
    const response = await axios.get(PINCODE_ENDPOINT, { params });
    return response.data;
  },

  getById: async (pincodeId: string) => {
    const response = await axios.get(`${PINCODE_ENDPOINT}/${pincodeId}`);
    return response.data;
  },

  create: async (data: Pincode) => {
    const response = await axios.post(PINCODE_ENDPOINT, data);
    return response.data;
  },

  update: async (pincodeId: string, data: Partial<Pincode>) => {
    const response = await axios.patch(
      `${PINCODE_ENDPOINT}/${pincodeId}`,
      data
    );
    return response.data;
  },

  delete: async (pincodeId: string) => {
    const response = await axios.delete(`${PINCODE_ENDPOINT}/${pincodeId}`);
    return response.data;
  },

  findByIds: async (pincodeIds: string[]) => {
    const response = await axios.post(`${PINCODE_ENDPOINT}/by-ids`, {
      pincodeIds,
    });
    return response.data;
  },

  getUnmappedPincodes: async (
    pincodes: string[],
    params?: {
      skip?: number;
      limit?: number;
      channelId?: string;
      stateId?: string;
      districtId?: string;
      search?: string;
    },
    signal?: AbortSignal
  ) => {
    const response = await axios.post(
      `${PINCODE_PARTNER_ENDPOINT}/warehouse/unmapped-pincodes/data`,
      {
        pincodes,
      },
      {
        params,
        signal,
      }
    );
    return response.data;
  },
};
