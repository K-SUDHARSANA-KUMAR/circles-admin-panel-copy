'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Tabs as TabsStyled } from '@/components/ui/tabs-styled';
import NavKeys from '@/constants/navkeys';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { useEffect, useMemo } from 'react';
import { PERMISSIONS } from '@/constants/permissions.constant';

const ALL_TABS = [
  {
    title: 'PJP',
    value: 'pjp',
    module: PERMISSIONS.PJP,
  },
  {
    title: 'Attendance',
    value: 'attendance',
    module: PERMISSIONS.ATTENDANCE,
  },
  {
    title: 'History',
    value: 'history',
    module: PERMISSIONS.PJP_HISTORY,
  },
  {
    title: 'Manual PJP',
    value: 'manual',
    module: PERMISSIONS.MANUAL_PJP,
  },
  {
    title: 'Deviations',
    value: 'deviations',
    module: PERMISSIONS.MANUAL_PJP,
  },
];

export default function PjpTab() {
  const router = useRouter();
  const pathname = usePathname();
  const permission = useOptimizedPermissionChecker();

  const tabs = useMemo(
    () =>
      ALL_TABS.filter((t) => permission.has(t.module, 'view')).map(({ title, value }) => ({
        title,
        value,
      })),
    [permission]
  );

  const currentTab =
    tabs.find((tab) => pathname?.includes(tab.value))?.value || tabs[0]?.value;

  useEffect(() => {
    if (!currentTab && tabs.length === 0) return;
    
    if (currentTab && !pathname?.includes(currentTab)) {
      router.push(`${NavKeys.DashboardJourneyPlan}/${currentTab}`);
    }
  }, [currentTab, pathname, router]);

  const handleTabChange = (value: string) => {
    router.push(`${NavKeys.DashboardJourneyPlan}/${value}`);
  };

  if (!tabs.length) return null;

  return (
    <TabsStyled
      tabs={tabs}
      currentTab={currentTab || tabs[0].value}
      onTabChange={handleTabChange}
      containerClassName="w-full max-w-lg"
    />
  );
}
