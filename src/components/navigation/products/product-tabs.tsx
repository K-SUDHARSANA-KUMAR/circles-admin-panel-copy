'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Tabs as TabsStyled } from '@/components/ui/tabs-styled';
import NavKeys from '@/constants/navkeys';

const tabs = [
  {
    title: 'Products',
    value: 'products',
  },
  {
    title: 'Customer Group',
    value: 'pricing-group',
  },
];

export default function ProductTabs() {
  const router = useRouter();
  const pathname = usePathname();
  
  // More precise tab selection logic
  const currentTab = (() => {
    if (pathname?.includes('/pricing-group')) {
      return 'pricing-group';
    }
    if (pathname?.includes('/products') && !pathname?.includes('/pricing-group')) {
      return 'products';
    }
    return 'products'; // default
  })();

  const handleTabChange = (value: string) => {
    if (value === 'products') {
      router.push(NavKeys.DashboardProducts);
    } else {
      router.push(`${NavKeys.DashboardProducts}/${value}`);
    }
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

