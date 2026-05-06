'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Tabs as TabsStyled } from '@/components/ui/tabs-styled';
import NavKeys from '@/constants/navkeys';

const tabs = [
  {
    title: 'Schemes',
    value: 'schemes',
  },
  {
    title: 'Approval Schemes',
    value: 'approval-schemes',
  },
];

export default function SchemesTab() {
  const router = useRouter();
  const pathname = usePathname();
  
  const getCurrentTab = () => {
    if (pathname?.includes('approval-schemes')) {
      return 'approval-schemes';
    }
    if (pathname?.includes('schemes-list') || pathname?.endsWith('/dashboard/schemes')) {
      return 'schemes';
    }
    return 'schemes';
  };

  const currentTab = getCurrentTab();

  const handleTabChange = (value: string) => {
    if (value === 'schemes') {
      router.push(NavKeys.SchemesList);
    } else if (value === 'approval-schemes') {
      router.push(NavKeys.SchemesApproval);
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
