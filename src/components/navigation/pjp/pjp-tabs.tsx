'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Tabs as TabsStyled } from '@/components/ui/tabs-styled';
import NavKeys from '@/constants/navkeys';

const tabs = [
  {
    title: 'PJP',
    value: 'pjp',
  },
  {
    title: 'Attendance',
    value: 'attendance',
  },
  {
    title: 'History',
    value: 'history',
  },
  {
    title: 'Manual PJP',
    value: 'manual',
  },
];

export default function PjpTab() {
  const router = useRouter();
  const pathname = usePathname();
  const currentTab =
    tabs.find((tab) => pathname?.includes(tab.value))?.value || tabs[0].value;

  const handleTabChange = (value: string) => {
    router.push(`${NavKeys.DashboardJourneyPlan}/${value}`);
  };

  return (
    <TabsStyled
      tabs={tabs}
      currentTab={currentTab}
      onTabChange={handleTabChange}
      containerClassName="w-full max-w-lg"
    />
  );
}
