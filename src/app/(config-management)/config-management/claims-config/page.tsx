'use client';

import NavKeys from '@/constants/navkeys';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

const ClaimsConfigPage = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace(NavKeys.ClaimConfigLimit);
  }, []);
  return <></>;
};

export default ClaimsConfigPage;
