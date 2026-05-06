'use client';

import { ChevronDown, LogOut, Search } from 'lucide-react';
import {
  IconDatabaseCog,
  IconFileTextShield,
  IconTopologyStar3,
} from '@tabler/icons-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMasterGroups } from '@/features/master-managment/hooks/useMasterGroups';
import { useQuery } from '@tanstack/react-query';
import { masterSchemaApi } from '@/features/master-managment/api/master-schema';
import { Input } from '@/components/ui/input';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import Loading from '@/components/ui/loading';
import { useAppSelector } from '@/store/hooks';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { useAuth } from '@/features/auth/hooks/useAuth';
import NavKeys from '@/constants/navkeys';

interface Group {
  groupId: string;
  groupName: string;
  displayName: string;
}

interface SubMenuItem {
  groupId?: string;
  title: string;
  path?: string;
  items: {
    title: string;
    path: string;
  }[];
}

interface MenuItem {
  title: string;
  icon?: any;
  path?: string;
  submenu?: SubMenuItem[];
  module: string;
}

const menuItems: MenuItem[] = [{
  title: 'Master Groups',
  icon: IconTopologyStar3,
  path: NavKeys.MasterGroups,
  module: 'master-groups',
},
{
  title: 'Master Schema',
  icon: IconDatabaseCog,
  path: NavKeys.MasterSchema,
  module: 'master-schema',
  submenu: [],
},

{
  title: 'Master Records',
  icon: IconFileTextShield,
  path: NavKeys.MasterRecords,
  module: 'master-records',
  submenu: [],
},
];

export function MasterSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { groups } = useMasterGroups();
  const groupedPermissions = useAppSelector(
    (state) => state.auth.groupedPermissions
  );
  const { user } = useAppSelector((state) => state.auth);
  const { signOut } = useAuth();
  const filteredItems = menuItems.sort((a, b) => a.title.localeCompare(b.title));

  const canViewMasterRecords = true; // Bypass for all access
  const canViewMasterSchema = true; // Bypass for all access
  const [currentMenuItems, setCurrentMenuItems] =
    useState<MenuItem[]>(filteredItems);

    const [openGroup, setOpenGroup] = useState<string | null>(null); 

  
  // Search states for sidebar dropdowns
  const [masterSchemaSearchTerm, setMasterSchemaSearchTerm] = useState('');
  const [masterRecordsSearchTerm, setMasterRecordsSearchTerm] = useState('');

  const handleLogout = () => {
    signOut();
  };

  useEffect(() => {
    if (groups.data?.data?.length > 0) {
      setCurrentMenuItems((prevItems) => {
        const updatedItems = [...prevItems];

        if (canViewMasterSchema) {
          const masterSchemaIndex = updatedItems.findIndex(
            (item) => item.title === 'Master Schema'
          );
          if (masterSchemaIndex !== -1) {

            const sortedGroups = [...groups.data.data].sort((a, b) =>
              a.displayName.localeCompare(b.displayName)
            );

            updatedItems[masterSchemaIndex] = {
              ...updatedItems[masterSchemaIndex],
              submenu: [
                ...sortedGroups.map((group: Group) => ({
                  ...group,
                  title: group.displayName,
                  path: `${NavKeys.MasterSchema}?groupId=${group.groupId}`,
                  items: [],
                })),
              ],
            };
          }
        }

        if (canViewMasterRecords) {
          const masterRecordsIndex = updatedItems.findIndex(
            (item) => item.title === 'Master Records'
          );
          if (masterRecordsIndex !== -1) {

            const sortedGroups = [...groups.data.data].sort((a, b) =>
                      a.displayName.localeCompare(b.displayName)
                    );

            updatedItems[masterRecordsIndex] = {
              ...updatedItems[masterRecordsIndex],
              submenu: sortedGroups.map((group: Group) => ({
                ...group,
                title: group.displayName,
                path: `${NavKeys.MasterRecords}/${group.groupName}`,
                items: [],
              })),
            };
          }
        }
        return updatedItems;
      });
    }
  }, [groups.data, canViewMasterRecords, canViewMasterSchema]);

  const isSubmenuActive = (submenuItem: SubMenuItem) => {
    return (
      pathname.startsWith(submenuItem.path || '') ||
      submenuItem.items.some((item) => pathname === item.path)
    );
  };

  const isMenuItemActive = (item: MenuItem) => {
    if (item?.submenu) {
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

  const renderSubMenuItem = (item: {
    title: string;
    path: string;
    name: string;
    displayName: string;
  }) => {
    const currentSchemaName = searchParams.get('schemaName');
    const isActive = currentSchemaName === item.name;

    return (
      <li key={item.name}>
        <SidebarMenuSubButton asChild isActive={isActive}>
          <Link href={`${NavKeys.MasterRecords}?schemaName=${item.name}`}>
            <span>{item.displayName}</span>
          </Link>
        </SidebarMenuSubButton>
      </li>
    );
  };

  const renderMasterSchemaSubMenuItem = (submenuItem: SubMenuItem) => {
    const currentGroupId = searchParams.get('groupId');
    const isActive =
      submenuItem.title === 'All Schemas'
        ? pathname === NavKeys.MasterSchema && !currentGroupId
        : currentGroupId === submenuItem.groupId;

    return (
      <SidebarMenuSubButton asChild isActive={isActive}>
        <Link href={submenuItem.path || '#'}>
          <span>{submenuItem.title}</span>
        </Link>
      </SidebarMenuSubButton>
    );
  };

  
    const SubmenuComponent = ({
        submenuItem,
        openGroup,
        setOpenGroup
      }: {
        submenuItem: SubMenuItem;
        openGroup: string | null;
        setOpenGroup: (id: string | null) => void;
      }) => {

    const currentSchemaName = searchParams.get('schemaName');
    const isActive = isSubmenuActive(submenuItem);

    // Determine if this submenu is open
      const isOpen = openGroup === submenuItem.groupId;

      const handleToggle = () => {
        if (isOpen) {
            setOpenGroup(null); 
          } else {
        setOpenGroup(submenuItem.groupId || null);
          }
      };

    const schemas = useQuery({
      queryKey: ['master-schemas-by-group', submenuItem?.groupId],
      queryFn: ({ queryKey }) =>
        masterSchemaApi.getSchemasByGroupId(queryKey[1] as string),
      enabled: isOpen && !!submenuItem?.groupId,
    });

    const hasActiveSchema =
      currentSchemaName &&
      schemas.data?.data?.some(
        (schema: any) => schema.name === currentSchemaName
      );

    return (
      <Collapsible 
        open={isOpen}
        onOpenChange={handleToggle}
        className="group/collapsible"
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className={cn(
              'w-full justify-between',
              hasActiveSchema && 'bg-freshleaf text-white'
            )}
          >
            <div className="flex items-center gap-2">
              <span>{submenuItem.title}</span>
            </div>
            <ChevronDown className="h-4 w-4 transition-transform duration-300 group-data-[state=open]/collapsible:-rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-1">
          <SidebarMenuSub className="space-y-1">
            {schemas.isLoading ? (
              <Loading
                iconClassName="h-5 w-5"
                className="text-xs text-zinc-500"
              />
            ) : Array.isArray(schemas.data?.data) && schemas.data.data.length > 0 ? (
              // schemas.data.data.map((item: any) => renderSubMenuItem(item))

              [...schemas.data.data]
                .sort((a, b) => a.displayName.localeCompare(b.displayName))
                .map((item: any) => renderSubMenuItem(item))

            ) : (
              <div className="px-2 py-1 text-xs text-zinc-400">
                No items found
              </div>
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const renderSubmenu = (submenuItem: SubMenuItem, parentTitle: string) => {
    if (parentTitle === 'Master Schema') {
      return renderMasterSchemaSubMenuItem(submenuItem);
    }

        return (
      <SubmenuComponent
        submenuItem={submenuItem}
        openGroup={openGroup}
        setOpenGroup={setOpenGroup}
      />
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex items-center justify-center p-2">
        <img src="/Circles_logo1.svg" alt="logo" className="h-auto w-20" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="pb-3">
            Master Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {currentMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.submenu ? (
                    <Collapsible
                      defaultOpen={isMenuItemActive(item)}
                      className="group/collapsible2"
                      onOpenChange={(open) => {
                        if (!open) {
                          // Clear search when dropdown closes
                          if (item.title === 'Master Schema') {
                            setMasterSchemaSearchTerm('');
                          } else if (item.title === 'Master Records') {
                            setMasterRecordsSearchTerm('');
                          }
                        }
                      }}
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={cn(
                            'w-full justify-between',
                            isMenuItemActive(item) && 'bg-freshleaf text-white'
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
                          <ChevronDown className="h-4 w-4 transition-transform duration-300 group-data-[state=open]/collapsible2:-rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3 pl-4">
                        <SidebarMenu className="space-y-1">
                          {groups.isLoading ? (
                            <Loading
                              iconClassName="h-5 w-5"
                              className="text-xs"
                            />
                          ) : (
                            <>
                              {/* Search input for groups */}
                              {item.submenu && item.submenu.length > 2 && (
                                <div className="mb-2 px-2">
                                  <div className="relative">
                                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                    <Input
                                      placeholder={`Search ${item.title.toLowerCase()}...`}
                                      value={
                                        item.title === 'Master Schema'
                                          ? masterSchemaSearchTerm
                                          : item.title === 'Master Records'
                                            ? masterRecordsSearchTerm
                                            : ''
                                      }
                                      onChange={(e) => {
                                        if (item.title === 'Master Schema') {
                                          setMasterSchemaSearchTerm(e.target.value);
                                        } else if (item.title === 'Master Records') {
                                          setMasterRecordsSearchTerm(e.target.value);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        e.stopPropagation();
                                      }}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                      className="h-7 pl-7 text-xs"
                                    />
                                  </div>
                                </div>
                              )}
                              {/* Filter submenu items based on search */}
                              {(() => {
                                const searchTerm =
                                  item.title === 'Master Schema'
                                    ? masterSchemaSearchTerm
                                    : item.title === 'Master Records'
                                      ? masterRecordsSearchTerm
                                      : '';
                                
                                // const filteredSubmenu = searchTerm.trim()
                                //   ? item.submenu?.filter((submenuItem) =>
                                //       submenuItem.title
                                //         .toLowerCase()
                                //         .includes(searchTerm.toLowerCase())
                                //     )
                                //   : item.submenu;

                                const filteredSubmenu = (searchTerm.trim()
                                    ? item.submenu?.filter((submenuItem) =>
                                        submenuItem.title.toLowerCase().includes(searchTerm.toLowerCase())
                                      )
                                    : item.submenu
                                  )?.sort((a, b) => a.title.localeCompare(b.title));


                                return filteredSubmenu?.map((submenuItem) => (
                                  <SidebarMenuItem key={submenuItem.title}>
                                    {renderSubmenu(submenuItem, item.title)}
                                  </SidebarMenuItem>
                                ));
                              })()}
                            </>
                          )}
                        </SidebarMenu>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
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
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-4 text-sm">
          <div className="font-semibold text-zinc-500">Profile</div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
              <div className="text-freshleaf text-2xl font-semibold">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
            <div>
              <div>{user?.name || 'User'}</div>
              <div className="text-xs text-zinc-500">
                {user?.email || 'user@example.com'}
              </div>
            </div>
          </div>
          <button
            className="flex cursor-pointer items-center justify-center gap-2 rounded-md bg-zinc-200 px-2 py-1 text-sm font-medium text-zinc-800 transition-all duration-300 hover:bg-red-200 hover:text-red-400"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
