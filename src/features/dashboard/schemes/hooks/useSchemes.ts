import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { schemesApi } from '../api/schemes';
import { CreateSchemePayload, QuerySchemesParams, UpdateSchemePayload, Scheme } from '../types/schemes.types';

export const useSchemes = (params?: QuerySchemesParams) => {
  return useQuery({
    queryKey: ['schemes', params],
    queryFn: () => schemesApi.getAll(params),
  });
};

export const useActiveSchemes = () => {
  return useQuery({
    queryKey: ['schemes', 'active'],
    queryFn: () => schemesApi.getActive(),
  });
};

export const useScheme = (
  id: string,
  options?: Omit<UseQueryOptions<Scheme, Error, Scheme, ['scheme', string]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['scheme', id],
    queryFn: () => schemesApi.getById(id),
    enabled: !!id,
    ...options,
  });
};

export const useSchemeBySchemeId = (schemeId: string) => {
  return useQuery({
    queryKey: ['scheme-by-id', schemeId],
    queryFn: () => schemesApi.getBySchemeId(schemeId),
    enabled: !!schemeId,
  });
};

export const useCreateScheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSchemePayload) => schemesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
    },
  });
};

export const useUpdateScheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSchemePayload }) =>
      schemesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
      queryClient.invalidateQueries({ queryKey: ['scheme', id] });
    },
  });
};

export const useUpdateSchemeStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' }) =>
      schemesApi.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
      queryClient.invalidateQueries({ queryKey: ['scheme', id] });
    },
  });
};

export const useUpdateSchemeApprovalStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entityId,
      approvalStatus,
      remarks,
      approverId,
      roleId,
      entityType = 'schemes'
    }: {
      entityId: string;
      approvalStatus: 'approved' | 'rejected';
      remarks: string;
      approverId: string;
      roleId: string;
      entityType?: string;
    }) =>
      schemesApi.updateApprovalStatus(entityId, approvalStatus, remarks, approverId, roleId, entityType),
    onSuccess: (_, { entityId, approverId, roleId }) => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
      queryClient.invalidateQueries({ queryKey: ['scheme', entityId] });
      queryClient.invalidateQueries({ queryKey: ['scheme-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-schemes'] });
    },
  });
};

export const useSchemeApprovals = (entityId: string, approverId?: string, approverRoleId?: string, status?: string) => {
  return useQuery({
    queryKey: ['scheme-approvals', entityId, approverId, approverRoleId, status],
    queryFn: () => schemesApi.getApprovals(entityId, approverId, approverRoleId, status),
    enabled: !!entityId,
  });
};

export const useApprovalSchemes = (
  approverId?: string,
  approverRoleId?: string,
  params?: { skip?: number; limit?: number; search?: string; status?: string }
) => {
  return useQuery({
    queryKey: ['approval-schemes', approverId, approverRoleId, params],
    queryFn: () => schemesApi.getApprovalSchemes(approverId!, approverRoleId!, params),
    enabled: !!approverId && !!approverRoleId,
  });
};

export const useDeleteScheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => schemesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
    },
  });
};

export const useCalculateReward = () => {
  return useMutation({
    mutationFn: ({ warehouseId, products, outletId }: { warehouseId: string; products: any[]; outletId?: string }) =>
      schemesApi.calculateReward(warehouseId, products, outletId),
  });
};

export const useGetRecommendations = () => {
  return useMutation({
    mutationFn: ({ warehouseId, cartItems, outletId, maxRecommendations }: {
      warehouseId: string;
      cartItems: any[];
      outletId?: string;
      maxRecommendations?: number
    }) => schemesApi.getRecommendations(warehouseId, cartItems, outletId, maxRecommendations),
  });
}; 