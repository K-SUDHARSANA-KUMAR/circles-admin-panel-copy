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
  }
  // {
  //   title: 'Outlets',
  //   url: NavKeys.Outlets,
  //   icon: IconBuildingStore,
  //   module: PERMISSIONS.OUTLETS,
  // },
  // {
  //   title: 'PJP',
  //   url: NavKeys.DashboardJourneyPlan,
  //   icon: IconMapRoute,
  //   module: PERMISSIONS.PJP,
  // },
  // {
  //   title: 'Orders',
  //   url: NavKeys.DashboardOrders,
  //   icon: IconShoppingCart,
  //   module: PERMISSIONS.ORDER,
  // },
  // {
  //   title: 'Products',
  //   url: NavKeys.DashboardProducts,
  //   icon: IconPackage,
  //   module: PERMISSIONS.PRODUCTS,
  // },
  // {
  //   title: 'Claims',
  //   url: NavKeys.ClaimsApproval,
  //   icon: IconCoinRupee,
  //   module: PERMISSIONS.CLAIMS,
  // },
  // {
  //   title: 'Schemes',
  //   url: NavKeys.DashboardSchemes,
  //   icon: IconFileDatabase,
  //   module: PERMISSIONS.SCHEMES,
  // },
  // {
  //   title: 'Collections',
  //   url: NavKeys.Collections,
  //   icon: IconWallet,
  //   module: PERMISSIONS.COLLECTIONS,
  // },
  // {
  //   title: 'Advertisement',
  //   url: NavKeys.Advertisement,
  //   icon: IconAd2,
  //   module: PERMISSIONS.ADVERTISEMENT,
  // },
  // {
  //   title: 'Target',
  //   url: NavKeys.Target,
  //   icon: IconTargetArrow,
  //   module: PERMISSIONS.TARGET,
  // },
  // {
  //   title: 'Invoices',
  //   url: NavKeys.Invoices,
  //   icon: IconReceiptRupee,
  //   module: PERMISSIONS.INVOICES,
  // },
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
