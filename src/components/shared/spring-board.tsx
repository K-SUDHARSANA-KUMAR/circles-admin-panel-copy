'use client';

import { IconGridDots } from '@tabler/icons-react';
import {
  Bell,
  Grip,
  LayoutDashboard,
  Users,
  Settings,
  Cog,
  Warehouse,
  FileText,
} from 'lucide-react';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import NavKeys from '@/constants/navkeys';
import NotificationsSheet from '@/components/notifications/notifications-sheet';
import {
  useNotificationCount,
  useNotifications,
} from '@/features/notifications/hooks/useNotifications';
import { useAppSelector } from '@/store/hooks';

const SpringBoard = () => {
  const pathname = usePathname();
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const groupedPermissions = useAppSelector(
    (state) => state.auth.groupedPermissions
  );

  const dashboardKeys = [
    'dashboard',
    'outlets',
    'outlet-approval',
    'distributor-outlet',
    'order',
    'sales-return',
    'claims',
    'pjp',
    'manual-pjp',
    'attendance',
    'products',
    'schemes',
    'collections',
    'advertisement',
    'target',
    'beats',
  ];
  const userKeys = ['users'];
  const masterKeys = ['master-schema'];
  const configKeys = [
    'claims-config',
    'outlet-config',
    'form-management',
    'configurations',
    'claim-approval-hierarchy',
    'outlet-approval-hierarchy',
    'scheme-approval-hierarchy',
    'manual-pjp-approval-hierarchy',
  ];
  const warehouseKeys = ['warehouse'];
  const reportKeys = ['warehouse'];

  const hasAnyPermission = (keys: string[] = []) => {
    if (!groupedPermissions || typeof groupedPermissions !== 'object')
      return false;

    // ✅ Check if *any* key in this menu has at least one permission
    return keys.some((key) => {
      const perms = groupedPermissions[key];
      return Array.isArray(perms) && perms.length > 0;
    });
  };

  // Get user ID from localStorage - try multiple approaches
  const getUserId = () => {
    if (typeof window === 'undefined') return null;

    // Try direct userId first
    const directUserId = localStorage.getItem('userId');
    if (directUserId) return directUserId;

    // Try user_id
    const userIdAlt = localStorage.getItem('user_id');
    if (userIdAlt) return userIdAlt;

    // Try id
    const id = localStorage.getItem('id');
    if (id) return id;

    // Try parsing user object
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        return userObj.userId || userObj.userId || null;
      } catch (error) {
        console.error('❌ Error parsing user object:', error);
        return null;
      }
    }

    return null;
  };

  const [userId, setUserId] = React.useState<string | null>(null);

  // Update userId when component mounts or localStorage changes
  React.useEffect(() => {
    const currentUserId = getUserId();
    setUserId(currentUserId);

    // Debug: Check all localStorage keys
    console.log('🔍 All localStorage keys:', Object.keys(localStorage));
    console.log('🔍 userId from localStorage:', currentUserId);
    console.log('🔍 Alternative userId keys:', {
      userId: localStorage.getItem('userId'),
      user_id: localStorage.getItem('user_id'),
      id: localStorage.getItem('id'),
      user: localStorage.getItem('user'),
    });

    // Parse and log the user object
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        console.log('🔍 Parsed user object:', userObj);
        console.log('🔍 User _id:', userObj._id);
        console.log('🔍 User id:', userObj.id);
      } catch (error) {
        console.error('❌ Error parsing user object:', error);
      }
    }
  }, []);

  // Get unread notification count from API
  const {
    data: unreadCountData,
    isLoading,
    error,
    refetch: refetchCount,
  } = useNotificationCount(userId || undefined, !!userId);

  // Get notifications data as fallback
  const { data: notificationsData, isLoading: notificationsLoading } =
    useNotifications({
      skip: 0,
      limit: 100,
      userId: userId || undefined,
      enabled: !!userId,
    });

  console.log('📊 Notifications data:', notificationsData);
  console.log('📊 Notifications loading:', notificationsLoading);

  // Calculate unread count from notifications data as fallback
  const fallbackUnreadCount =
    notificationsData?.items?.filter(
      (item) =>
        item.status === 'unread' ||
        !item.status ||
        item.status === undefined ||
        item.status === null
    ).length || 0;

  // Use API count if available, otherwise use fallback
  const unreadCount = unreadCountData?.count ?? fallbackUnreadCount;

  // Track previous count for push notifications
  const [previousCount, setPreviousCount] = React.useState(0);

  // Show push notification when new notifications arrive
  React.useEffect(() => {
    if (unreadCount > previousCount && previousCount > 0) {
      // New notifications arrived
      const newCount = unreadCount - previousCount;
      showPushNotification(newCount);
    }
    setPreviousCount(unreadCount);
  }, [unreadCount, previousCount]);

  // Function to show push notification
  const showPushNotification = (count: number) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`New Notification${count > 1 ? 's' : ''}`, {
        body: `You have ${count} new notification${count > 1 ? 's' : ''}`,
        icon: '/circles_logo.ico',
        tag: 'notification',
      });
    }
  };

  // Request notification permission on component mount
  React.useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Debug logging
  console.log('🔔 SpringBoard - userId:', userId);
  console.log('🔔 SpringBoard - userId type:', typeof userId);
  console.log('🔔 SpringBoard - userId length:', userId?.length);
  console.log('🔔 SpringBoard - unreadCountData:', unreadCountData);
  console.log('🔔 SpringBoard - fallbackUnreadCount:', fallbackUnreadCount);
  console.log('🔔 SpringBoard - final unreadCount:', unreadCount);
  console.log('🔔 SpringBoard - isLoading:', isLoading);
  console.log('🔔 SpringBoard - error:', error);
  console.log('🔔 SpringBoard - notificationsData:', notificationsData);
  console.log(
    '🔔 SpringBoard - notificationsData items:',
    notificationsData?.items
  );
  console.log('🔔 SpringBoard - unreadCount > 0:', unreadCount > 0);
  console.log('🔔 SpringBoard - Will show indicator:', unreadCount > 0);

  // Additional debugging for API call
  console.log('🔔 API Call Status:', {
    userId: userId,
    hasUserId: !!userId,
    isEnabled: !!userId,
    unreadCountData: unreadCountData,
    isLoading: isLoading,
    error: error,
  });

  const handleOpenNotifications = () => {
    // Force refresh count when opening notifications
    refetchCount();
    setIsNotificationsOpen(true);
  };

  const handleBellKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (
    event
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsNotificationsOpen(true);
    }
  };

  const navigationItems = [
    {
      title: 'Dashboard',
      href: NavKeys.DashboardOverview,
      basePath: '/dashboard',
      icon: LayoutDashboard,
      keys: dashboardKeys,
    },
    {
      title: 'User Management',
      href: NavKeys.Users,
      basePath: NavKeys.Users,
      icon: Users,
      keys: userKeys,
    },
    {
      title: 'Master Management',
      href: NavKeys.MasterGroups,
      basePath: NavKeys.MasterManagement,
      icon: Settings,
      keys: masterKeys,
    },
    {
      title: 'Config Management',
      href: NavKeys.ConfigForm,
      basePath: NavKeys.ConfigManagement,
      icon: Cog,
      keys: configKeys,
    },
    {
      title: 'Warehouse Management',
      href: NavKeys.Warehouse,
      basePath: NavKeys.WarehouseManagement,
      icon: Warehouse,
      keys: warehouseKeys,
    },
    {
      title: 'Reports',
      href: NavKeys.Reports,
      basePath: NavKeys.Reports,
      icon: FileText,
      keys: reportKeys,
    },
  ];

  const isActive = (basePath: string) => {
    return pathname.startsWith(basePath);
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-neutral-500">
        <Popover>
          <PopoverTrigger asChild>
            <button className="cursor-pointer rounded p-1 transition-colors hover:bg-neutral-300">
              <Grip className="h-6 w-6" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <div className="grid gap-1">
              {navigationItems
                .filter((item) => hasAnyPermission(item.keys)) // ✅ show only menus with valid permissions
                .map((item) => {
                  const IconComponent = item.icon;
                  const active = isActive(item.basePath);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                        active
                          ? 'bg-primary text-neutral-100'
                          : 'hover:bg-primary text-neutral-800 hover:text-neutral-100'
                      )}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
            </div>
          </PopoverContent>
        </Popover>
        <button
          type="button"
          aria-label="Open notifications"
          title="Notifications"
          tabIndex={0}
          onClick={handleOpenNotifications}
          onKeyDown={handleBellKeyDown}
          className="relative cursor-pointer rounded p-1 transition-colors hover:bg-neutral-300"
        >
          <Bell className="h-6 w-6" />
          {(unreadCount > 0 || isLoading || error) && (
            <span
              className={`absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ${error ? 'bg-orange-500' : 'bg-red-500'
                }`}
            >
              {isLoading
                ? '...'
                : error
                  ? '!'
                  : unreadCount > 99
                    ? '99+'
                    : unreadCount}
            </span>
          )}
        </button>
        <NotificationsSheet
          open={isNotificationsOpen}
          onOpenChange={(open) => {
            setIsNotificationsOpen(open);
            // Force refresh count when panel is closed
            if (!open) {
              // Force refetch the count
              refetchCount();
              console.log(
                '🔔 Notifications panel closed - forcing count refresh'
              );
            }
          }}
        />
      </div>
    </div>
  );
};

export default SpringBoard;
