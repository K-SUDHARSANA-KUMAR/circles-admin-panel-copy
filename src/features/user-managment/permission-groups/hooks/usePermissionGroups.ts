import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { permissionGroupsApi } from '../api/permission-groups';
import { UsePermissionGroupsParams } from '../types';

export const usePermissionGroups = (
  params?: UsePermissionGroupsParams,
  enabled: boolean = true
) => {
  const queryClient = useQueryClient();

  const permissionGroups = useQuery({
    queryKey: ['permissionGroups', params],
    queryFn: () => permissionGroupsApi.getAll(params),
    enabled: enabled,
  });

  const getPermissionGroup = (permissionGroupId: string) => {
    return useQuery({
      queryKey: ['permissionGroup', permissionGroupId],
      queryFn: () => permissionGroupsApi.getById(permissionGroupId),
      enabled: !!permissionGroupId,
    });
  };

  const getPermissionGroupByUserId = (
    userId: string,
    nonPaginated?: boolean
  ) => {
    return useQuery({
      queryKey: ['permissionGroupByUserId', userId],
      queryFn: () => permissionGroupsApi.getByUserId(userId),
      enabled: !!userId,
    });
  };

  const createPermissionGroup = useMutation({
    mutationFn: permissionGroupsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissionGroups'] });
    },
  });

  const updatePermissionGroup = useMutation({
    mutationFn: ({
      permissionGroupId,
      data,
    }: {
      permissionGroupId: string;
      data: any;
    }) => permissionGroupsApi.update(permissionGroupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissionGroups'] });
      queryClient.invalidateQueries({ queryKey: ['permissionGroup'] });
    },
  });

  const deletePermissionGroup = useMutation({
    mutationFn: permissionGroupsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissionGroups'] });
    },
  });

  return {
    permissionGroups,
    getPermissionGroup,
    getPermissionGroupByUserId,
    createPermissionGroup,
    updatePermissionGroup,
    deletePermissionGroup,
  };
};

export const useUserPermissions = (userId: string) => {
  return useQuery({
    queryKey: ['permissionGroupByUserId', userId],
    queryFn: () => permissionGroupsApi.getByUserId(userId),
    enabled: !!userId,
  });
};
