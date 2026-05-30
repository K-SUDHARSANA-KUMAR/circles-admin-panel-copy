import React from 'react';
import WaitlistDetailClient from '@/app/(dashboard)/user-management/waitlist/[id]/WaitlistDetailClient';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function WaitlistDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <WaitlistDetailClient userId={id} />;
}

// Mandatory for output: 'export' static hosting compatibility with dynamic routes
export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}
