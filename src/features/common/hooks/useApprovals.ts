import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approvalsApi, ProcessApprovalParams, GetApprovalsParams } from '../api/approvals';

export const useProcessApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ProcessApprovalParams) => approvalsApi.processApproval(params),
    onSuccess: (_, params) => {
      // Invalidate all relevant queries based on entity type
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      
      // Invalidate entity-specific queries based on entityType
      if (params.entityType === 'schemes') {
        queryClient.invalidateQueries({ queryKey: ['schemes'] });
        queryClient.invalidateQueries({ queryKey: ['scheme', params.entityId] });
        queryClient.invalidateQueries({ queryKey: ['scheme-approvals'] });
        queryClient.invalidateQueries({ queryKey: ['approval-schemes'] });
      } else if (params.entityType === 'outlets') {
        queryClient.invalidateQueries({ queryKey: ['outlets'] });
        queryClient.invalidateQueries({ queryKey: ['outlet', params.entityId] });
      } else if (params.entityType === 'manual-pjp') {
        queryClient.invalidateQueries({ queryKey: ['manual-route-plans'] });
        queryClient.invalidateQueries({ queryKey: ['route-plans'] });
        queryClient.invalidateQueries({ queryKey: ['pjp-approvals'] });
      }
    },
  });
};

export const useGetApprovals = (params: GetApprovalsParams, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['approvals', params],
    queryFn: () => approvalsApi.getApprovals(params),
    enabled,
  });
};
