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
  LayoutDashboard,
  Users,
  FileText,
  Building,
  Shield,
  MapPin,
  Heart,
  CheckSquare
} from 'lucide-react';

import NavKeys from '@/constants/navkeys';
import { ProfileSection } from '@/components/shared/profile-section';

const sidebarGroups = [
  {
    label: 'Operations',
    items: [
      {
        title: 'Dashboard',
        url: NavKeys.DashboardOverview,
        icon: LayoutDashboard,
      },
      {
        title: 'Venues',
        url: NavKeys.VenuesPage,
        icon: Building,
      },
      {
        title: 'Cities',
        url: NavKeys.CitiesPage,
        icon: MapPin,
      },
      {
        title: 'Interest',
        url: NavKeys.InterestPage,
        icon: Heart,
      },
      {
        title: 'Users',
        url: NavKeys.Users,
        icon: Users,
      },
      {
        title: 'Waitlist Users',
        url: '/user-management/waitlist',
        icon: CheckSquare,
      },
      {
        title: 'Profile Verification',
        url: '/user-management/profile-verification',
        icon: CheckSquare,
      },
      {
        title: 'Admin Users',
        url: '/admin-users',
        icon: Shield,
      },
      {
        title: 'Reports',
        url: NavKeys.Reports,
        icon: FileText,
      },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const filteredGroups = sidebarGroups;

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className="flex flex-row items-center justify-start gap-2.5 px-4 py-3 border-b border-[#333333] h-[52px]">
        <img src="/Circles_logo1.png" alt="logo" className="h-6 w-auto shrink-0 transition-all" />
        <span className="font-sans text-sm font-bold tracking-tight text-white group-data-[collapsible=icon]:hidden">
          Circles Admin
        </span>
      </SidebarHeader>
      <SidebarContent className="p-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            <SidebarGroupLabel className="px-2 pb-2 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.url || pathname.startsWith(item.url + '/');
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton isActive={isActive} asChild tooltip={item.title}>
                        <Link href={item.url} className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors">
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="font-medium text-xs">{item.title}</span>
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
      <SidebarFooter className="p-4 border-t border-[#333333]">
        <ProfileSection />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
