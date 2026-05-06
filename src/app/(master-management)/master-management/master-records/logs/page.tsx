'use client';

import { useSearchParams } from 'next/navigation';
import { DynamicLogsComponent } from '@/components/logs';
import { masterRecordsLogsConfig } from '@/components/logs/configs/logs-configs';
import NavKeys from '@/constants/navkeys';

const MasterRecordsLogsPage = () => {
  return <MasterRecordsLogsContent />;
};

function MasterRecordsLogsContent() {
  const searchParams = useSearchParams();
  const recordId = searchParams.get('recordId');
  const schemaName = searchParams.get('schemaName');
  const groupId = searchParams.get('groupId');
  
  const config = {
    ...masterRecordsLogsConfig,
    entityId: recordId || undefined,
    metaTags: {
      schemaName: schemaName || undefined,
      [`${schemaName}Id`]: recordId || undefined,
      groupId: groupId || undefined,
    },
    backPath: `${NavKeys.MasterRecords}?schemaName=${schemaName}`,
  };

  return <DynamicLogsComponent config={config} enabled={!!recordId && !!schemaName} />;
}

export default MasterRecordsLogsPage;
