'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — waitlist rejected list lives on the main waitlist page tab. */
export default function RejectedWaitlistRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/user-management/waitlist?tab=rejected');
  }, [router]);

  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400" />
    </div>
  );
}
