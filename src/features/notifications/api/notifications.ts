import { NotificationsListData } from '../types/notifications.types';

export const notificationsApi = {
  list: async (params: { skip: number; limit: number; userId?: string }): Promise<NotificationsListData> => {
    return { items: [], totalItems: 0, totalPages: 0, skip: params.skip || 0, limit: params.limit || 10 };
  },

  getUnreadCount: async (_userId: string): Promise<{ count: number }> => {
    return { count: 0 };
  },

  markAsRead: async (_notificationId: string): Promise<void> => {},

  markAsUnread: async (_notificationId: string): Promise<void> => {},
};



