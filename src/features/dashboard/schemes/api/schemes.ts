import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from 'axios';
import {
  CreateSchemePayload,
  QuerySchemesParams,
  Scheme,
  SchemesResponse,
  UpdateSchemePayload,
} from '../types/schemes.types';

const { SCHEMES_ENDPOINT } = apiEndPoint;

export const schemesApi = {
  // getAll: async (params?: QuerySchemesParams): Promise<SchemesResponse> => {
  //   const finalParams: any = {};
  //   if (params) {
  //     for (const key of Object.keys(params) as Array<keyof QuerySchemesParams>) {
  //       const val: any = (params as any)[key];
  //       if (Array.isArray(val)) {
  //         finalParams[key] = JSON.stringify(val);
  //       } else if (val !== undefined) {
  //         finalParams[key] = val;
  //       }
  //     }
  //   }
  //   const response = await customAxios.get(SCHEMES_ENDPOINT, { params: finalParams });
  //   return response.data;

  // },

  getAll: async (params?: QuerySchemesParams): Promise<SchemesResponse> => {
    const response = await customAxios.get(SCHEMES_ENDPOINT, { params });
    return response.data;
  },

  getActive: async (): Promise<SchemesResponse> => {
    const response = await customAxios.get(`${SCHEMES_ENDPOINT}/active`);
    return response.data;
  },

  getById: async (id: string): Promise<Scheme> => {
    const response = await customAxios.get(`${SCHEMES_ENDPOINT}/${id}`);
    return response.data;
  },

  getBySchemeId: async (schemeId: string): Promise<Scheme> => {
    const response = await customAxios.get(`${SCHEMES_ENDPOINT}/id/${schemeId}`);
    return response.data;
  },

  create: async (data: CreateSchemePayload): Promise<Scheme> => {
    const response = await customAxios.post(SCHEMES_ENDPOINT, data);
    return response.data;
  },

  update: async (id: string, data: UpdateSchemePayload): Promise<Scheme> => {
    const response = await customAxios.patch(`${SCHEMES_ENDPOINT}/${id}`, data);
    return response.data;
  },

  updateStatus: async (
    id: string,
    status: 'DRAFT' | 'ACTIVE' | 'INACTIVE'
  ): Promise<Scheme> => {
    const response = await customAxios.patch(`${SCHEMES_ENDPOINT}/${id}/status`, {
      status,
    });
    return response.data;
  },

  updateApprovalStatus: async (
    entityId: string,
    approvalStatus: 'approved' | 'rejected',
    remarks: string,
    approverId: string,
    roleId: string,
    entityType: string = 'schemes'
  ): Promise<any> => {
    const configServiceUrl = process.env.NEXT_PUBLIC_CONFIG_SERVICE_URL;
    const response = await customAxios.patch(
      `${configServiceUrl}/approvals/${entityType}/entity/${entityId}/process`,
      {
        approverId,
        roleId,
        approvalStatus,
        remarks,
      }
    );
    return response.data;
  },

  delete: async (id: string): Promise<Scheme> => {
    const response = await customAxios.delete(`${SCHEMES_ENDPOINT}/${id}`);
    return response.data;
  },

  calculateReward: async (
    warehouseId: string,
    products: any[],
    outletId?: string
  ) => {
    const response = await customAxios.post(`${SCHEMES_ENDPOINT}/calculate`, {
      warehouseId,
      products,
      outletId,
    });
    return response.data;
  },

  getRecommendations: async (
    warehouseId: string,
    cartItems: any[],
    outletId?: string,
    maxRecommendations?: number
  ) => {
    const response = await customAxios.post(`${SCHEMES_ENDPOINT}/recommendations`, {
      warehouseId,
      cartItems,
      outletId,
      maxRecommendations,
    });
    return response.data;
  },

  getApprovals: async (
    entityId: string,
    approverId?: string,
    approverRoleId?: string,
    status?: string
  ) => {
    const configServiceUrl = process.env.NEXT_PUBLIC_CONFIG_SERVICE_URL;
    const params = new URLSearchParams();
    params.append('entityId', entityId);

    const response = await customAxios.get(
      `${configServiceUrl}/approvals/schemes?${params.toString()}`
    );
    return response.data;
  },

  getApprovalSchemes: async (
    approverId: string,
    approverRoleId: string,
    params?: { skip?: number; limit?: number; search?: string; status?: string }
  ): Promise<SchemesResponse> => {
    const response = await customAxios.get(`${SCHEMES_ENDPOINT}/approvals`, {
      params: {
        approverId,
        approverRoleId,
        skip: params?.skip,
        limit: params?.limit,
        search: params?.search,
        status: params?.status,
      },
    });
    return response.data;
  },
};
