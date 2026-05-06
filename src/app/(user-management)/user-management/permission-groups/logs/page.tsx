'use client';

import { useSearchParams } from 'next/navigation';
import { DynamicLogsComponent } from '@/components/logs';
import { permissionGroupsLogsConfig } from '@/components/logs/configs/logs-configs';
import NavKeys from '@/constants/navkeys';

const PermissionGroupsLogsPage = () => {
  return <PermissionGroupsLogsContent />;
};

function PermissionGroupsLogsContent() {
  const searchParams = useSearchParams();
  const permissionGroupId = searchParams.get('permissionGroupId');
  
  const config = {
    ...permissionGroupsLogsConfig,
    entityId: permissionGroupId || undefined,
    metaTags: {
      permissionGroupId: permissionGroupId || undefined,
    },
    backPath: NavKeys.PermissionGroups,
  };

  return <DynamicLogsComponent config={config} enabled={!!permissionGroupId} />;
}

export default PermissionGroupsLogsPage;
