import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { pricingGroupsApi } from '../api/pricing-groups';
import {
  FetchPricingGroupProductsParams,
  PricingGroupProductsResponse,
  PricingGroupResponse,
  PricingGroupsResponse,
  UpdatePricingGroupPayload,
  UsePricingGroupsParams,
} from '../types/product.types';

export const usePricingGroups = (params?: UsePricingGroupsParams) => {
  const queryClient = useQueryClient();

  const pricingGroups = useQuery<PricingGroupsResponse>({
    queryKey: ['pricingGroups', params],
    queryFn: () => pricingGroupsApi.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (keep in cache longer)
    refetchOnMount: false, // Don't refetch if data exists
    placeholderData: keepPreviousData, // Smooth pagination transitions
  });

  const getPricingGroup = (pricingGroupId: string) => {
    return useQuery<PricingGroupResponse>({
      queryKey: ['pricingGroup', pricingGroupId],
      queryFn: () => pricingGroupsApi.getById(pricingGroupId),
      enabled: !!pricingGroupId,
    });
  };

  const getPricingGroupProducts = (params: FetchPricingGroupProductsParams) => {
    return useQuery<PricingGroupProductsResponse>({
      queryKey: ['pricingGroupProducts', params],
      queryFn: () => pricingGroupsApi.fetchProductsByFilter(params),
      enabled: !!(params.groupIds && params.groupIds.length > 0),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  const createPricingGroup = useMutation({
    mutationFn: pricingGroupsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricingGroups'] });
    },
  });

  const updatePricingGroup = useMutation({
    mutationFn: ({
      pricingGroupId,
      data,
    }: {
      pricingGroupId: string;
      data: UpdatePricingGroupPayload;
    }) => pricingGroupsApi.update(pricingGroupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricingGroups'] });
      queryClient.invalidateQueries({ queryKey: ['pricingGroup'] });
    },
  });

  const deletePricingGroup = useMutation({
    mutationFn: pricingGroupsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricingGroups'] });
    },
  });

  const bulkUpdateProductPrices = useMutation({
    mutationFn: pricingGroupsApi.bulkUpdateProductPrices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricingGroupProducts'] });
    },
  });

  return {
    pricingGroups,
    getPricingGroup,
    getPricingGroupProducts,
    createPricingGroup,
    updatePricingGroup,
    deletePricingGroup,
    bulkUpdateProductPrices,
  };
};
