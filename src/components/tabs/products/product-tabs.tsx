'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Tabs as TabsStyled } from '@/components/ui/tabs-styled';
import NavKeys from '@/constants/navkeys';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { useEffect, useMemo } from 'react';
import { PERMISSIONS, MENU_RIGHTS } from '@/constants/permissions.constant';

const ALL_TABS = [
  {
    title: 'Products',
    value: 'products',
    module: PERMISSIONS.PRODUCTS,
  },
  {
    title: 'Customer Group',
    value: 'pricing-group',
    module: PERMISSIONS.CUSTOMER_GROUP,
  },
];

export default function ProductTabs() {
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
    if (pathname?.includes('/pricing-group')) {
      return 'pricing-group';
    }
    if (pathname?.includes('/products') && !pathname?.includes('/pricing-group')) {
      return 'products';
    }
    return tabs[0]?.value || 'products'; // default to first available tab
  })();

  useEffect(() => {
    if (!currentTab && tabs.length === 0) return;
    
    if (currentTab && !pathname?.includes(currentTab)) {
      if (currentTab === 'products') {
        router.push(NavKeys.DashboardProducts);
      } else {
        router.push(`${NavKeys.DashboardProducts}/${currentTab}`);
      }
    }
  }, [currentTab, pathname, router, tabs.length]);

  const handleTabChange = (value: string) => {
    if (value === 'products') {
      router.push(NavKeys.DashboardProducts);
    } else {
      router.push(`${NavKeys.DashboardProducts}/${value}`);
    }
  };

  if (!tabs.length) return null;

  return (
    <TabsStyled
      tabs={tabs}
      currentTab={currentTab}
      onTabChange={handleTabChange}
      containerClassName="w-full max-w-lg"
    />
  );
}

