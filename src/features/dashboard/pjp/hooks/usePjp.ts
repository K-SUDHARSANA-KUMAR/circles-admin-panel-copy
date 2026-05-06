import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { pjpApi } from '../api/pjp';
import { RoutePlan, RoutePlansResponse, UsePjpParams, VisitOrderResponse, DeviationsResponse, DeviationItem } from '../types/pjp.types';

// Types based on the API response structure

// Utility functions to transform data for the UI
export const transformRoutePlanForUI = (routePlan: RoutePlan) => {
  const totalOutlets = routePlan.journeyPlan.reduce(
    (total, day) => total + day.outlets.length,
    0
  );
  const totalDays = routePlan.journeyPlan.length;

  // Format visit period for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Extract warehouse names from warehouseId array
  const warehouseNames = routePlan.warehouseId
    ? routePlan.warehouseId.map(wh => wh.warehouseName).filter(Boolean).join(', ')
    : routePlan.warehouseName || undefined;

  // Calculate total travel distance in kilometers from journey plan
  const totalTravelKms = routePlan.totalTravelKms ||
    routePlan.journeyPlan.reduce((total, day) => {
      return total + (day.totalTravelDistInMeters || 0);
    }, 0) / 1000; // Convert meters to kilometers

  // Calculate total travel time in hours from journey plan
  const totalTravelTimeHours = routePlan.journeyPlan.reduce((total, day) => {
    return total + (day.totalTravelTimeInSecs || 0);
  }, 0) / 3600; // Convert seconds to hours

  return {
    id: routePlan._id,
    routePlanId: routePlan.routePlanId,
    userId: routePlan.userId,
    salesPerson: routePlan?.userInfo?.name || routePlan?.userName || 'N/A',
    noOfDays: totalDays,
    noOfOutlets: totalOutlets,
    travelTime: `${totalDays * 8} hours`, // Estimated travel time
    totalTravelTimeHours, // Calculated travel time in hours from journey plan
    planType: routePlan.planType,
    visitPeriod: routePlan.visitPeriod,
    visitPeriodFormatted: `${formatDate(routePlan?.visitPeriod?.from || '')} - ${formatDate(routePlan?.visitPeriod?.to || '')}`,
    journeyPlan: routePlan.journeyPlan,
    businessTypeId: routePlan.businessTypeId || undefined, // Add business type ID if it exists in the route plan
    status: routePlan.status || 'unknown', // Include status field for manual PJP
    totalTravelKms, // Total travel distance in kilometers (calculated from journey plan)
    createdAt: routePlan.createdAt,
    updatedAt: routePlan.updatedAt,
    todayPresent: routePlan?.userInfo?.todayPresent ?? false,
    warehouseName: warehouseNames,
  };
};

// Helper: extract readable API error message
const getApiErrorMessage = (error: any, fallback: string) => {
  if (error?.response?.data?.message) return error.response.data.message as string;
  if (error?.response?.data?.error) return error.response.data.error as string;
  if (error?.message) return error.message as string;
  return fallback;
};

export const usePjp = (params?: UsePjpParams) => {
  const queryClient = useQueryClient();

  const routePlans = useQuery<RoutePlansResponse>({
    queryKey: ['route-plans', params],
    queryFn: async () => {
      try {
        const response = await pjpApi.getAll(
          params?.skip,
          params?.limit,
          params?.search,
          params?.warehouseIds,
          'auto',
          params?.divisionId,
          params?.channelId,
          params?.zoneId,
          params?.subZoneId,
          params?.salesPersonId
        );
        return response;
      } catch (error) {
        throw error;
      }
    },
  });

  const getRoutePlan = (salesPersonId: string) => {
    return useQuery<{ data: RoutePlan[] }>({
      queryKey: ['route-plan', salesPersonId],
      queryFn: async () => {
        try {
          return await pjpApi.getById(salesPersonId);
        } catch (error: any) {
          toast.error(getApiErrorMessage(error, 'Failed to load route plan'));
          throw error;
        }
      },
      enabled: !!salesPersonId,
    });
  };

  const getVisitOrder = (salesPersonId: string) => {
    return useQuery<VisitOrderResponse>({
      queryKey: ['visit-order', salesPersonId],
      queryFn: async () => {
        try {
          return await pjpApi.getVisitOrderById(salesPersonId);
        } catch (error: any) {
          toast.error(getApiErrorMessage(error, 'Failed to load visit order'));
          throw error;
        }
      },
      enabled: !!salesPersonId,
    });
  };

  const getOVByDay = (
    routePlanId: string,
    day?: string,
    skip?: number,
    limit?: number,
    routePlanMode?: string,
    visitDate?: string, // Changed from date to visitDate parameter in mm-dd-yyyy format
    nonPaginated?: boolean,
    enabled?: boolean
  ) => {
    return useQuery<VisitOrderResponse>({
      queryKey: ['ov-by-day', routePlanId, day, skip, limit, routePlanMode, visitDate, nonPaginated],
      queryFn: async () => {
        try {
          return await pjpApi.getOVByDay(routePlanId, day, skip, limit, undefined, undefined, undefined, undefined, routePlanMode, visitDate, nonPaginated);
        } catch (error: any) {
          toast.error(getApiErrorMessage(error, 'Failed to load outlet visits'));
          throw error;
        }
      },
      enabled: enabled !== undefined ? enabled : !!routePlanId,
    });
  };

  const getAllOutletVisitHistory = (
    skip?: number,
    limit?: number,
    filters?: { warehouseId?: string; channelId?: string; userId?: string; status?: string }
  ) => {
    return useQuery<VisitOrderResponse>({
      queryKey: [
        'outlet-visit-history',
        skip,
        limit,
        filters?.warehouseId,
        filters?.channelId,
        filters?.userId,
        filters?.status,
      ],
      queryFn: async () => {
        try {
          return await pjpApi.getOVByDay(
            undefined,
            undefined,
            skip,
            limit,
            filters?.userId,
            filters?.warehouseId,
            filters?.channelId,
            filters?.status,
            'auto',
            undefined, // visitDate
            undefined  // nonPaginated
          );
        } catch (error: any) {
          toast.error(getApiErrorMessage(error, 'Failed to load visit history'));
          throw error;
        }
      },
    });
  };

  // New hook for PJP History using the correct API endpoint
  const getPjpHistory = (
    skip?: number,
    limit?: number,
    filters?: {
      warehouseId?: string;
      channelId?: string;
      userId?: string;
      status?: string;
      divisionId?: string;
      zoneId?: string;
      subZoneId?: string;
      visitDate?: string;
      startDate?: string;
      endDate?: string;
      fromdate?: string;
      todate?: string;
    }
  ) => {
    return useQuery<VisitOrderResponse>({
      queryKey: [
        'pjp-history',
        skip,
        limit,
        filters?.warehouseId,
        filters?.channelId,
        filters?.userId,
        filters?.status,
        filters?.divisionId,
        filters?.zoneId,
        filters?.subZoneId,
        filters?.visitDate,
        filters?.startDate,
        filters?.endDate,
        filters?.fromdate,
        filters?.todate,
      ],
      queryFn: async () => {
        try {
          return await pjpApi.getPjpHistory(
            skip,
            limit,
            filters?.userId,
            filters?.warehouseId,
            filters?.channelId,
            filters?.status,
            filters?.divisionId,
            filters?.zoneId,
            filters?.subZoneId,
            undefined, // nonPaginated
            filters?.visitDate,
            filters?.startDate,
            filters?.endDate,
            filters?.fromdate,
            filters?.todate
          );
        } catch (error: any) {
          toast.error(getApiErrorMessage(error, 'Failed to load PJP history'));
          throw error;
        }
      },
    });
  };

  const createRoutePlan = useMutation({
    mutationFn: pjpApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-plans'] });
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Failed to create route plan'));
    },
  });

  const updateRoutePlan = useMutation({
    mutationFn: ({
      routePlanId,
      data,
    }: {
      routePlanId: string;
      data: Partial<RoutePlan>;
    }) => pjpApi.update(routePlanId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-plans'] });
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Failed to update route plan'));
    },
  });

  const updateDeviationRoutePlan = useMutation({
    mutationFn: ({ deviationId, data }: { deviationId: string; data: Partial<RoutePlan> }) =>
      pjpApi.updateDeviationRoutePlan(deviationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-deviations'] });
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Failed to update deviation'));
    },
  });

  const deleteRoutePlan = useMutation({
    mutationFn: pjpApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-plans'] });
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete route plan'));
    },
  });

  const getRoutePlanById = (routePlanId: string) => {
    return useQuery({
      queryKey: ['route-plan', routePlanId],
      queryFn: () => pjpApi.getRoutePlanById(routePlanId),
      enabled: !!routePlanId,
    });
  };

  const getManualRoutePlanById = (routePlanId: string) => {
    return useQuery({
      queryKey: ['manual-route-plan', routePlanId],
      queryFn: () => pjpApi.getManualRoutePlanById(routePlanId),
      enabled: !!routePlanId,
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: true,
    });
  };

  const createManualRoutePlan = useMutation({
    mutationFn: pjpApi.createManualRoutePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-plans'] });
      queryClient.invalidateQueries({ queryKey: ['manual-route-plans'] });
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Failed to create manual route plan'));
    },
  });

  const updateManualRoutePlan = useMutation({
    mutationFn: ({ routePlanId, data }: { routePlanId: string; data: any }) =>
      pjpApi.updateManualRoutePlan(routePlanId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-plans'] });
      queryClient.invalidateQueries({ queryKey: ['manual-route-plans'] });
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Failed to update manual route plan'));
    },
  });

  // Transform data for UI consumption
  const transformedData = Array.isArray(routePlans.data?.data?.items)
    ? routePlans.data!.data.items.map(transformRoutePlanForUI)
    : [];

  const optimizePjp = useMutation({
    mutationFn: (params: {
      warehouseIds: string[];
      maxOutletPerDay?: number;
      outletActivityDuration?: number;
      breakHours?: number;
      maxTravelDistancePerDay?: number;
    }) => pjpApi.optimizePjp(params),
    onSuccess: (data) => {
      console.log('PJP optimized successfully', data);
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Failed to optimize PJP'));
    },
  });
  return {
    routePlans,
    getRoutePlan,
    getVisitOrder,
    getOVByDay,
    getAllOutletVisitHistory,
    getPjpHistory,
    createRoutePlan,
    updateRoutePlan,
    updateDeviationRoutePlan,
    deleteRoutePlan,
    getRoutePlanById,
    getManualRoutePlanById,
    createManualRoutePlan,
    updateManualRoutePlan,
    transformedData,
    isLoading: routePlans.isLoading,
    error: routePlans.error,
    optimizePjp,
  };
};

export const useManualPjp = (params?: UsePjpParams) => {
  const queryClient = useQueryClient();

  const manualRoutePlans = useQuery<RoutePlansResponse>({
    queryKey: ['manual-route-plans', params],
    queryFn: async () => {
      try {
        const response = await pjpApi.getAllManualRoutePlans(
          params?.skip,
          params?.limit,
          params?.search,
          params?.warehouseIds,
          params?.status,
          params?.routePlanMode || 'manual',
          params?.salesPersonId,
          params?.divisionId,
          params?.channelId,
          params?.zoneId,
          params?.subZoneId
        );
        return response;
      } catch (error) {
        throw error;
      }
    },
  });

  // Transform data for UI consumption
  const transformedManualData = Array.isArray(manualRoutePlans.data?.data?.items)
    ? manualRoutePlans.data!.data.items.map(transformRoutePlanForUI)
    : [];

  return {
    manualRoutePlans,
    transformedManualData,
    isLoading: manualRoutePlans.isLoading,
    error: manualRoutePlans.error,
  };
};

export const useUpdatePjpApprovalStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entityId,
      approvalStatus,
      remarks,
      approverId,
      roleId,
      entityType = 'manual-pjp',
    }: {
      entityId: string;
      approvalStatus: 'approved' | 'rejected';
      remarks: string;
      approverId: string;
      roleId: string;
      entityType?: string;
    }) =>
      pjpApi.updateApprovalStatus(
        entityId,
        approvalStatus,
        remarks,
        approverId,
        roleId,
        entityType
      ),
    onSuccess: (_, { entityId, approverId, roleId }) => {
      queryClient.invalidateQueries({ queryKey: ['manual-route-plans'] });
      queryClient.invalidateQueries({ queryKey: ['route-plans'] });
      queryClient.invalidateQueries({ queryKey: ['pjp-approvals'] });
    },
  });
};


export const usePjpApprovals = (
  entityId: string,
  approverId?: string,
  approverRoleId?: string,
  status?: string
) => {
  return useQuery({
    queryKey: ['pjp-approvals', entityId, approverId, approverRoleId, status],
    queryFn: () =>
      pjpApi.getApprovals(entityId, approverId, approverRoleId, status),
    enabled: !!entityId,
  });
};

export const useGenerateRoutePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: any) => pjpApi.generateRoutePlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-plans'] });
    },
  });
};

export const useTriggerAutoPjp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => pjpApi.triggerAutoPjp(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-plans'] });
      queryClient.invalidateQueries({ queryKey: ['manual-route-plans'] });
    },
  });
};

// Deviations list hook
export const usePlanDeviations = (params?: UsePjpParams) => {
  const deviations = useQuery<DeviationsResponse>({
    queryKey: ['plan-deviations', params],
    queryFn: async () => {
      try {
        const response = await pjpApi.getPlanDeviations(
          params?.skip,
          params?.limit,
          params?.search,
          params?.warehouseIds,
          params?.parentRoutePlanId,
          params?.status,
          'auto',
          params?.salesPersonId,
          params?.divisionId,
          params?.channelId,
          params?.zoneId,
          params?.subZoneId
        );
        return response;
      } catch (error) {
        throw error;
      }
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const transformedDeviations = Array.isArray(deviations.data?.data?.items)
    ? (deviations.data!.data.items as any[]).map((item: any) => ({
      id: item.deviationId,
      deviationId: item.deviationId,
      parentRoutePlanId: item.parentRoutePlanId,
      userId: item.userId,
      userName: item.userName,
      planType: item.planType,
      deviationPeriod: item.deviationPeriod,
      deviationPeriodFormatted: `${formatDate(item.deviationPeriod.from)} - ${formatDate(item.deviationPeriod.to)}`,
      status: item.status,
      routePlanMode: item.routePlanMode,
      reason: item.reason,
      remarks: item.remarks,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))
    : [];

  return {
    deviations,
    transformedDeviations,
    isLoading: deviations.isLoading,
    error: deviations.error,
  };
};

export const usePlanDeviationById = (deviationId: string) => {
  return useQuery({
    queryKey: ['plan-deviation', deviationId],
    queryFn: () => pjpApi.getPlanDeviationById(deviationId),
    enabled: !!deviationId,
  });
};
