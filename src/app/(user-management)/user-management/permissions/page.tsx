'use client';
import React, { useState, useCallback } from 'react';
import { createColumns } from '@/components/data-tables/permissions/columns';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/features/user-managment/permissions/hooks/usePermissions';
import { RequirePermission } from '@/components/auth/require-permission';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { Action } from '@/components/data-tables/util/types';
import { PaginationState } from '@tanstack/react-table';
import { SearchInput } from '@/components/ui/search-input';
import { MasterRecordCheckboxMultiSelect } from '@/components/shared/master-record-checkbox-multiselect';
import NavKeys from '@/constants/navkeys';
import PageHeader from '@/components/shared/page-header';
import { Eye, Pencil, History } from 'lucide-react';
import { StatusDropdown } from '@/components/shared/status-dropdown';

const PermissionsPage = () => {
  return (
    <RequirePermission module="permissions">
      <PermissionListContent />
    </RequirePermission>
  );
};

  const STATUS_FILTER = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
  };

const PermissionListContent = () => {
  const permission = usePermissionChecker('permissions');
  const hasCreatePermission = permission.has('create');
  const [selectedDivision, setSelectedDivision] = useState<string[]>([]);
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { permissions, updatePermission } = usePermissions({
    search: search,
    ...(selectedStatus && { isActive: selectedStatus === 'active' }),
    ...(selectedDivision.length > 0 && {
      divisionId: JSON.stringify(selectedDivision),
    }),
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
  });

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  const handleAddPermission = () => {
    router.push(NavKeys.PermissionCreation);
  };

  const handleEditPermission = (permission: any) => {
    router.push(
      `${NavKeys.PermissionCreation}?mode=edit&permissionId=${permission.permissionId}`
    );
  };

  const handleViewLogs = (permission: any) => {
    router.push(
      `/user-management/permissions/logs?permissionId=${permission.permissionId}`
    );
  };

  const getActionsForPermissions = useCallback(
    (permissionItem: any): Action[] => {
      const actions: Action[] = [];

      // Add View action for all permissions
      actions.push({
        title: 'View',
        icon: <Eye />,
        handleAction: () =>
          router.push(
            `${NavKeys.PermissionCreation}?mode=view&permissionId=${permissionItem.permissionId}`
          ),
      });

      if (permission.has('edit')) {
        actions.push({
          title: 'Edit',
          icon: <Pencil />,
          handleAction: () => handleEditPermission(permissionItem),
        });
      }

      if (permission.has('log')) {
        actions.push({
          title: 'Logs',
          icon: <History />,
          handleAction: () => handleViewLogs(permissionItem),
        });
      }

      return actions;
    },
    [permission, router]
  );

  // Handler to toggle isActive with updatePermission API (optimistic update)
  const handleToggleActive = async (permissionId: string, value: boolean) => {
    try {
      await updatePermission.mutateAsync({
        permissionId,
        data: { isActive: value },
      });
    } catch (error) {
      // Error handling can be improved here
      console.error('Failed to update permission status:', error);
    }
  };

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Permissions" />

      <div className="w-full space-y-4 rounded-lg bg-white p-4">
        <div className="flex flex-col justify-between gap-6 pb-4 md:flex-row md:items-center">
          {/* Left section - search + filters */}
          <div className="grid w-full grid-cols-3 gap-5">
            <div>
              <SearchInput
                placeholder="Search by Permission Name"
                value={search}
                onChange={setSearch}
                className="w-full"
              />
            </div>
            <div>
              <MasterRecordCheckboxMultiSelect
                masterName="division"
                value={selectedDivision}
                onChange={setSelectedDivision}
                placeholder="Division"
                className="w-full"
                displayName="division"
              />
            </div>
            <div>
              <StatusDropdown
                value={selectedStatus}
                onChange={setSelectedStatus}
                statusEnum={STATUS_FILTER}
                placeholder="Status"
                className="w-full md:w-95"
              />
            </div>
          </div>

          {/* Right section - action buttons */}
          <div className="flex items-center gap-2">
            {hasCreatePermission && (
              <Button onClick={handleAddPermission}>
                <Plus className="mr-2 h-4 w-4" />
                Add Permission
              </Button>
            )}
          </div>
        </div>

        <div>
          <DataTable
            columns={createColumns(
              getActionsForPermissions,
              pagination.pageIndex,
              pagination.pageSize
            )}
            data={(permissions.data?.data?.items || []).map(
              (permission: any) => ({
                ...permission,
                onToggleActive: (value: boolean) =>
                  handleToggleActive(permission.permissionId, value),
                toggleLoading: updatePermission.isPending,
              })
            )}
            pageCount={permissions.data?.data?.totalPages || 0}
            totalItems={permissions.data?.data?.totalItems || 0}
            onPaginationChange={handlePaginationChange}
            manualPagination={true}
            initialPagination={pagination}
            isLoading={permissions.isLoading}
            loadingText="Loading permissions..."
            tableId="permissions-table"
          />
        </div>
      </div>
    </section>
  );
};

export default PermissionsPage;
