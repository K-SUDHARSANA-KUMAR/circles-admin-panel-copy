import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalHierarchyApi } from '../api/approval-hierarchy';

export const useHierarchies = (
  skip?: number,
  limit?: number,
  contextName?: string,
  channelId?: string[]
) =>
  useQuery({
    queryKey: ['approvalHierarchy', skip, limit, contextName, channelId],
    queryFn: () => approvalHierarchyApi.getAll(skip, limit, contextName, channelId),
    staleTime: 5 * 60 * 1000,
  });

export const useApprovalHierarchy = () => {
  const queryClient = useQueryClient();

  const hierarchies = useQuery({
    queryKey: ['approvalHierarchy'],
    queryFn: () => approvalHierarchyApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getHierarchyById = (hierarchyId: string) => 
    useQuery({
      queryKey: ['approvalHierarchy', hierarchyId],
      queryFn: () => approvalHierarchyApi.getById(hierarchyId),
      enabled: !!hierarchyId
    });

  const createHierarchy = useMutation({
    mutationFn: approvalHierarchyApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalHierarchy'] });
    }
  });

  const updateHierarchy = useMutation({
    mutationFn: ({ hierarchyId, data }: { hierarchyId: string; data: any }) => 
      approvalHierarchyApi.update(hierarchyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalHierarchy'] });
    }
  });

  const deleteHierarchy = useMutation({
    mutationFn: approvalHierarchyApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalHierarchy'] });
    }
  });

  return {
    hierarchies,
    getHierarchyById,
    createHierarchy,
    updateHierarchy,
    deleteHierarchy
  };
};