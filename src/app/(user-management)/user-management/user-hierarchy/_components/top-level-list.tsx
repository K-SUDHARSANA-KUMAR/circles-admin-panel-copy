'use client';

import React from 'react';
import EmptyState from '@/components/ui/empty-state';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import { useTopLevelUsers } from '../_hooks/useUserHierarchy';
import { HierarchyNode } from './hierarchy-node';

type TopLevelListProps = { searchQuery: string };

export const TopLevelList: React.FC<TopLevelListProps> = ({ searchQuery }) => {
  const { users, items } = useTopLevelUsers(searchQuery);

  if (users.isLoading) {
    return (
      <div className="w-full">
        <Loading iconClassName="w-6 h-6" className="text-sm" text="Loading Reporting Users" />
      </div>
    );
  }

  if (users.isError) {
    return (
      <div className="w-full">
        <GenericError text="Failed to load users." />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <EmptyState text={searchQuery ? 'No matching users found' : 'No users found'} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((user) => (
        <HierarchyNode
          key={user.userId}
          userId={user.userId}
          name={user.name}
          roleName={user.roleName || ''}
          depth={0}
          empCode={user.employeeCode || user.empCode} 
        />
      ))}
    </div>
  );
}; 