import axios from 'axios';
import { apiEndPoint } from '@/features/apiEndPoint';
import { NotificationsListData, NotificationCountApiResponse } from '../types/notifications.types';

const { NOTIFICATIONS_ENDPOINT, NOTIFICATIONS_COUNT_ENDPOINT } = apiEndPoint;

export const notificationsApi = {
  list: async (params: { skip: number; limit: number; userId?: string }): Promise<NotificationsListData> => {
      
    
    const response = await axios.get(NOTIFICATIONS_ENDPOINT, { params });
    
    return response.data.data || response.data;
  },

  getUnreadCount: async (userId: string): Promise<{ count: number }> => {
    const url = `${NOTIFICATIONS_COUNT_ENDPOINT}/${userId}?status=read`;
    
    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const response = await axios.get<NotificationCountApiResponse>(url, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      
      // Transform the response to match the expected format
      // The API returns { data: { unReadCount: number } } but we need { count: number }
      const unreadCount = response.data?.data?.unReadCount ?? 0;
      return { count: unreadCount };
    } catch (error: any) {
      // Return 0 count if API fails
      return { count: 0 };
    }
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    const url = `${NOTIFICATIONS_ENDPOINT}/${notificationId}/status`;
    
    const response = await axios.put(url, {
      status: 'read'
    });
  },

  markAsUnread: async (notificationId: string): Promise<void> => {
    const url = `${NOTIFICATIONS_ENDPOINT}/${notificationId}/status`;
    
    const response = await axios.put(url, {
      status: 'unread'
    });
  },
};


