"use client";

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { NotificationItem } from '@/features/notifications/types/notifications.types';
import { useNotificationCount, useMarkAsRead, useMarkAsUnread } from '@/features/notifications/hooks/useNotifications';
import { useAppSelector } from '@/store/hooks';
import { format } from 'date-fns';
import { Tabs as TabsStyled } from '@/components/ui/tabs-styled';
import EmptyState from '@/components/ui/empty-state';

type NotificationsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const INITIAL_LIMIT = 20;

const NotificationsSheet: React.FC<NotificationsSheetProps> = ({ open, onOpenChange }) => {
  const { user } = useAppSelector((state) => state.auth);
  const [skip, setSkip] = React.useState(0);
  const limit = INITIAL_LIMIT;
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [totalItems, setTotalItems] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState('unread');
  const [readNotificationIds, setReadNotificationIds] = React.useState<Set<string>>(new Set());

  const userId = user?.userId as string | undefined;
  const { data: unreadCount } = useNotificationCount(userId, open);
  const markAsRead = useMarkAsRead();
  const markAsUnread = useMarkAsUnread();
  const { data, isLoading, isError, error, isFetching } = useNotifications({ 
    skip, 
    limit, 
    userId, 
    enabled: open && !!userId 
  });

  // Calculate unread count from current data
  const localUnreadCount = items.filter(item => {
    const id = item.notificationId || item._id;
    if (readNotificationIds.has(id)) return false;
    if (item.status === 'read') return false;
    return item.status === 'unread' || !item.status || item.status === undefined || item.status === null;
  }).length;

  const tabs = [
    {
      title: `Unread${localUnreadCount > 0 ? ` (${localUnreadCount})` : ''}`,
      value: 'unread',
    },
    {
      title: 'Read',
      value: 'read',
    },
  ];

  const getFilteredItems = () => {
    console.log('🔍 Filtering for tab:', activeTab);
    console.log('📊 Total items:', items.length);
    console.log('📋 Item statuses:', items.map(item => ({ id: item._id, title: item.title, status: item.status })));
    
    if(activeTab === 'unread') {
      // Show items that are not marked as read (either by API status or locally)
      const unreadItems = items.filter(item => {
        const id = item.notificationId || item._id;
        // Check if it's been marked as read locally
        if (readNotificationIds.has(id)) return false;
        // Check if status is explicitly 'read'
        if (item.status === 'read') return false;
        // If no status or status is 'unread', treat as unread
        return item.status === 'unread' || !item.status || item.status === undefined || item.status === null;
      });
      console.log('📬 Unread items found:', unreadItems.length);
      console.log('📬 Unread items details:', unreadItems.map(item => ({ 
        id: item._id, 
        notificationId: item.notificationId, 
        title: item.title, 
        status: item.status 
      })));
      return unreadItems;
    }
    
    if(activeTab === 'read') {
      // Show items that are marked as read (either by API status or locally)
      const readItems = items.filter(item => {
        const id = item.notificationId || item._id;
        return item.status === 'read' || readNotificationIds.has(id);
      });
      console.log('📖 Read items found:', readItems.length);
      console.log('📖 Read items details:', readItems.map(item => ({ 
        id: item._id, 
        notificationId: item.notificationId, 
        title: item.title, 
        status: item.status 
      })));
      return readItems;
    }
    
    return items;
  };

  const handleMarkAsRead = (notificationId: string) => {
    console.log('🔍 Mark as Read - Notification ID:', notificationId);
    console.log('🔍 Notification ID type:', typeof notificationId);
    console.log('🔍 All notification IDs in current data:', items.map(item => ({ 
      _id: item._id, 
      notificationId: item.notificationId,
      title: item.title 
    })));
    
    // Add to local read state immediately for instant UI update
    setReadNotificationIds(prev => new Set([...prev, notificationId]));
    // Call API to mark as read
    markAsRead.mutate(notificationId);
  };
  
  const handleMarkAsUnread = (notificationId: string) => {
    // Remove from local read state immediately for instant UI update
    setReadNotificationIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(notificationId);
      return newSet;
    });
    // Call API to mark as unread
    markAsUnread.mutate(notificationId);
  };

  React.useEffect(() => {
    if (open) {
      // When panel opens, reset skip to 0 to fetch fresh data
      setSkip(0);
      console.log('🔄 Panel opened - resetting skip to 0');
    }
  }, [open]);

  React.useEffect(() => {
    console.log('📊 Data effect triggered:', { data, skip, isLoading, isError });
    if (!data) {
      console.log('📊 No data available yet');
      return;
    }
    console.log('📊 Processing data:', data);
    if (skip === 0) {
      setItems(data.items);
      console.log('📊 Set initial items:', data.items.length);
    } else {
      setItems((prev) => {
        const newItems = [...prev, ...data.items];
        console.log('📊 Added more items, total:', newItems.length);
        return newItems;
      });
    }
    setTotalItems(data.totalItems);
  }, [data, skip]);

  const hasNextPage = items.length < totalItems;
  const handleLoadMore = () => {
    setSkip((prev) => prev + limit);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="min-w-[30%]">
        <SheetHeader className="border-b p-4">
          <SheetTitle className='text-lg font-medium'>Notifications</SheetTitle>
          <SheetDescription>Latest updates and alerts</SheetDescription>
          <div className="mt-4">
            <TabsStyled
              tabs={tabs}
              currentTab={activeTab}
              onTabChange={setActiveTab}
              containerClassName="w-full max-w-xs"
            />
          </div>
        </SheetHeader>
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto p-4 max-h-[calc(100vh-12rem)] scroll-smooth">
            {isLoading && totalItems > 10 && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                  <p className="text-sm text-gray-600">Loading notifications...</p>
                </div>
              </div>
            )}
            {isError && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 text-xl">⚠️</span>
                  </div>
                  <p className="text-sm text-red-600 font-medium">Something went wrong</p>
                  <p className="text-xs text-gray-500">{(error as Error)?.message || 'Failed to load notifications'}</p>
                </div>
              </div>
            )}
            {!isLoading && !isError && !isFetching && getFilteredItems().length === 0 && items.length > 0 && (
              <div className="py-8">
                <EmptyState 
                  text={`No ${activeTab} notifications`}
                  description="All caught up!"
                />
              </div>
            )}
            {!isLoading && !isError && !isFetching && items.length === 0 && (
              <div className="py-8">
                <EmptyState 
                  text="No notifications yet"
                  description="You'll see new notifications here"
                />
              </div>
            )}
            <div className="space-y-3">
              {getFilteredItems().map((item, index) => (
                <div key={item._id} className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${index === 0 ? 'relative z-10' : ''}`}>
                  {/* Title Flex Container */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 flex-1 pr-2">
                      {item.title}
                    </h3>
                    <time className="text-xs text-gray-500 flex-shrink-0" aria-label="created at">
                      {format(new Date(item.createdAt), "dd MMM yyyy, 'at' h:mm a")}
                    </time>
                  </div>
                  
                  {/* Body Flex Container */}
                  <div className="flex mb-3">
                    <p className="text-sm text-gray-700 leading-relaxed flex-1">
                      {item.body}
                    </p>
                  </div>
                  
                  {/* Actions Flex Container */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.status === 'read' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Read
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Unread
                        </span>
                      )}
                    </div>
                    <div className={`flex gap-2 ${index === 0 ? 'relative z-20' : ''}`}>
                      {item.status === 'read' ? (
                        <button
                          onClick={() => {
                            console.log('🔘 Mark as Unread button clicked');
                            console.log('🔘 Item index:', index);
                            console.log('🔘 Is first item:', index === 0);
                            console.log('🔘 Item data:', { 
                              _id: item._id, 
                              notificationId: item.notificationId,
                              title: item.title,
                              status: item.status 
                            });
                            console.log('🔘 Using ID:', item.notificationId || item._id);
                            console.log('🔘 Button disabled:', markAsUnread.isPending);
                            handleMarkAsUnread(item.notificationId || item._id);
                          }}
                          disabled={markAsUnread.isPending}
                          className={`text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed ${index === 0 ? 'relative z-20 pointer-events-auto' : ''}`}
                        >
                          {markAsUnread.isPending ? 'Updating...' : 'Mark as Unread'}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            console.log('🔘 Mark as Read button clicked');
                            console.log('🔘 Item index:', index);
                            console.log('🔘 Is first item:', index === 0);
                            console.log('🔘 Item data:', { 
                              _id: item._id, 
                              notificationId: item.notificationId,
                              title: item.title,
                              status: item.status 
                            });
                            console.log('🔘 Using ID:', item.notificationId || item._id);
                            console.log('🔘 Button disabled:', markAsRead.isPending);
                            handleMarkAsRead(item.notificationId || item._id);
                          }}
                          disabled={markAsRead.isPending}
                          className={`text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed ${index === 0 ? 'relative z-20 pointer-events-auto' : ''}`}
                        >
                          {markAsRead.isPending ? 'Updating...' : 'Mark as Read'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationsSheet;


