import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';

const { CONFIG_BASE_URL, PJP_CONFIG_INSIGHTS_ENDPOINT } = apiEndPoint;

export interface PJPConfig {
  _id: string;
  pjpConfigId: string;
  warehouseId: string;
  planFrequency: 'daily' | 'weekly' | 'monthly' | 'bi-monthly';
  includeSundays: boolean;
  totalWorkingHoursInMins: number;
  breakHoursInMins: number;
  maxTravelDistancePerDay: number;
  optimizationRadius: number;
  outletActivityDurationInMins: number;
  MaxOutletCountPerDay: number;
  workingDays: number;
  roles?: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface PJPConfigResponse {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  data: {
    totalItems: number;
    totalPages: number;
    skip: number;
    limit: number;
    items: PJPConfig[];
  };
}

export const pjpConfigApi = {
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
    territory?: string;
    warehouseId?: string;
  }): Promise<PJPConfigResponse> => {
    const queryParams = new URLSearchParams();

    if (params?.skip !== undefined) {
      queryParams.append('skip', params.skip.toString());
    }
    if (params?.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.search) {
      queryParams.append('search', params.search);
    }
    if (params?.status) {
      queryParams.append('status', params.status);
    }
    if (params?.territory) {
      queryParams.append('territory', params.territory);
    }
    if (params?.warehouseId) {
      queryParams.append('warehouseId', params.warehouseId);
    }

    const url = `${CONFIG_BASE_URL}/pjp-config${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await customAxios.get(url);
    return response.data;
  },

  getById: async (configId: string): Promise<{ data: PJPConfig }> => {
    const response = await customAxios.get(
      `${CONFIG_BASE_URL}/pjp-config/${configId}`
    );
    return response.data;
  },

  create: async (data: Partial<PJPConfig>): Promise<{ data: PJPConfig }> => {
    const response = await customAxios.post(
      `${CONFIG_BASE_URL}/pjp-config`,
      data
    );
    return response.data;
  },

  update: async (
    configId: string,
    data: Partial<PJPConfig>
  ): Promise<{ data: PJPConfig }> => {
    const response = await customAxios.patch(
      `${CONFIG_BASE_URL}/pjp-config/${configId}`,
      data
    );
    return response.data;
  },

  delete: async (configId: string): Promise<{ message: string }> => {
    const response = await customAxios.delete(
      `${CONFIG_BASE_URL}/pjp-config/${configId}`
    );
    return response.data;
  },

  activate: async (configId: string): Promise<{ data: PJPConfig }> => {
    const response = await customAxios.patch(
      `${CONFIG_BASE_URL}/pjp-config/${configId}/activate`
    );
    return response.data;
  },

  deactivate: async (configId: string): Promise<{ data: PJPConfig }> => {
    const response = await customAxios.patch(
      `${CONFIG_BASE_URL}/pjp-config/${configId}/deactivate`
    );
    return response.data;
  },

  getInsights: async (configId: string): Promise<PjpInsightsResponse> => {
    const response = await customAxios.get(`${PJP_CONFIG_INSIGHTS_ENDPOINT}/${configId}`);
    return response.data;
  },
};

export type PjpInsights = {
  warehouseInfo: {
    warehouseId: string;
    warehouseName: string;
    totalOutlets: number;
  };
  salesForceInfo: {
    totalSalesPersons: number;
    requiredSalesPersons: number;
    excessOrDeficit: number;
    assignedRoles: number;
    salesPersonDetails?: Array<{
      salesPersonId: string;
      salesPersonName: string;
      salesPersonEmployeeCode: string;
      salesPersonRole?: string;
      salesPersonRoleName: string;
    }>;
  };
  planConfiguration: {
    planFrequency: 'daily' | 'weekly' | 'monthly' | 'bi-monthly';
    workingDays: number;
    effectiveWorkingDays: number;
    includeSundays: boolean;
    maxOutletsPerDay: number;
    outletActivityDurationInMins: number;
    totalWorkingHoursInMins: number;
    breakHoursInMins: number;
    effectiveWorkingTimeInMins: number;
  };
  capacityAnalysis: {
    outletsPerSalesPersonPerPeriod: number;
    totalCapacityPerPeriod: number;
    avgOutletsPerPersonPerDay: number;
    coveragePercentage: number;
    uncoveredOutlets: number;
  };
  timeFeasibility: {
    feasibleOutletsPerDay: number;
    configuredOutletsPerDay: number;
    timeUtilizationPercentage: number;
    isFeasible: boolean;
  };
  recommendations: Array<{
    type: 'INFO' | 'WARN' | 'ERROR' | string;
    message: string;
    suggestedAction?: string;
  }>;
  summary: {
    status: 'OPTIMAL' | 'SUBOPTIMAL' | 'CRITICAL' | string;
    message: string;
  };
  dayWiseBeats?: {
    [day: string]: {
      beats: Array<{
        beatName: string;
        beatId: string;
        totalOutlets: number;
      }>;
    };
  };
};

export type PjpInsightsResponse = {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  data: PjpInsights;
};
