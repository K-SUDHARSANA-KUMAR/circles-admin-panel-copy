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
  IconHeart,
  IconUsers,
  IconStar,
  IconReport,
  IconListCheck,
  IconShieldLock,
} from '@tabler/icons-react';

import { useAppSelector } from '@/store/hooks';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { ProfileSection } from '@/components/shared/profile-section';
import NavKeys from '@/constants/navkeys';
import { PERMISSIONS } from '@/constants/permissions.constant';

const sidebarGroups = [
  {
    label: 'Dashboard',
    items: [
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
      {
        title: 'Interest',
        url: NavKeys.InterestPage,
        icon: IconHeart,
        module: PERMISSIONS.INTEREST,
      },
      {
        title: 'Cities',
        url: NavKeys.CitiesPage,
        icon: IconBuildingStore,
        module: PERMISSIONS.CITIES,
      },
    ],
  },
  {
    label: 'User Management',
    items: [
      {
        title: 'Users',
        url: NavKeys.Users,
        icon: IconUsers,
        module: 'users',
      },
      {
        title: 'Reviews',
        url: '/user-management/reviews',
        icon: IconStar,
        module: 'reviews',
      },
      {
        title: 'Reports',
        url: NavKeys.Reports,
        icon: IconReport,
        module: 'reports',
      },
      {
        title: 'Verification Page',
        url: '/user-management/verification',
        icon: IconListCheck,
        module: 'verification',
      },
    ],
  },
  {
    label: 'Admin Users',
    items: [
      {
        title: 'Admin Users',
        url: '/admin-users',
        icon: IconShieldLock,
        module: 'admin-users',
      },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const groupedPermissionsMap = useAppSelector(
    (state) => state.auth.groupedPermissionsMap
  );

  

  const filteredGroups = sidebarGroups; // Bypass filtering to grant all access

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className="flex flex-row items-center justify-center gap-2.5 px-4 py-2 transition-all duration-300">
        <img src="/Circles_logo1.png" alt="logo" className="h-auto w-12 transition-all group-data-[collapsible=icon]:w-8" />
        <span className="font-instrument text-[15px] font-normal tracking-wide text-foreground group-data-[collapsible=icon]:hidden">
          Circles
        </span>
      </SidebarHeader>
      <SidebarContent className="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="pb-1.5 text-[10px] uppercase tracking-widest font-black text-primary/70">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton isActive={isActive} asChild tooltip={item.title}>
                        <Link href={item.url}>
                          <item.icon className="!h-5 !w-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:p-1 p-3">
        <ProfileSection />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
