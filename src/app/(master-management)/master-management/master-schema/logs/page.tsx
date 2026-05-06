'use client';

import { useSearchParams } from 'next/navigation';
import { DynamicLogsComponent } from '@/components/logs';
import { masterSchemasLogsConfig } from '@/components/logs/configs/logs-configs';
import NavKeys from '@/constants/navkeys';

const MasterSchemaLogsPage = () => {
  return <MasterSchemaLogsContent />;
};

function MasterSchemaLogsContent() {
  const searchParams = useSearchParams();
  const schemaName = searchParams.get('schemaName');
  const groupId = searchParams.get('groupId');
  
  const config = {
    ...masterSchemasLogsConfig,
    entityId: schemaName || undefined,
    metaTags: {
      schemaName: schemaName || undefined,
      groupId: groupId || undefined,
    },
    backPath: `${NavKeys.MasterSchema}?groupId=${groupId}`,
  };

  return <DynamicLogsComponent config={config} enabled={!!schemaName} />;
}

export default MasterSchemaLogsPage;
