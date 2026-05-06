'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Tabs as TabsStyled } from '@/components/ui/tabs-styled';
import NavKeys from '@/constants/navkeys';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { useEffect, useMemo } from 'react';
import { PERMISSIONS, MENU_RIGHTS } from '@/constants/permissions.constant';

const ALL_TABS = [
  {
    title: 'Schemes',
    value: 'schemes',
    module: PERMISSIONS.SCHEMES,
  },
  {
    title: 'Approval Schemes',
    value: 'approval-schemes',
    module: PERMISSIONS.APPROVAL_SCHEMES,
  },
];

export default function SchemesTab() {
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

  const getCurrentTab = () => {
    if (pathname?.includes('approval-schemes')) {
      return 'approval-schemes';
    }
    if (pathname?.includes('schemes-list') || pathname?.endsWith('/dashboard/schemes')) {
      return 'schemes';
    }
    return tabs[0]?.value || 'schemes';
  };

  const currentTab = getCurrentTab();

  useEffect(() => {
    if (!currentTab && tabs.length === 0) return;
    
    if (currentTab && !pathname?.includes(currentTab)) {
      if (currentTab === 'schemes') {
        router.push(NavKeys.SchemesList);
      } else if (currentTab === 'approval-schemes') {
        router.push(NavKeys.SchemesApproval);
      }
    }
  }, [currentTab, pathname, router, tabs.length]);

  const handleTabChange = (value: string) => {
    if (value === 'schemes') {
      router.push(NavKeys.SchemesList);
    } else if (value === 'approval-schemes') {
      router.push(NavKeys.SchemesApproval);
    }
  };

  if (!tabs.length) return null;

  return (
    <TabsStyled
      tabs={tabs}
      currentTab={currentTab}
      onTabChange={handleTabChange}
      containerClassName="w-full max-w-xs"
    />
  );
}
