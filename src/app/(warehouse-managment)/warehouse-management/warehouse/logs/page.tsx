'use client';

import { useSearchParams } from 'next/navigation';
import { DynamicLogsComponent } from '@/components/logs';
import { warehouseLogsConfig } from '@/components/logs/configs/logs-configs';

export default function WarehouseLogsPage() {
  return <WarehouseLogsContent />;
}

function WarehouseLogsContent() {
  const searchParams = useSearchParams();
  const warehouseId = searchParams.get('warehouseId');
  
  const config = {
    ...warehouseLogsConfig,
    entityId: warehouseId || undefined,
  };

  return <DynamicLogsComponent config={config} enabled={!!warehouseId} />;
}