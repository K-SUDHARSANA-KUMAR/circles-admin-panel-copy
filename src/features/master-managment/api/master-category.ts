import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';
import {
  CreateRecordPayload,
  UpdateRecordPayload,
} from '../types/master.types';

const { MASTER_RECORDS_ENDPOINT } = apiEndPoint;

export const masterRecordsApi = {
  getAll: async (masterName: string) => {
    const response = await customAxios.get(
      `${MASTER_RECORDS_ENDPOINT}/${masterName}/data`
    );
    return response.data;
  },

  getById: async (masterName: string, recordId: string) => {
    const response = await customAxios.get(
      `${MASTER_RECORDS_ENDPOINT}/${masterName}/data/${recordId}`
    );
    return response.data;
  },

  create: async (data: CreateRecordPayload) => {
    const response = await customAxios.post(
      `${MASTER_RECORDS_ENDPOINT}/${data.masterName}/data`,
      data.data
    );
    return response.data;
  },

  update: async (data: UpdateRecordPayload) => {
    const response = await customAxios.put(
      `${MASTER_RECORDS_ENDPOINT}/${data.masterName}/data/${data.recordId}`,
      data.data
    );
    return response.data;
  },

  delete: async (masterName: string, recordId: string) => {
    const response = await customAxios.delete(
      `${MASTER_RECORDS_ENDPOINT}/${masterName}/data/${recordId}`
    );
    return response.data;
  },
};
