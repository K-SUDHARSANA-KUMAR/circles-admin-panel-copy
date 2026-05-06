import axios from "axios";
import { PermissionGroup } from "../../permission-groups/types";
import { apiEndPoint } from "@/features/apiEndPoint";
import customAxios from "@/lib/axios";

const { USERS_ENDPOINT, ZING_ENDPOINT } = apiEndPoint;

interface Coordinates {
  coordinates: [number, number];
  type: string;
}

interface UserAddress {
  location: Coordinates;
  streetAddress: string;
}

interface Warehouse {
  warehouseId: string;
}

export interface User {
  _id: string;
  name: string;
  phoneNumber: string;
  email: string;
  employeeCode: string;
  gradeId?: string;
  userType: string;
  roleId: string;
  roleName?: string;
  reportingTo?: string;
  userAddress: UserAddress;
  status: string;
  doj: string;
  permissionGroup: PermissionGroup[] | null;
  permissionGroupDetails?: Array<{
    permissionGroupId: string;
    name: string;
    roleId: string;
    userType: string;
    permissions: string[];
  }>;
  mappings?: Array<{ warehouseId: string }>;
  userName: string;
  isDeleted?: boolean;
  isActive?: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  imeiNo: string;
  password?: string;
  beatDetails?: {
    beatId?: string;
    beatName?: string;
  };
  pjpPlanTypeId?: string;
  planId?: string;
}

interface ApiResponse {
  data: {
    totalItems: number;
    totalPages: number;
    skip: number;
    limit: number;
    items: User[];
  };
  status: number;
  errors: null | string;
}

export interface CreateUserData {
  name: string;
  phoneNumber: string;
  email: string;
  employeeCode: string;
  gradeId?: string;
  userType: string;
  roleId: string;
  userAddress: UserAddress;
  status: string;
  doj: string;
  permissionGroup: string[];
  mappings: Array<{ warehouseId: string }>;
  userName: string;
  password: string;
  beatDetails?: {
    beatId?: string;
    beatName?: string;
  };
}

export interface UpdateUserData extends Partial<CreateUserData> {}

// Utility function to transform warehouse to mappings
const transformUserData = (data: any) => {
  const transformed = { ...data };
  
  // Transform warehouse to mappings if present
  if (transformed.warehouse) {
    transformed.mappings = transformed.warehouse;
    delete transformed.warehouse;
  }
  
  // Remove empty fields
  if (transformed.imeiNo === '') delete transformed.imeiNo;
  if (transformed.grade === '') delete transformed.grade;
  if (transformed.status === '') delete transformed.status;
  
  return transformed;
};

export const usersApi = {
  getAll: async (params?: {
    search?: string;
    warehouseId?: string | string[];
    divisionId?: string;
    channelId?: string;
    zoneId?: string;
    subZoneId?: string;
    nonPaginated?: string;
    roleId?: string;
    name?: string;
    status?: string;
    userType?: string;
    skip?: number;
    limit?: number;
    reportingTo?: string;
  }): Promise<ApiResponse> => {
    // Handle warehouseId array properly
    const finalParams = { ...params };
    if (params?.warehouseId && Array.isArray(params.warehouseId)) {
      if (params.warehouseId.length === 0) {
        delete finalParams.warehouseId;
      } else {
        finalParams.warehouseId = JSON.stringify(params.warehouseId);
      }
    }
    
    // Remove undefined values to clean up the request
    Object.keys(finalParams).forEach(key => {
      if (finalParams[key as keyof typeof finalParams] === undefined) {
        delete finalParams[key as keyof typeof finalParams];
      }
    });
    
    const response = await customAxios.get(USERS_ENDPOINT, { params: finalParams });
    return response.data;
  },

  getById: async (userId: string, params?: { reportingTo?: string }): Promise<User> => {
    const response = await customAxios.get(`${USERS_ENDPOINT}/${userId}`, { params });
    return response.data.data;
  },

  create: async (data: CreateUserData): Promise<User> => {
    const transformedData = transformUserData(data);
    const response = await customAxios.post(USERS_ENDPOINT, transformedData);
    return response.data;
  },

  update: async (userId: string, data: UpdateUserData): Promise<User> => {
    const transformedData = transformUserData(data);
    const response = await customAxios.patch(`${USERS_ENDPOINT}/${userId}`, transformedData);
    return response.data;
  },

  delete: async (userId: string): Promise<void> => {
    const response = await customAxios.delete(`${USERS_ENDPOINT}/${userId}`);
    return response.data;
  },

    syncHr: async (): Promise<any> => {
      const response = await customAxios.post(ZING_ENDPOINT);
      return response.data;
    },
};
