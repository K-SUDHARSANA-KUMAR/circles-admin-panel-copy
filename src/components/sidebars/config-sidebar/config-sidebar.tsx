'use client';

import { cn } from '@/lib/utils';
import {
  IconCalendar,
  IconEyeCog,
  IconFileText,
  IconSettings,
  IconWorldCog,
} from '@tabler/icons-react';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { ProfileSection } from '@/components/shared/profile-section';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  SidebarMenuItem
} from '@/components/ui/sidebar';
import NavKeys from '@/constants/navkeys';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { useAppSelector } from '@/store/hooks';

interface SubMenuItem {
  title: string;
  path?: string;
  module: string;
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
  //   {
  //     title: 'Claims Config',
  //     icon: IconSettings,
  //     path: NavKeys.ClaimConfig,
  //     module: PERMISSIONS.CLAIM_CONFIG,
  //   },
  {
    title: 'Form Management',
    icon: IconFileText,
    path: NavKeys.ConfigForm,
    module: PERMISSIONS.FORM_MANAGEMENT,
  },
  {
    title: 'PJP Config',
    icon: IconCalendar,
    path: NavKeys.PjpConfig,
    module: PERMISSIONS.PJP_CONFIG,
  },
  {
    title: 'Approval Hierarchy',
    icon: IconEyeCog,
    path: `${NavKeys.ApprovalHierarchy}?type=claim-approval-hierarchy`,
    module: PERMISSIONS.APPROVAL_HIERARCHY,
    submenu: [
      {
        title: 'Claim Approvals',
        path: `${NavKeys.ApprovalHierarchy}?type=${PERMISSIONS.CLAIM_APPROVAL_HIERARCHY}`,
        module: PERMISSIONS.CLAIM_APPROVAL_HIERARCHY,
        items: [],
      },
      {
        title: 'Outlet Approvals',
        path: `${NavKeys.ApprovalHierarchy}?type=${PERMISSIONS.OUTLET_APPROVAL_HIERARCHY}`,
        module: PERMISSIONS.OUTLET_APPROVAL_HIERARCHY,
        items: [],
      },
      {
        title: 'Scheme Approvals',
        path: `${NavKeys.ApprovalHierarchy}?type=${PERMISSIONS.SCHEME_APPROVAL_HIERARCHY}`,
        module: PERMISSIONS.SCHEME_APPROVAL_HIERARCHY,
        items: [],
      },
      // {
      //   title: 'Manual PJP Approvals',
      //   path: `${NavKeys.ApprovalHierarchy}?type=${PERMISSIONS.MANUAL_PJP_APPROVAL_HIERARCHY}`,
      //   module: PERMISSIONS.MANUAL_PJP_APPROVAL_HIERARCHY,
      //   items: [],
      // },
    ],
  },
  {
    title: 'Configurations',
    icon: IconWorldCog,
    path: NavKeys.Configurations,
    module: PERMISSIONS.CONFIGURATIONS,
  },
];

export function ConfigSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const groupedPermissions = useAppSelector(
    (state) => state.auth.groupedPermissions
  );
  const { user } = useAppSelector((state) => state.auth);
  const permission = useOptimizedPermissionChecker();

  const filteredItems = menuItems.filter((item) => {
    return groupedPermissions[item.module]?.includes('view');
  });

  const isMenuItemActive = (item: MenuItem) => {
    if (item.submenu) {
      // Check if any submenu is active
      const typeParam = searchParams.get('type');
      const isSubmenuActive = item.submenu.some((submenuItem) => {
        // Active if pathname matches submenu path (without query) or type param matches
        const submenuBasePath = submenuItem.path?.split('?')[0] || '';
        return (
          pathname.startsWith(submenuBasePath) ||
          (pathname.includes('/approval-hierarchy/create') && typeParam === submenuItem.path?.split('type=')[1])
        );
      });
      return (
        pathname.startsWith(item.path?.split('?')[0] || '') ||
        isSubmenuActive
      );
    }
    return (
      pathname === item.path || pathname.startsWith((item.path || '') + '/')
    );
  };

  const getFilteredSubmenu = (submenu: SubMenuItem[]) => {
    return submenu.filter((submenuItem) => {
      return permission.has(submenuItem.module, MENU_RIGHTS.VIEW);
    });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex items-center justify-center p-2">
        <img src="/Circles_logo1.svg" alt="logo" className="h-auto w-20" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="pb-3">
            Config Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.submenu ? (
                    <Collapsible
                      defaultOpen={isMenuItemActive(item)}
                      className="group/collapsible"
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={cn(
                            'w-full justify-between',
                            isMenuItemActive(item) && 'bg-primary text-white'
                          )}
                        >
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
                          <ChevronDown className="h-4 w-4 transition-transform duration-300 group-data-[state=open]/collapsible:-rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3 pl-4">
                        <SidebarMenu className="space-y-1">
                          {getFilteredSubmenu(item.submenu).map((submenuItem) => (
                            <SidebarMenuItem key={submenuItem.title}>
                              <SidebarMenuButton
                                className={cn(
                                  'w-full justify-start',
                                  (
                                    pathname === submenuItem.path ||
                                    (pathname.includes('/approval-hierarchy/create') && searchParams.get('type') === submenuItem.path?.split('type=')[1]) ||
                                    (pathname === NavKeys.ApprovalHierarchy && searchParams.get('type') === submenuItem.path?.split('type=')[1])
                                  ) && 'bg-primary text-white'
                                )}
                                asChild
                              >
                                <Link href={submenuItem.path || '#'}>
                                  <span>{submenuItem.title}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton
                      className={cn(
                        'w-full justify-between',
                        isMenuItemActive(item) && 'bg-primary text-white'
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
                  )}
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
