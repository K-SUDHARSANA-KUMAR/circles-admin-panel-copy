import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '../api/master-groups';

export const useMasterGroups = () => {
  const queryClient = useQueryClient();

  const groups = useQuery({
    queryKey: ['masterGroups'],
    queryFn: groupsApi.getAll
  });

  const createGroup = useMutation({
    mutationFn: groupsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterGroups'] });
    }
  });

  const updateGroup = useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: any }) => 
      groupsApi.update(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterGroups'] });
    }
  });

  const deleteGroup = useMutation({
    mutationFn: groupsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterGroups'] });
    }
  });

  return {
    groups,
    createGroup,
    updateGroup,
    deleteGroup
  };
};