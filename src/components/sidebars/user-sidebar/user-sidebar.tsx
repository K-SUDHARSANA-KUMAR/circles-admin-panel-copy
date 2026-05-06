'use client';

import { cn } from '@/lib/utils';
import {
  IconHierarchy,
  IconShieldLock,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAppSelector } from '@/store/hooks';
import { ProfileSection } from '@/components/shared/profile-section';
import NavKeys from '@/constants/navkeys';

interface SubMenuItem {
  title: string;
  path?: string;
  items: {
    title: string;
    path: string;
  }[];
}

interface MenuItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  module: string;
  submenu?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Users',
    icon: IconUsers,
    path: NavKeys.Users,
    module: 'users',
  },
  {
    title: 'Permission Groups',
    icon: IconUsersGroup,
    path: NavKeys.PermissionGroups,
    module: 'permission-groups',
  },
  {
    title: 'Permissions',
    icon: IconShieldLock,
    path: NavKeys.Permissions,
    module: 'permissions',
  },
  {
    title: 'User Hierarchy',
    icon: IconHierarchy,
    path: NavKeys.UserHierarchy,
    module: 'permissions',
  },
];

export function UserSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const groupedPermissions = useAppSelector(
    (state) => state.auth.groupedPermissions
  );
  const filteredItems = menuItems.filter((item) => {
    return groupedPermissions[item.module]?.includes('view');
  });

  const isMenuItemActive = (item: MenuItem) => {
    if (item.submenu) {
      return (
        pathname.startsWith(item.path || '') ||
        item.submenu.some(
          (submenuItem) =>
            pathname.startsWith(submenuItem.path || '') ||
            submenuItem.items.some((subItem) => pathname === subItem.path)
        )
      );
    }
    return pathname.startsWith(item.path || '');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex items-center justify-center p-2">
        <img src="/naga-logo.png" alt="logo" className="h-auto w-20" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="pb-3">
            User Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    className={cn(
                      'w-full justify-between',
                      isMenuItemActive(item) && 'bg-freshleaf text-white'
                    )}
                    asChild
                  >
                    <Link href={item.path || '#'}>
                      <div className="flex items-center gap-2">
                        {item.icon && (
                          <item.icon
                            className={cn(
                              'h-5 w-5',
                              isMenuItemActive(item) && 'text-white'
                            )}
                          />
                        )}
                        <span>{item.title}</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <ProfileSection />
      </SidebarFooter>
    </Sidebar>
  );
} 