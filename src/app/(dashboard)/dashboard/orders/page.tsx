'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NavKeys from '@/constants/navkeys';

export default function OrdersPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(NavKeys.Orders);
  }, [router]);

  return null;
}
