'use client';

import ClaimsTab from '@/components/tabs/claims/claims-tabs';

export default function ClaimsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Claims HERE</h1>
      </div>
      <ClaimsTab />
    </div>
  );
} 