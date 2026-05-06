'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Tabs as TabsStyled } from '@/components/ui/tabs-styled';
import NavKeys from '@/constants/navkeys';

const tabs = [
  {
    title: 'Claim Limit',
    value: 'claim-limit',
  },
  {
    title: 'Approval Hierarchy',
    value: 'approval-hierarchy',
  },
];

export default function ClaimsConfigTab() {
  const router = useRouter();
  const pathname = usePathname();
  const currentTab =
    tabs.find((tab) => pathname?.includes(tab.value))?.value || tabs[0].value;

  const handleTabChange = (value: string) => {
    router.push(`${NavKeys.ClaimConfig}/${value}`);
  };

  return (
    <TabsStyled
      tabs={tabs}
      currentTab={currentTab}
      onTabChange={handleTabChange}
      containerClassName="w-full max-w-sm"
    />
  );
}
