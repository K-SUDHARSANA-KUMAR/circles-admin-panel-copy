'use client';

import NavKeys from '@/constants/navkeys';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

const OutletPage = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace(NavKeys.Outlets);
  }, []);
  return <></>;
};

export default OutletPage;
