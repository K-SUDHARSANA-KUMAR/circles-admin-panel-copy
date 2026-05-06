import { apiEndPoint } from "@/features/apiEndPoint";
import customAxios from "@/lib/axios";
import axios from "axios";

const { MASTER_SCHEMA_ENDPOINT } = apiEndPoint;

interface SchemaField {
  name?: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  masterId?: string;
  relation?: string;
}

export interface CreateSchemaPayload {
  name?: string;
  displayName: string;
  groupId: string;
  groupName: string;
  fields: SchemaField[];
}

export const masterSchemaApi = {
  getAll: async (params?: { nonPaginated?: boolean }) => {
    const queryParams = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    const url = queryParams ? `${MASTER_SCHEMA_ENDPOINT}?${queryParams}` : MASTER_SCHEMA_ENDPOINT;
    const response = await customAxios.get(url);
    return response.data;
  },
  getSchemaById: async (schemaName: string) => {
    const response = await customAxios.get(`${MASTER_SCHEMA_ENDPOINT}/${schemaName}`);
    return response.data;
  },
  
  create: async (data: CreateSchemaPayload) => {
    const response = await customAxios.post(MASTER_SCHEMA_ENDPOINT, data);
    return response.data;
  },

  update: async (schemaId: string, data: CreateSchemaPayload) => {
    const response = await customAxios.put(`${MASTER_SCHEMA_ENDPOINT}/${schemaId}`, data);
    return response.data;
  },

  delete: async (schemaName: string) => {
    const response = await customAxios.delete(`${MASTER_SCHEMA_ENDPOINT}/${schemaName}`);
    return response.data;
  },

  getSchemasByGroupId: async (groupId: string) => {
    const response = await customAxios.get(`${MASTER_SCHEMA_ENDPOINT}/group/${groupId}`);
    return response.data;
  }
}; 