export type NotificationItem = {
  _id: string;
  title: string;
  body: string;
  imageUrl?: string;
  clickAction?: string;
  status?: string;
  notificationId?: string;
  readAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type NotificationsListData = {
  totalItems: number;
  totalPages: number;
  skip: number;
  limit: number;
  items: NotificationItem[];
};

export type NotificationCountResponse = {
  count: number;
};

export type NotificationCountApiResponse = {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  data: {
    unReadCount: number;
  };
};

export type MarkAsReadRequest = {
  notificationId: string;
};

export type MarkAsUnreadRequest = {
  notificationId: string;
};
