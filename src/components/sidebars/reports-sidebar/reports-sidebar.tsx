'use client';

import { cn } from '@/lib/utils';
import {
  IconBuildingStore,
  IconFileText,
  IconChartBar,
  IconWallet,
  IconClipboardList,
  IconShoppingCart,
  IconUsers,
} from '@tabler/icons-react';
import { FileText } from 'lucide-react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

interface MenuItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  module: string;
}

const menuItems: MenuItem[] = [
  {
    title: 'Reports',
    icon: FileText,
    path: NavKeys.Reports,
    module: 'reports',
  },
];

export function ReportsSidebar() {
  const pathname = usePathname();
  const groupedPermissions = useAppSelector(
    (state) => state.auth.groupedPermissions
  );
  const filteredItems = menuItems.filter((item) => {
    return groupedPermissions[item.module]?.includes('view');
  });

  const isMenuItemActive = (item: MenuItem) => {
    return pathname.startsWith(item.path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex items-center justify-center p-2">
        <img src="/naga-logo.png" alt="logo" className="h-auto w-20" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="pb-3">
            Report Management
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
                    <Link href={item.path}>
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
