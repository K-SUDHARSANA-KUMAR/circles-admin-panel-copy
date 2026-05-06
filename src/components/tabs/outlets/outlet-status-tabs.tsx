'use client';

import { Tabs as TabsStyled } from '@/components/ui/tabs-styled';
import { OutletStatusEnum } from '@/constants/enums/outlet.enums';

const STATUS_TABS = [
  { title: 'All', value: 'all' },
  { title: 'Active', value: OutletStatusEnum.ACTIVE },
  { title: 'Pending', value: OutletStatusEnum.PENDING },
  { title: 'Suspended', value: OutletStatusEnum.SUSPENDED },
];

interface OutletStatusTabsProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  className?: string;
  metrics?: {
    active?: number;
    pending?: number;
    suspended?: number;
    all?: number;
  };
}

const getTabTitle = (title: string, value: string, metrics?: OutletStatusTabsProps['metrics']) => {
  if (!metrics) return title;
  
  let count: number | undefined;
  if (value === 'all') {
    count = metrics.all;
  } else if (value === OutletStatusEnum.ACTIVE) {
    count = metrics.active;
  } else if (value === OutletStatusEnum.PENDING) {
    count = metrics.pending;
  } else if (value === OutletStatusEnum.SUSPENDED) {
    count = metrics.suspended;
  }
  
  return count !== undefined ? `${title} (${count})` : title;
};

export const OutletStatusTabs = ({
  currentStatus,
  onStatusChange,
  className,
  metrics,
}: OutletStatusTabsProps) => {
  const tabs = STATUS_TABS.map(({ title, value }) => ({
    title: getTabTitle(title, value, metrics),
    value,
  }));

  return (
    <TabsStyled
      tabs={tabs}
      currentTab={currentStatus}
      onTabChange={onStatusChange}
      containerClassName={className || 'w-full max-w-xs'}
    />
  );
};
