'use client';

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
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import {
  IconBuildingStore,
  IconCoinRupee,
  IconFileDatabase,
  IconMapRoute,
  IconPackage,
  IconPresentation,
  IconShoppingCart,
  IconAd2,
  IconWallet,
  IconTargetArrow,
  IconReceiptRupee,
} from '@tabler/icons-react';

import { useAppSelector } from '@/store/hooks';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { ProfileSection } from '@/components/shared/profile-section';
import NavKeys from '@/constants/navkeys';
import { PERMISSIONS } from '@/constants/permissions.constant';

const items = [
  {
    title: 'Overview',
    url: NavKeys.DashboardOverview,
    icon: IconPresentation,
    module: PERMISSIONS.DASHBOARD,
  },
  {
    title: 'Venues',
    url: NavKeys.VenuesPage,
    icon: IconPresentation,
    module: PERMISSIONS.VENUES,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const groupedPermissionsMap = useAppSelector(
    (state) => state.auth.groupedPermissionsMap
  );

  

  const filteredItems = items; // Bypass filtering to grant all access

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className="flex items-center justify-center p-2">
        <img src="/Circles_logo1.svg" alt="logo" className="h-auto w-20" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="pb-3">Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {filteredItems.map((item) => {
                const isActive = pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton isActive={isActive} asChild tooltip={item.title}>
                      <Link href={item.url}>
                        <item.icon className="!h-5 !w-5" />
                        <span className="">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:p-1 p-4">
        <ProfileSection />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
