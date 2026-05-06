import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications';
import { NotificationsListData } from '../types/notifications.types';

export const useNotifications = (params: { skip: number; limit: number; userId?: string; enabled?: boolean }) => {
  const { skip, limit, userId, enabled = true } = params;

  return useQuery<NotificationsListData>({
    queryKey: ['notifications', userId, skip, limit],
    queryFn: () => notificationsApi.list({ skip, limit, userId }),
    enabled,
    staleTime: 0, // Always refetch when enabled
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

export const useNotificationCount = (userId?: string, enabled?: boolean) => {
  return useQuery({
    queryKey: ['notifications-count', userId],
    queryFn: () => notificationsApi.getUnreadCount(userId!),
    enabled: enabled && !!userId,
    staleTime: 0, // Always refetch when enabled
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 120000, // Refetch every 2 minutes (120 seconds) for push notifications
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: (data, variables) => {
      console.log('✅ Mark as Read Success:', { data, variables });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
    onError: (error, variables) => {
      console.error('❌ Mark as Read Error:', { error, variables });
    },
  });
};

export const useMarkAsUnread = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: notificationsApi.markAsUnread,
    onSuccess: (data, variables) => {
      console.log('✅ Mark as Unread Success:', { data, variables });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
    onError: (error, variables) => {
      console.error('❌ Mark as Unread Error:', { error, variables });
    },
  });
};

