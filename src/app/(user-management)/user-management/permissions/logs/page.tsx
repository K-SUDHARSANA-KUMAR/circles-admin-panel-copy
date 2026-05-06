'use client';

import { useSearchParams } from 'next/navigation';
import { DynamicLogsComponent } from '@/components/logs';
import { permissionsLogsConfig } from '@/components/logs/configs/logs-configs';
import NavKeys from '@/constants/navkeys';

const PermissionsLogsPage = () => {
  return <PermissionsLogsContent />;
};

function PermissionsLogsContent() {
  const searchParams = useSearchParams();
  const permissionId = searchParams.get('permissionId');
  
  const config = {
    ...permissionsLogsConfig,
    entityId: permissionId || undefined,
    metaTags: {
      permissionId: permissionId || undefined,
    },
    backPath: NavKeys.Permissions,
  };

  return <DynamicLogsComponent config={config} enabled={!!permissionId} />;
}

export default PermissionsLogsPage;
