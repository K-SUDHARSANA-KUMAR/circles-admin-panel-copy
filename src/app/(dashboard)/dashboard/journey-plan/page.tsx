'use client';

import NavKeys from '@/constants/navkeys';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

const JourneyPlanPage = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace(NavKeys.Pjp);
  }, []);
  return <></>;
};

export default JourneyPlanPage;
