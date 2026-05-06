'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Tabs as TabsStyled } from '@/components/ui/tabs-styled';
import NavKeys from '@/constants/navkeys';

const tabs = [
  {
    title: 'Claim Approval',
    value: 'claim-approval',
  },
  {
    title: 'My Claims',
    value: 'my-claims',
  }
];

export default function ClaimsTab() {
  const router = useRouter();
  const pathname = usePathname();
  const currentTab =
    tabs.find((tab) => pathname?.includes(tab.value))?.value || tabs[0].value;

  const handleTabChange = (value: string) => {
    router.push(`${NavKeys.Claims}/${value}`);
  };

  return (
    <TabsStyled
      tabs={tabs}
      currentTab={currentTab}
      onTabChange={handleTabChange}
      containerClassName="w-full max-w-xs"
    />
  );
}
