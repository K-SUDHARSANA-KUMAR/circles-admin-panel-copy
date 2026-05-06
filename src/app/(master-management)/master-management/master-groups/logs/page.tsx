'use client';

import { useSearchParams } from 'next/navigation';
import { DynamicLogsComponent } from '@/components/logs';
import { masterGroupsLogsConfig } from '@/components/logs/configs/logs-configs';
import NavKeys from '@/constants/navkeys';

const MasterGroupsLogsPage = () => {
  return <MasterGroupsLogsContent />;
};

function MasterGroupsLogsContent() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId');
  
  const config = {
    ...masterGroupsLogsConfig,
    entityId: groupId || undefined,
    metaTags: {
      groupId: groupId || undefined,
    },
    backPath: NavKeys.MasterGroups,
  };

  return <DynamicLogsComponent config={config} enabled={!!groupId} />;
}

export default MasterGroupsLogsPage;
