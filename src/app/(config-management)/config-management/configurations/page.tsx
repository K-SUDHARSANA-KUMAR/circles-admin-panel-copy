'use client';

import { createColumns } from '@/components/data-tables/configurations/columns';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { Action } from '@/components/data-tables/util/types';
import { RequirePermission } from '@/components/auth/require-permission';
import PageHeader from '@/components/shared/page-header';
import { useConfigurations } from '@/features/config-management/configurations/hooks/useConfigurations';
import GenericError from '@/components/ui/generic-error';
import { PaginationState } from '@tanstack/react-table';
import { SearchInput } from '@/components/ui/search-input';
import { useRouter } from 'next/navigation';
import NavKeys from '@/constants/navkeys';
import { PERMISSIONS } from '@/constants/permissions.constant';

export default function ConfigurationsPage() {
  return (
    <RequirePermission module={PERMISSIONS.CONFIGURATIONS}>
      <ConfigurationsContent />
    </RequirePermission>
  );
}

function ConfigurationsContent() {
  const permission = usePermissionChecker(PERMISSIONS.CONFIGURATIONS);
  const router = useRouter();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const { configurations } = useConfigurations({
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
    search: debouncedSearch || undefined,
  });

  const configurationsData = configurations?.data?.data;

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  const getActionsForPermissions = useCallback(
    (record: any): Action[] => {
      const actions: Action[] = [];
      if (permission.has('edit')) {
        actions.push({
          title: 'Edit',
          handleAction: () => {
            router.push(
              `${NavKeys.ConfigurationsModification}?context=${encodeURIComponent(record.context)}&configId=${encodeURIComponent(record.configId)}`
            );
          },
        });
      }
      return actions;
    },
    [permission, router]
  );

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch]);

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Configurations" />
      <div className="w-full space-y-3 rounded-lg bg-card p-4">
        <div className="w-full space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:w-1/3">
              <SearchInput
                placeholder="Search configurations"
                value={search}
                onChange={(e) => setSearch(e)}
              />
            </div>
          </div>

          {configurations.error ? (
            <div className="flex h-64 items-center justify-center">
              <GenericError text="Error loading configurations. Please try again." />
            </div>
          ) : (
            <DataTable
              columns={createColumns(
                getActionsForPermissions,
                pagination.pageIndex,
                pagination.pageSize
              )}
              data={configurationsData?.items || []}
              pageCount={configurationsData?.totalPages || 0}
              totalItems={configurationsData?.totalItems || 0}
              manualPagination={true}
              initialPagination={pagination}
              onPaginationChange={handlePaginationChange}
              isLoading={configurations.isLoading}
              loadingText="Loading configurations..."
              tableId="configurations-table"
            />
          )}
        </div>
      </div>
    </section>
  );
}
