import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pjpConfigApi, PJPConfig, PjpInsightsResponse } from '../api/pjp-config';

export interface UsePjpConfigParams {
  skip?: number;
  limit?: number;
  search?: string;
  status?: string;
  territory?: string;
  warehouseId?: string;
}

export const usePjpConfig = (params?: UsePjpConfigParams) => {
  const queryClient = useQueryClient();

  const pjpConfigs = useQuery({
    queryKey: ['pjp-configs', params],
    queryFn: () => pjpConfigApi.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getPjpConfig = (configId: string) => {
    return useQuery({
      queryKey: ['pjp-config', configId],
      queryFn: () => pjpConfigApi.getById(configId),
      enabled: !!configId,
    });
  };

  const createPjpConfig = useMutation({
    mutationFn: pjpConfigApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pjp-configs'] });
    },
  });

  const updatePjpConfig = useMutation({
    mutationFn: ({ configId, data }: { configId: string; data: Partial<PJPConfig> }) =>
      pjpConfigApi.update(configId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pjp-configs'] });
      queryClient.invalidateQueries({ queryKey: ['pjp-config'] });
    },
  });

  const deletePjpConfig = useMutation({
    mutationFn: pjpConfigApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pjp-configs'] });
    },
  });

  const activatePjpConfig = useMutation({
    mutationFn: pjpConfigApi.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pjp-configs'] });
    },
  });

  const deactivatePjpConfig = useMutation({
    mutationFn: pjpConfigApi.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pjp-configs'] });
    },
  });

  return {
    pjpConfigs,
    getPjpConfig,
    createPjpConfig,
    updatePjpConfig,
    deletePjpConfig,
    activatePjpConfig,
    deactivatePjpConfig,
    getPjpInsights: (configId: string, options?: { enabled?: boolean }) =>
      useQuery<PjpInsightsResponse>({
        queryKey: ['pjp-config-insights', configId],
        queryFn: () => pjpConfigApi.getInsights(configId),
        enabled: options?.enabled !== undefined ? options.enabled : !!configId,
        staleTime: 5 * 60 * 1000,
      }),
    isLoading: pjpConfigs.isLoading,
    error: pjpConfigs.error,
    data: pjpConfigs.data?.data.items || [],
    pagination: pjpConfigs.data?.data ? {
      totalItems: pjpConfigs.data.data.totalItems,
      totalPages: pjpConfigs.data.data.totalPages,
      skip: pjpConfigs.data.data.skip,
      limit: pjpConfigs.data.data.limit,
    } : null,
  };
}; 