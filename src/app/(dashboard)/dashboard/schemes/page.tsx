'use client';

import NavKeys from '@/constants/navkeys';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

const SchemesPage = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace(NavKeys.SchemesList);
  }, []);
  return <></>;
};

export default SchemesPage;
