import { apiEndPoint } from '@/features/apiEndPoint';
import axios from 'axios';
import {
  ApiResponse,
  CreateRecordPayload,
  MasterRecord,
  MasterRecordFilters,
  PaginatedResponse,
  UpdateRecordPayload,
} from '../types/master.types';
import customAxios from '@/lib/axios';

const { MASTER_RECORDS_ENDPOINT } = apiEndPoint;

function authHeaders() {
  if (typeof window === 'undefined') return {} as Record<string, string>;
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const masterRecordsApi = {
  getAll: async (
    masterName: string,
    skip: number = 0,
    limit: number = 10,
    nonPaginated: boolean = false,
    filters?: MasterRecordFilters,
    userId?: string,
    search?: { term: string; fields: string[] },
    showAll: boolean = false
  ): Promise<PaginatedResponse<MasterRecord>> => {
    const params: any = {};

    if (userId) {
      params.nonPaginated = true;
    } else if (nonPaginated) {
      params.nonPaginated = true;
    } else {
      params.skip = skip;
      params.limit = limit;
    }

    if (showAll) {
      params.showAll = true;
    }

    // Handle search conversion: if filters.search is a string, convert it to proper format
    // Priority: use search parameter if provided, otherwise convert filters.search if it's a string
    let processedSearch = search;
    let filtersWithoutSearch = filters ? { ...filters } : {};

    // Only convert filters.search if search parameter is not provided
    if (!processedSearch && filters?.search && typeof filters.search === 'string' && filters.search.trim()) {
      // Determine search fields based on masterName
      let searchFields: string[] = [];

      if (masterName === 'beat') {
        // For beat, search in beatId, beatName, beatCode, and other relevant fields
        searchFields = ['beatId', 'beatName', 'beatCode', 'beatname', 'beatcode', 'beatid'];
      } else {
        // For other masters, use common field patterns
        const camelCaseName = `${masterName}Name`;
        const camelCaseId = `${masterName}Id`;
        const camelCaseCode = `${masterName}Code`;
        const lowercaseName = `${masterName}name`;
        const lowercaseId = `${masterName}id`;
        const lowercaseCode = `${masterName}code`;

        searchFields = [
          camelCaseId,
          camelCaseName,
          camelCaseCode,
          lowercaseId,
          lowercaseName,
          lowercaseCode,
          'name',
          'id',
          'code'
        ].filter(Boolean);
      }

      processedSearch = {
        term: filters.search,
        fields: searchFields
      };

      // Remove string search from filters since we've converted it
      delete filtersWithoutSearch.search;
    }

    const mergedFilters: MasterRecordFilters | undefined =
      (filtersWithoutSearch && Object.keys(filtersWithoutSearch).length > 0) || (processedSearch && processedSearch.term)
        ? {
          ...(filtersWithoutSearch || {}),
          ...(processedSearch && processedSearch.term && Array.isArray(processedSearch.fields) && processedSearch.fields.length > 0
            ? { search: processedSearch }
            : {}),
        }
        : undefined;

    if (mergedFilters && Object.keys(mergedFilters).length > 0) {
      params.filter = JSON.stringify(mergedFilters);
    }

    // If userId provided, use USERS endpoint with userId as query param
    if (userId) {
      const { USERS_ENDPOINT } = apiEndPoint;
      params.userId = userId;
      const response = await customAxios.get<
        ApiResponse<PaginatedResponse<MasterRecord>>
      >(`${USERS_ENDPOINT}/${masterName}/data`, {
        params,
        headers: { ...authHeaders() },
      });
      return response.data.data;
    }

    const response = await customAxios.get<
      ApiResponse<PaginatedResponse<MasterRecord>>
    >(`${MASTER_RECORDS_ENDPOINT}/${masterName}/data`, {
      params,
      headers: { ...authHeaders() },
    });
    return response.data.data;
  },

  getById: async (
    masterName: string,
    recordId: string
  ): Promise<MasterRecord> => {
    const response = await customAxios.get<ApiResponse<MasterRecord>>(
      `${MASTER_RECORDS_ENDPOINT}/${masterName}/data/${recordId}`,
      { headers: { ...authHeaders() } }
    );
    return response.data.data;
  },

  create: async (data: CreateRecordPayload): Promise<MasterRecord> => {
    const response = await customAxios.post<ApiResponse<MasterRecord>>(
      `${MASTER_RECORDS_ENDPOINT}/${data.masterName}/data`,
      data.data,
      { headers: { 'Content-Type': 'application/json', ...authHeaders() } }
    );
    return response.data.data;
  },

  update: async (data: UpdateRecordPayload): Promise<MasterRecord> => {
    const response = await customAxios.put<ApiResponse<MasterRecord>>(
      `${MASTER_RECORDS_ENDPOINT}/${data.masterName}/data/${data.recordId}`,
      data.data,
      { headers: { 'Content-Type': 'application/json', ...authHeaders() } }
    );
    return response.data.data;
  },

  // Patch only the isActive field for a master record
  patchIsActive: async (
    masterName: string,
    recordId: string,
    isActive: boolean
  ): Promise<MasterRecord> => {
    const response = await customAxios.patch<ApiResponse<MasterRecord>>(
      `${MASTER_RECORDS_ENDPOINT}/${masterName}/data/patch/${recordId}`,
      { isActive },
      { headers: { 'Content-Type': 'application/json', ...authHeaders() } }
    );
    return response.data.data;
  },

  delete: async (masterName: string, recordId: string): Promise<any> => {
    const response = await customAxios.delete<ApiResponse<any>>(
      `${MASTER_RECORDS_ENDPOINT}/${masterName}/data/${recordId}`,
      { headers: { ...authHeaders() } }
    );
    return response.data.data;
  },
};
