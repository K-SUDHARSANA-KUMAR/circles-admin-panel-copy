'use client';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { WarehouseMultiSelectFilter } from '@/components/shared/warehouse-multiselect-filter';
import EmptyState from '@/components/ui/empty-state';
import GenericError from '@/components/ui/generic-error';
import Loading from '@/components/ui/loading';
import { History, Pencil, PlusIcon, RefreshCw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { RequirePermission } from '@/components/auth/require-permission';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { Action } from '@/components/data-tables/util/types';
import { PaginationState } from '@tanstack/react-table';
import { SearchInput } from '@/components/ui/search-input';
import ProductTabs from '@/components/tabs/products/product-tabs';
import { createPricingGroupColumns } from '@/components/data-tables/products/pricing-group-columns';
import { usePricingGroups } from '@/features/dashboard/products/hooks/usePricingGroups';
import { toast } from 'sonner';
import NavKeys from '@/constants/navkeys';
import PageHeader from '@/components/shared/page-header';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';

const PricingGroupPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.CUSTOMER_GROUP}>
      <PricingGroupContent />
    </RequirePermission>
  );
};

const PricingGroupContent = () => {
  const permission = useOptimizedPermissionChecker();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>(
    []
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Memoize query params to prevent unnecessary refetches
  const queryParams = useMemo(
    () => ({
      skip: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
      search: searchQuery || undefined,
      ...(selectedWarehouseIds.length > 0 && {
        warehouseId: selectedWarehouseIds,
      }),
    }),
    [
      pagination.pageIndex,
      pagination.pageSize,
      searchQuery,
      selectedWarehouseIds,
    ]
  );

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchQuery, selectedWarehouseIds]);

  const { pricingGroups, deletePricingGroup } = usePricingGroups(queryParams);

  const handleAddNew = useCallback(() => {
    router.push(NavKeys.PriceGroupCreation);
  }, [router]);

  const handleEdit = useCallback((pricingGroup: any) => {
    const pricingGroupId = pricingGroup.groupId;
    if (!pricingGroupId) {
      toast.error('Unable to edit: No pricing group ID found');
      return;
    }
    router.push(`${NavKeys.PriceGroupEdit}?pricingGroupId=${pricingGroupId}`);
  }, [router]);

  const handleViewLogs = useCallback((pricingGroup: any) => {
    const pricingGroupId = pricingGroup.groupId;
    router.push(
      `/logs?service=pricing-group&module=products&metaTags.pricingGroupId=${pricingGroupId}`
    );
  }, [router]);

  const handleDelete = useCallback(async (pricingGroup: any) => {
    const pricingGroupId = pricingGroup.groupId;
    if (!pricingGroupId) {
      toast.error('Unable to delete: No pricing group ID found');
      return;
    }

    if (
      confirm(`Are you sure you want to delete "${pricingGroup.groupName}"?`)
    ) {
      try {
        await deletePricingGroup.mutateAsync(pricingGroupId);
        toast.success('Pricing group deleted successfully');
      } catch (error) {
        console.error('Error deleting pricing group:', error);
        toast.error('Failed to delete pricing group');
      }
    }
  }, [deletePricingGroup]);

  const getActionsForPermissions = useCallback(
    (pricingGroup: any): Action[] => {
      const actions: Action[] = [];
      if (permission.has(PERMISSIONS.CUSTOMER_GROUP, MENU_RIGHTS.VIEW)) {
        actions.push({
          title: 'View & Edit',
          handleAction: () => handleEdit(pricingGroup),
        });
      }
      if (permission.has(PERMISSIONS.CUSTOMER_GROUP, MENU_RIGHTS.LOG)) {
        actions.push({
          title: 'Logs',
          handleAction: () => handleViewLogs(pricingGroup),
        });
      }
      if (permission.has(PERMISSIONS.CUSTOMER_GROUP, MENU_RIGHTS.DELETE)) {
        actions.push({
          title: 'Delete',
          handleAction: () => handleDelete(pricingGroup),
          showWarning: true,
        });
      }
      return actions;
    },
    [permission, handleEdit, handleViewLogs, handleDelete]
  );

  // Memoize columns to prevent recreation on every render
  const columns = useMemo(
    () => createPricingGroupColumns(
      getActionsForPermissions,
      pagination.pageIndex,
      pagination.pageSize
    ),
    [getActionsForPermissions, pagination.pageIndex, pagination.pageSize]
  );

  const handlePaginationChange = useCallback((newPagination: PaginationState) => {
    setPagination(newPagination);
  }, []);

  if (pricingGroups.error) {
    return (
      <section className="w-full space-y-6">
        <PageHeader title="Customer Groups" />

        <div className="w-full rounded-lg bg-white p-4">
          <div className="flex h-64 items-center justify-center">
            <GenericError text="Error loading pricing groups. Please try again." />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Customer Groups" />

      <div className="w-full space-y-4 rounded-lg bg-white p-4">
        <ProductTabs />
        <div className="flex flex-col">
          <div className="flex flex-col justify-between gap-10 pb-4 md:flex-row">
            <div className="relative">
              <SearchInput
                placeholder="Search Customer Group name"
                className="w-[300px]"
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>

            <div className="flex gap-2">
              {permission.has(
                PERMISSIONS.CUSTOMER_GROUP,
                MENU_RIGHTS.CREATE
              ) && (
                  <Button onClick={handleAddNew}>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Customer Group
                  </Button>
                )}
            </div>
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
            <WarehouseMultiSelectFilter
              selectedWarehouseIds={selectedWarehouseIds}
              onChange={setSelectedWarehouseIds}
              className="w-[300px]"
            />
          </div>
        </div>

        {pricingGroups.isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loading text="Loading..." />
          </div>
        ) : (
          pricingGroups.data?.data?.items && (
            <DataTable
              columns={columns}
              data={pricingGroups.data.data.items}
              pageCount={pricingGroups.data?.data?.totalPages}
              totalItems={pricingGroups.data?.data?.totalItems}
              onPaginationChange={handlePaginationChange}
              manualPagination={true}
              initialPagination={pagination}
              isLoading={pricingGroups.isLoading}
              loadingText="Loading pricing groups..."
              tableId="pricing-groups-table"
            />
          )
        )}
      </div>
    </section>
  );
};

export default PricingGroupPage;
