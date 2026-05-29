import React from 'react';
import UserDetailClient from './UserDetailClient';

type Props = {
  params: Promise<{ id: string }>;
};

const UserDetailsPage = async ({ params }: Props) => {
  const { id } = await params;
  return <UserDetailClient userId={id} />;
};

// Mandatory for output: 'export' static hosting compatibility with dynamic routes
export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default UserDetailsPage;
