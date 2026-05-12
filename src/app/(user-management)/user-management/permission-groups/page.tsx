'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createColumns } from '@/components/data-tables/permission-groups/columns';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePermissionGroups } from '@/features/user-managment/permission-groups/hooks/usePermissionGroups';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import EmptyState from '@/components/ui/empty-state';
import { RequirePermission } from '@/components/auth/require-permission';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { Action } from '@/components/data-tables/util/types';
import { toast } from 'sonner';
import { SearchInput } from '@/components/ui/search-input';
import { MasterRecordCheckboxMultiSelect } from '@/components/shared/master-record-checkbox-multiselect';
import NavKeys from '@/constants/navkeys';
import PageHeader from '@/components/shared/page-header';
import { PaginationState } from '@tanstack/react-table';
import { useAppSelector } from '@/store/hooks';
import { Eye, Pencil, History } from 'lucide-react';

const PermissionGroupsPage = () => {
  return (
    <RequirePermission module="permission-groups">
      <PermissionGroupsContent />
    </RequirePermission>
  );
};
const PermissionGroupsContent = () => {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const permission = usePermissionChecker('permission-groups');
  const hasCreateGroupPermission = permission.has('create');

  const { permissionGroups, updatePermissionGroup } =
    usePermissionGroups({
      search: search,
      skip: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
      ...(selectedDivision.length > 0 && {
        divisionId: JSON.stringify(selectedDivision),
      }),
      ...(selectedRole.length > 0 && {
        roleId: JSON.stringify(selectedRole),
      }),
    });

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  const handleAddGroup = () => {
    router.push(NavKeys.PermissionGroupCreation);
  };

  const handleUpdate = (group: any) => {
    router.push(
      `${NavKeys.PermissionGroupCreation}?mode=edit&permissionGroupId=${group.permissionGroupId}`
    );
  };

  const handleViewLogs = (group: any) => {
    router.push(`/user-management/permission-groups/logs?permissionGroupId=${group.permissionGroupId}`);
  };


  const getActionsForPermissionGroups = useCallback(
    (permissionGroup: any): Action[] => {
      const actions: Action[] = [];

      // Add View action for all users
      actions.push({
        title: 'View',
        icon: <Eye />,
        handleAction: () =>
          router.push(
            `${NavKeys.PermissionGroupCreation}?mode=view&permissionGroupId=${permissionGroup.permissionGroupId}`
          ),
      });

      if (permission.has('edit')) {
        actions.push({
          title: 'Edit',
          icon: <Pencil />,
          handleAction: () => handleUpdate(permissionGroup),
        });
      }

      if (permission.has('log')) {
        actions.push({
          title: 'Logs',
          icon: <History />,
          handleAction: () => handleViewLogs(permissionGroup),
        });
      }

      return actions;
    },
    [permission, router]
  );

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Permission Groups" />

      <div className="w-full space-y-4 rounded-lg bg-card p-4">
        <div className="flex flex-col justify-between gap-10 pb-4 md:flex-row">
          <div className="grid w-full grid-cols-3 gap-5">
            <div>
              <SearchInput
                placeholder="Search by Permission Name"
                value={search}
                onChange={setSearch}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasCreateGroupPermission && (
              <Button onClick={handleAddGroup}>
                <Plus className="mr-2 h-4 w-4" />
                Add Group
              </Button>
            )}
          </div>
        </div>
        <div className='grid grid-cols-4 gap-2'>
            <MasterRecordCheckboxMultiSelect
              masterName="division"
              value={selectedDivision}
              onChange={setSelectedDivision}
              placeholder="Division"
              className="w-full"
              displayName="division"
            />
            <MasterRecordCheckboxMultiSelect
              masterName="role"
              value={selectedRole}
              onChange={setSelectedRole}
              placeholder="Role"
              className="w-full"
              displayName="role"
            />
        </div>
        <div>
          <DataTable
            columns={createColumns(getActionsForPermissionGroups)}
            data={(permissionGroups.data?.data?.items || []).map(
              (group: any) => ({
                ...group,
              })
            )}
            pageCount={permissionGroups.data?.data?.totalPages || 0}
            totalItems={permissionGroups.data?.data?.totalItems || 0}
            onPaginationChange={handlePaginationChange}
            manualPagination={true}
            initialPagination={pagination}
            isLoading={permissionGroups.isLoading}
            loadingText="Loading permission groups..."
            tableId="permissions-group-table"
          />
        </div>
      </div>
    </section>
  );
};

export default PermissionGroupsPage;
