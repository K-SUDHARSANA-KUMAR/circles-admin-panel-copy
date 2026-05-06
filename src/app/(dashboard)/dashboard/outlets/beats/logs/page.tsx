'use client';

import { useSearchParams } from 'next/navigation';
import { DynamicLogsComponent } from '@/components/logs';
import { outletLogsConfig } from '@/components/logs/configs/logs-configs';

const OutletLogsPage = () => {
  return <OutletLogsContent />;
};

function OutletLogsContent() {
  const searchParams = useSearchParams();
  const outletId = searchParams.get('outletId');
  
  const config = {
    ...outletLogsConfig,
    entityId: outletId || undefined,
  };

  return <DynamicLogsComponent config={config} enabled={!!outletId} />;
}

export default OutletLogsPage;
