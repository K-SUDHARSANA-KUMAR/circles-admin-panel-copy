'use client';

import { LogOut, Warehouse } from 'lucide-react';
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
import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import { useAuth } from '@/features/auth/hooks/useAuth';

const items = [
  {
    title: 'Warehouse',
    url: '/warehouse-management/warehouse',
    icon: Warehouse,
    module: 'warehouse',
  },
];

export function WarehouseSidebar() {
  const pathname = usePathname();
  //const groupedPermissions = useAppSelector(state => state.auth.groupedPermissions);
  const { user } = useAppSelector((state) => state.auth);
  const { signOut } = useAuth();

  const groupedPermissions: Record<string, string[]> = {
    dashboard: ['view', 'edit'],
    pincode: ['view', 'edit'],
    warehouse: ['view','edit'],
  };
  const filteredItems = items.filter((item) => {
    return groupedPermissions[item.module as keyof typeof groupedPermissions]?.includes('view');
  });

  const handleLogout = () => {
    signOut();
  };

  return (
    <Sidebar>
      <SidebarHeader className="flex items-center justify-center p-2">
        <img src="/Circles_logo1.svg" alt="logo" className="h-auto w-20" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="pb-3">
            Warehouse Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {filteredItems.map((item) => {
                const isActive = pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton isActive={isActive} asChild>
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
      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-4 text-sm">
          <div className="font-semibold text-zinc-500">Profile</div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
              <div className="text-primary text-2xl font-semibold">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
            <div>
              <div>{user?.name || 'User'}</div>
              <div className="text-xs text-zinc-500">{user?.email || 'user@example.com'}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-md bg-zinc-200 px-2 py-1 text-sm font-medium text-zinc-800 transition-all duration-300 hover:bg-red-200 hover:text-red-400"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
