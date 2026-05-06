'use client';

import { useSearchParams } from 'next/navigation';
import { DynamicLogsComponent } from '@/components/logs';
import { verificationLogsConfig } from '@/components/logs/configs/logs-configs';
import NavKeys from '@/constants/navkeys';

const VerificationLogsPage = () => {
  return <VerificationLogsContent />;
};

function VerificationLogsContent() {
  const searchParams = useSearchParams();
  const outletId = searchParams.get('outletId');
  const verificationDocumentId = searchParams.get('verificationDocumentId');
  
  const config = {
    ...verificationLogsConfig,
    entityId: outletId || undefined,
    metaTags: {
      outletId: outletId || undefined,
      verificationDocumentId: verificationDocumentId || undefined,
    },
    backPath: `${NavKeys.OutletCreation}?mode=view&outletId=${outletId}`,
  };

  return <DynamicLogsComponent config={config} enabled={!!outletId && !!verificationDocumentId} />;
}

export default VerificationLogsPage;