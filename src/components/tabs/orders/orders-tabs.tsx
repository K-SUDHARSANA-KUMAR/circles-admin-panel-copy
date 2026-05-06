'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Tabs as TabsStyled } from '@/components/ui/tabs-styled';
import NavKeys from '@/constants/navkeys';

const tabs = [
  {
    title: 'Orders',
    value: 'order',
  },
  {
    title: 'Sales Return',
    value: 'sales-return',
  },
  {
    title: 'Place To Company',
    value: 'company',
  },
];

export default function OrdersTab() {
  const router = useRouter();
  const pathname = usePathname();

  const getCurrentTab = () => {
    if (pathname?.endsWith(NavKeys.Orders)) return 'order';
    if (pathname?.endsWith(NavKeys.Company)) return 'company';
    if (pathname?.endsWith(NavKeys.SalesReturn)) return 'sales-return';
    return 'order';
  };

  const currentTab = getCurrentTab();

  const handleTabChange = (value: string) => {
    if (value === 'order') {
      router.push(NavKeys.Orders);
    } else if (value === 'company') {
      router.push(NavKeys.Company);
    } else if (value === 'sales-return') {
      router.push(NavKeys.SalesReturn);
    }
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
