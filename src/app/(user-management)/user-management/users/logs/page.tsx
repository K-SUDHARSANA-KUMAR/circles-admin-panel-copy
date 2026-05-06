'use client';

import { useSearchParams } from 'next/navigation';
import { DynamicLogsComponent } from '@/components/logs';
import { userLogsConfig } from '@/components/logs/configs/logs-configs';

const UserLogsPage = () => {
  return <UserLogsContent />;
};

function UserLogsContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  
  const config = {
    ...userLogsConfig,
    entityId: userId || undefined,
  };

  return <DynamicLogsComponent config={config} enabled={!!userId} />;
}

export default UserLogsPage;