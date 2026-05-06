import { apiEndPoint } from '@/features/apiEndPoint';
import { RoutePlan, RoutePlansResponse, VisitOrderResponse, DeviationsResponse } from '../types/pjp.types';
import customAxios from '@/lib/axios';

const { ROUTE_PLAN_BASE_URL } = apiEndPoint;

export const pjpApi = {
  getAll: async (
    skip?: number,
    limit?: number,
    search?: string,
    warehouseIds?: string[],
    routePlanMode?: string,
    divisionId?: string,
    channelId?: string,
    zoneId?: string,
    subZoneId?: string,
    salesPersonId?: string,
    nonPaginated?: boolean
  ): Promise<RoutePlansResponse> => {
    const response = await customAxios.get(
      ROUTE_PLAN_BASE_URL + '/route-planner/route-plans',
      {
        params: {
          ...(skip !== undefined && { skip }),
          ...(limit !== undefined && { limit }),
          ...(search && { search }),
          ...(warehouseIds &&
            warehouseIds.length > 0 && {
            warehouseId: warehouseIds.join(','),
          }),
          ...(routePlanMode && { routePlanMode }),
          ...(divisionId && { divisionId }),
          ...(channelId && { channelId }),
          ...(zoneId && { zoneId }),
          ...(subZoneId && { subZoneId }),
          ...(salesPersonId && { userId: salesPersonId }),
          ...(nonPaginated !== undefined && { nonPaginated }),
        },
      }
    );
    return response.data;
  },

  getAllVisitOrder: async (): Promise<VisitOrderResponse> => {
    const response = await customAxios.get(
      ROUTE_PLAN_BASE_URL + '/route-planner/outlet-visit-order'
    );
    return response.data;
  },

  getVisitOrderById: async (
    salesPersonId: string
  ): Promise<VisitOrderResponse> => {
    const response = await customAxios.get(
      `${ROUTE_PLAN_BASE_URL}/route-planner/outlet-visit-order/user/${salesPersonId}`
    );
    return response.data;
  },

  getOVByDay: async (
    routePlanId?: string,
    day?: string,
    skip?: number,
    limit?: number,
    userId?: string,
    warehouseId?: string,
    channelId?: string,
    status?: string,
    routePlanMode?: string,
    visitDate?: string, // Changed from date to visitDate parameter in mm-dd-yyyy format
    nonPaginated?: boolean
  ): Promise<VisitOrderResponse> => {
    const response = await customAxios.get(
      `${ROUTE_PLAN_BASE_URL}/outlet-visit-orders/ovorders/route-plan/day`,
      {
        params: {
          routePlanId,
          ...(day && { day }),
          ...(skip !== undefined && { skip }),
          ...(limit !== undefined && { limit }),
          ...(userId && { userId }),
          ...(warehouseId && { warehouseId }),
          ...(channelId && { channelId }),
          ...(status && { status }),
          ...(routePlanMode && { routePlanMode }),
          ...(visitDate && { visitDate }),
          ...(nonPaginated !== undefined && { nonPaginated }),
        },
      }
    );
    return response.data;
  },

  // New API for PJP History
  getPjpHistory: async (
    skip?: number,
    limit?: number,
    userId?: string,
    warehouseId?: string,
    channelId?: string,
    status?: string,
    divisionId?: string,
    zoneId?: string,
    subZoneId?: string,
    nonPaginated?: boolean,
    visitDate?: string,
    startDate?: string,
    endDate?: string,
    fromdate?: string,
    todate?: string
  ): Promise<VisitOrderResponse> => {
    const response = await customAxios.get(
      `${ROUTE_PLAN_BASE_URL}/outlet-visit-orders/ovorders/route-plan/history`,
      {
        params: {
          ...(skip !== undefined && { skip }),
          ...(limit !== undefined && { limit }),
          ...(userId && { userId }),
          ...(warehouseId && { warehouseId }),
          ...(channelId && { channelId }),
          ...(status && { visitOrderStatus: status }), // Changed to visitOrderStatus
          ...(divisionId && { divisionId }),
          ...(zoneId && { zoneId }),
          ...(subZoneId && { subZoneId }),
          ...(nonPaginated !== undefined && { nonPaginated }),
          ...(visitDate && { visitDate }),
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
          ...(fromdate && { fromdate }),
          ...(todate && { todate }),
        },
      }
    );
    return response.data;
  },

  getById: async (salesPersonId: string): Promise<{ data: RoutePlan[] }> => {
    const response = await customAxios.get(
      `${ROUTE_PLAN_BASE_URL}/route-planner/route-plans/user/${salesPersonId}`
    );
    return response.data;
  },

  getRoutePlanById: async (routePlanId: string): Promise<{ data: RoutePlan }> => {
    const response = await customAxios.get(
      `${ROUTE_PLAN_BASE_URL}/route-planner/route-plans/${routePlanId}`
    );
    return response.data;
  },

  getAllManualRoutePlans: async (
    skip?: number,
    limit?: number,
    search?: string,
    warehouseIds?: string[],
    status?: string,
    routePlanMode?: string,
    salesPersonId?: string,
    divisionId?: string,
    channelId?: string,
    zoneId?: string,
    subZoneId?: string
  ): Promise<RoutePlansResponse> => {
    const response = await customAxios.get(
      ROUTE_PLAN_BASE_URL + '/manual-route-planner/route-plans',
      {
        params: {
          ...(skip !== undefined && { skip }),
          ...(limit !== undefined && { limit }),
          ...(search && { search }),
          ...(status && { status }),
          ...(warehouseIds &&
            warehouseIds.length > 0 && {
            warehouseId: warehouseIds.join(','),
          }),
          ...(routePlanMode && { routePlanMode }),
          ...(salesPersonId && { userId: salesPersonId }),
          ...(divisionId && { divisionId }),
          ...(channelId && { channelId }),
          ...(zoneId && { zoneId }),
          ...(subZoneId && { subZoneId }),
        },
      }
    );
    return response.data;
  },

  create: async (data: Partial<RoutePlan>): Promise<{ data: RoutePlan }> => {
    const response = await customAxios.post(
      ROUTE_PLAN_BASE_URL + '/route-planner/route-plans',
      data
    );
    return response.data;
  },

  update: async (
    routePlanId: string,
    data: Partial<RoutePlan>
  ): Promise<{ data: RoutePlan }> => {
    const response = await customAxios.patch(
      `${ROUTE_PLAN_BASE_URL}/route-planner/route-plans/${routePlanId}`,
      data
    );
    return response.data;
  },

  delete: async (routePlanId: string): Promise<{ message: string }> => {
    const response = await customAxios.delete(
      `${ROUTE_PLAN_BASE_URL}/route-planner/route-plans/${routePlanId}`
    );
    return response.data;
  },

  getManualRoutePlanById: async (routePlanId: string): Promise<any> => {
    const response = await customAxios.get(
      `${ROUTE_PLAN_BASE_URL}/manual-route-planner/${routePlanId}`
    );
    return response.data;
  },

  createManualRoutePlan: async (data: {
    journeyPlan: Array<{
      visitDate: string;
      userId: string;
      outlets: Array<{
        outletId: string;
        outletName: string;
        location: {
          type: string;
          coordinates: [number, number];
        };
        index: number;
        warehouseId: string;
      }>;
    }>;
    warehouseId: string[];
  }): Promise<any> => {
    const response = await customAxios.post(
      `${ROUTE_PLAN_BASE_URL}/manual-route-planner`,
      data
    );
    return response.data;
  },

  updateManualRoutePlan: async (
    routePlanId: string,
    data: {
      journeyPlan: Array<{
        visitDate: string;
        userId: string;
        outlets: Array<{
          outletId: string;
          outletName: string;
          location: {
            type: string;
            coordinates: [number, number];
          };
          index: number;
          warehouseId: string;
        }>;
      }>;
      warehouseId: string[];
      reason?: string; // Optional reason field for editing approved records
    }
  ): Promise<any> => {
    const response = await customAxios.patch(
      `${ROUTE_PLAN_BASE_URL}/manual-route-planner/${routePlanId}`,
      data
    );
    return response.data;
  },

  updateDeviationRoutePlan: async (
    deviationId: string,
    data: Partial<RoutePlan>
  ): Promise<any> => {
    const response = await customAxios.put(
      `${ROUTE_PLAN_BASE_URL}/manual-route-planner/plan-deviations/${deviationId}`,
      data
    );
    return response.data;
  },

  updateApprovalStatus: async (
    entityId: string,
    approvalStatus: 'approved' | 'rejected',
    remarks: string,
    approverId: string,
    roleId: string,
    entityType: string = 'manual-pjp'
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
      `${configServiceUrl}/approvals/manual-pjp?${params.toString()}`
    );
    return response.data;
  },

  generateRoutePlan: async (data?: any): Promise<any> => {
    const response = await customAxios.post(
      `${ROUTE_PLAN_BASE_URL}/route-planner/vroom/generate`,
      data || {}
    );
    return response.data;
  },

  optimizePjp: async (params: {
    warehouseIds: string[];
    maxOutletPerDay?: number;
    outletActivityDuration?: number;
    breakHours?: number;
    maxTravelDistancePerDay?: number;
  }): Promise<any> => {
    const payload: any = {};

    // Add warehouse IDs if provided
    if (params.warehouseIds && params.warehouseIds.length > 0) {
      payload.warehouseId = params.warehouseIds;
    }

    // Add optimization parameters if provided
    if (params.maxOutletPerDay !== undefined) {
      payload.maxOutletPerDay = params.maxOutletPerDay;
    }
    if (params.outletActivityDuration !== undefined) {
      payload.outletActivityDuration = params.outletActivityDuration;
    }
    if (params.breakHours !== undefined) {
      payload.breakHours = params.breakHours;
    }
    if (params.maxTravelDistancePerDay !== undefined) {
      payload.maxTravelDistancePerDay = params.maxTravelDistancePerDay;
    }

    const response = await customAxios.post(
      `${ROUTE_PLAN_BASE_URL}/route-planner/optimization-pjp`,
      payload
    );
    return response.data;
  },

  getPlanDeviations: async (
    skip?: number,
    limit?: number,
    search?: string,
    warehouseIds?: string[],
    parentRoutePlanId?: string,
    status?: string,
    routePlanMode?: string,
    salesPersonId?: string,
    divisionId?: string,
    channelId?: string,
    zoneId?: string,
    subZoneId?: string
  ): Promise<DeviationsResponse> => {
    const response = await customAxios.get(
      `${ROUTE_PLAN_BASE_URL}/manual-route-planner/fetch/plan-deviations`,
      {
        params: {
          ...(skip !== undefined && { skip }),
          ...(limit !== undefined && { limit }),
          ...(search && { search }),
          ...(status && { status }),
          ...(warehouseIds && warehouseIds.length > 0 && {
            warehouseId: warehouseIds.join(','),
          }),
          ...(parentRoutePlanId && { parentRoutePlanId }),
          ...(routePlanMode && { routePlanMode }),
          ...(salesPersonId && { userId: salesPersonId }),
          ...(divisionId && { divisionId }),
          ...(channelId && { channelId }),
          ...(zoneId && { zoneId }),
          ...(subZoneId && { subZoneId }),
        },
      }
    );
    return response.data;
  },

  getPlanDeviationById: async (
    deviationId: string
  ): Promise<{ data: any }> => {
    const response = await customAxios.get(
      `${ROUTE_PLAN_BASE_URL}/manual-route-planner/plan-deviations/${deviationId}`
    );
    return response.data;
  },

  assignOutletsToUser: async (data: {
    visitOrderId: string[];
    userId: string;
    routePlanId: string;
    visitDate: string;
  }): Promise<any> => {
    const response = await customAxios.put(
      `${ROUTE_PLAN_BASE_URL}/outlet-visit-orders/assign-outlets-to-user`,
      data
    );
    return response.data;
  },

  triggerAutoPjp: async (): Promise<any> => {
    const response = await customAxios.post(
      `${ROUTE_PLAN_BASE_URL}/manual-route-planner/manual-pjp/trigger`
    );
    return response.data;
  },
};

