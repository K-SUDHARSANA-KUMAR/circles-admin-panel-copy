import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, User, CreateUserData, UpdateUserData } from '../api/users';

interface UseUsersParams {
  search?: string;
  warehouseId?: string | string[];
  divisionId?: string;
  channelId?: string;
  zoneId?: string;
  subZoneId?: string;
  nonPaginated?: string;
  roleId?: string;
  name?: string;
  status?: string;
  userType?: string;
  reportingTo?: string;
  type?: string;
  skip?: number;
  limit?: number;
}


export const useUsers = (params?: UseUsersParams) => {
  const queryClient = useQueryClient();

  const users = useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.getAll(params),
    
    // staleTime: 5 * 60 * 1000, 
    // gcTime: 10 * 60 * 1000, 
  });

  return {
    users,
    createUser: useMutation({
      mutationFn: usersApi.create,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
      },
    }),
    updateUser: useMutation({
      mutationFn: ({
        userId,
        data,
      }: {
        userId: string;
        data: UpdateUserData;
      }) => usersApi.update(userId, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['user'] });
      },
    }),
    deleteUser: useMutation({
      mutationFn: usersApi.delete,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
      },
    }),
  };
};

export const useSyncHr = () => {
  return useQuery({
    queryKey: ['syncHr'],
    queryFn: usersApi.syncHr,
    enabled: false, // Don't auto-fetch on mount
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

export const useUser = (userId: string) => {
  return useQuery<User>({
    queryKey: ['user', userId],
    queryFn: () => usersApi.getById(userId),
    enabled: !!userId,
  });
};
