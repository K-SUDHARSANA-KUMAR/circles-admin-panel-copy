'use client';

import React, { useState } from 'react';
import PageHeader from '@/components/shared/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { TopLevelList } from './_components/top-level-list';

const UserHierarchyPage = () => (
  <>
    <UserHierarchy />
  </>
);


const UserHierarchy = () => {
  const [searchQuery, setSearchQuery] = useState('');
  return (
    <section className="w-full space-y-6">
      <PageHeader title="User Hierarchy" />

      <div className="rounded-lg bg-white p-4">
        <div className="mb-4">
          <SearchInput
            placeholder="Search by name, code, phone..."
            value={searchQuery}
            onChange={setSearchQuery}
            minWidth="280px"
            rotatingWords={['Name', 'Employee Code', 'Phone Number']}
          />
        </div>
        <div className="space-y-2">
          <TopLevelList searchQuery={searchQuery} />
        </div>
      </div>
    </section>
  );
};


export default UserHierarchyPage;
