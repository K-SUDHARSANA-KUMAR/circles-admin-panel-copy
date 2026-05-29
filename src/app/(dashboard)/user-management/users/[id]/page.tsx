import React from 'react';
import UserDetailClient from './UserDetailClient';

type Props = {
  params: Promise<{ id: string }>;
};

// Next.js App Router Server Component wrapper for static export compatibility
const UserDetailsPage = async ({ params }: Props) => {
  return <UserDetailClient params={params} />;
};

// Mandatory for output: 'export' static hosting compatibility with dynamic routes
export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default UserDetailsPage;
