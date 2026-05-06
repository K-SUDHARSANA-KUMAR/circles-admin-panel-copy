'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Tabs as TabsStyled } from '@/components/ui/tabs-styled';
import NavKeys from '@/constants/navkeys';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { useEffect, useMemo } from 'react';
import { PERMISSIONS, MENU_RIGHTS } from '@/constants/permissions.constant';

const ALL_TABS = [
  { title: 'Outlets', value: 'outlet', module: PERMISSIONS.OUTLETS },
  { title: 'Outlet Approval', value: 'outlet-approval', module: PERMISSIONS.OUTLET_APPROVAL },
  { title: 'Distributor Outlet', value: 'distributor-outlet', module: PERMISSIONS.DISTRIBUTOR_OUTLET },
  { title: 'Beats', value: 'beats', module: PERMISSIONS.BEATS },
];

export default function OutletTab() {
  const router = useRouter();
  const pathname = usePathname();
  const permission = useOptimizedPermissionChecker();

  const tabs = useMemo(
    () =>
      ALL_TABS.filter((t) => permission.has(t.module, MENU_RIGHTS.VIEW)).map(({ title, value }) => ({
        title,
        value,
      })),
    [permission]
  );

  const currentTab = useMemo(() => {
    // Find the tab that matches the current pathname
    const matchedTab = tabs.find((tab) => {
      const expectedPath = `${NavKeys.DashboardOutlets}/${tab.value}`;
      return pathname === expectedPath || pathname?.startsWith(expectedPath + '/');
    });
    return matchedTab?.value || tabs[0]?.value;
  }, [pathname, tabs]);

  useEffect(() => {
    if (!currentTab && tabs.length === 0) return; 
    if (currentTab) {
      const expectedPath = `${NavKeys.DashboardOutlets}/${currentTab}`;
      if (pathname !== expectedPath && !pathname?.startsWith(expectedPath + '/')) {
        router.push(`${NavKeys.DashboardOutlets}/${currentTab}`);
      }
    }
  }, [currentTab, pathname, router]);

  const handleTabChange = (value: string) => {
    router.push(`${NavKeys.DashboardOutlets}/${value}`);
  };

  if (!tabs.length) return null;

  return (
    <TabsStyled
      tabs={tabs}
      currentTab={currentTab || tabs[0].value}
      onTabChange={handleTabChange}
      containerClassName="w-full max-w-xs"
    />
  );
}
