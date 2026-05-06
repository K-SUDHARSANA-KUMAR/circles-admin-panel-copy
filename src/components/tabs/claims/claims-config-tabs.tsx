'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Tabs as TabsStyled } from '@/components/ui/tabs-styled';
import NavKeys from '@/constants/navkeys';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { useEffect, useMemo } from 'react';
import { PERMISSIONS, MENU_RIGHTS } from '@/constants/permissions.constant';

const ALL_TABS: any[] = [
  //   {
  //     title: 'Claim Limit',
  //     value: 'claim-limit',
  //     module: PERMISSIONS.CLAIM_APPROVAL,
  //   },
  //   {
  //     title: 'Approval Hierarchy',
  //     value: 'approval-hierarchy',
  //     module: PERMISSIONS.CLAIM_APPROVAL,
  //   },
];

export default function ClaimsConfigTab() {
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

  const currentTab = (() => {
    if (pathname?.includes('approval-hierarchy')) {
      return 'approval-hierarchy';
    }
    if (pathname?.includes('claim-limit')) {
      return 'claim-limit';
    }
    return tabs[0]?.value || 'claim-limit';
  })();

  useEffect(() => {
    if (!currentTab && tabs.length === 0) return;

    if (currentTab && !pathname?.includes(currentTab)) {
      router.push(`${NavKeys.ClaimConfig}/${currentTab}`);
    }
  }, [currentTab, pathname, router, tabs.length]);

  const handleTabChange = (value: string) => {
    router.push(`${NavKeys.ClaimConfig}/${value}`);
  };

  if (!tabs.length) return null;

  return (
    <TabsStyled
      tabs={tabs}
      currentTab={currentTab}
      onTabChange={handleTabChange}
      containerClassName="w-full max-w-sm"
    />
  );
}
