import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi } from '../api/permissions';

interface UsePermissionsParams {
  search?: string;
  status?: string;
  skip?: number;
  limit?: number;
  nonPaginated?: boolean;
  isActive?: boolean;
  divisionId?: string;
}

export const usePermissions = (params?: UsePermissionsParams) => {
  const queryClient = useQueryClient();

  const permissions = useQuery({
    queryKey: ['permissions', params],
    queryFn: () => permissionsApi.getAll(params),
  });

  const getPermission = (permissionId: string) => {
    return useQuery({
      queryKey: ['permission', permissionId],
      queryFn: () => permissionsApi.getById(permissionId),
      enabled: !!permissionId,
    });
  };

  const createPermission = useMutation({
    mutationFn: permissionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });

  const updatePermission = useMutation({
    mutationFn: ({ permissionId, data }: { permissionId: string; data: any }) =>
      permissionsApi.update(permissionId, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permission'] });
    },
  });

  const deletePermission = useMutation({
    mutationFn: permissionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });

  return {
    permissions,
    getPermission,
    createPermission,
    updatePermission,
    deletePermission,
  };
};
