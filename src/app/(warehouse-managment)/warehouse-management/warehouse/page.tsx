'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { columns } from '@/components/data-tables/warehouse/columns';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { PlusIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import NavKeys from '@/constants/navkeys';
import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';
import { Warehouse } from '@/components/data-tables/warehouse/columns';
import { useQueryClient } from '@tanstack/react-query';
import { RequirePermission } from '@/components/auth/require-permission';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import { setMasterRecords } from '@/store/slices/masterRecordsSlice';
import {
  LocationFilters,
  LocationFilters as LocationFiltersType,
} from '@/components/shared/location-filters';
import { SearchInput } from '@/components/ui/search-input';
import PageHeader from '@/components/shared/page-header';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';
import {
  useOptimizedPermissionChecker,
  usePermissionChecker,
} from '@/features/auth/hooks/useHasPermission';

const WarehouseManagementPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.WAREHOUSE}>
      <WarehouseManagementContent />
    </RequirePermission>
  );
};

const WarehouseManagementContent = () => {
  const router = useRouter();
  const permission = useOptimizedPermissionChecker();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [locationFilters, setLocationFilters] = useState<LocationFiltersType>(
    {}
  );
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const dispatch = useAppDispatch();
  const { recordMaps } = useAppSelector((state) => state.masterRecords);
  const user = useAppSelector((state) => state.auth.user);

  // Fetch warehouseType master records and store in Redux
  const { records: warehouseTypeRecords } = useMasterRecords(
    'warehouseType',
    undefined,
    1,
    1000,
    true
  );

  // Store warehouseType records in Redux when fetched
  useEffect(() => {
    if (warehouseTypeRecords?.data && Array.isArray(warehouseTypeRecords.data)) {
      const existingRecords = recordMaps.warehouseType ? Object.values(recordMaps.warehouseType) : [];
      const newRecords = warehouseTypeRecords.data;

      // Only update if records have actually changed
      const hasChanged =
        existingRecords.length !== newRecords.length ||
        newRecords.some((newRecord: any, index: number) => {
          const existing = existingRecords[index];
          if (!existing) return true;
          const existingId = existing.warehouseTypeId || (existing as any).warehousetypeId;
          const newId = newRecord.warehouseTypeId || newRecord.warehousetypeId;
          return existingId !== newId;
        });

      if (hasChanged) {
        dispatch(setMasterRecords({
          masterName: 'warehouseType',
          records: warehouseTypeRecords.data
        }));
      }
    }
  }, [warehouseTypeRecords?.data, dispatch, recordMaps.warehouseType]);

  // Extract specific record maps for warehouse columns - memoized to prevent re-renders
  const warehouseRecordMaps = useMemo(
    () => ({
      division: recordMaps.division || {},
      channel: recordMaps.channel || {},
      zone: recordMaps.zone || {},
      subZone: recordMaps.subZone || {},
      warehouseType: recordMaps.warehouseType || {},
    }),
    [
      recordMaps.division,
      recordMaps.channel,
      recordMaps.zone,
      recordMaps.subZone,
      recordMaps.warehouseType,
    ]
  );

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagination when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [locationFilters, debouncedSearch]);

  // Build filters for API call - memoized to prevent object recreation
  const apiFilters = useMemo(() => {
    const filters: {
      divisionId?: string;
      channelId?: string;
      zoneId?: string;
      subZoneId?: string;
      warehouseTypeId?: string;
      search?: string;
      skip?: number;
      limit?: number;
      userId?: string;
    } = {};

    if (locationFilters.divisionId && locationFilters.divisionId.length > 0) {
      filters.divisionId = JSON.stringify(locationFilters.divisionId);
    }
    if (locationFilters.channelId && locationFilters.channelId.length > 0) {
      filters.channelId = JSON.stringify(locationFilters.channelId);
    }
    if (locationFilters.zoneId && locationFilters.zoneId.length > 0) {
      filters.zoneId = JSON.stringify(locationFilters.zoneId);
    }
    if (locationFilters.subZoneId && locationFilters.subZoneId.length > 0) {
      filters.subZoneId = JSON.stringify(locationFilters.subZoneId);
    }
    if (locationFilters.warehouseTypeId) {
      filters.warehouseTypeId = locationFilters.warehouseTypeId;
    }
    if (debouncedSearch) {
      filters.search = debouncedSearch;
    }
    filters.skip = pagination.pageIndex * pagination.pageSize;
    filters.limit = pagination.pageSize;
    filters.userId = user?.userId;

    return filters;
  }, [
    locationFilters,
    debouncedSearch,
    pagination.pageIndex,
    pagination.pageSize,
    user?.userId,
  ]);

  const { warehouses, warehousesQuery } = useWarehouse(undefined, apiFilters);

  const handleEdit = useCallback(
    (warehouse: Warehouse) => {
      router.push(
        `${NavKeys.WarehouseCreate}?mode=edit&warehouseId=${warehouse?.warehouseId}`
      );
    },
    [router]
  );

  const handleViewLogs = useCallback(
    (warehouse: Warehouse) => {
      router.push(
        `/warehouse-management/warehouse/logs?warehouseId=${warehouse.warehouseId}`
      );
    },
    [router]
  );

  const handleAddNew = useCallback(() => {
    router.push(NavKeys.WarehouseCreate);
  }, [router]);

  // Memoize the action handlers to prevent unnecessary re-renders
  const handleEditMemo = useMemo(() => handleEdit, [handleEdit]);
  const handleViewLogsMemo = useMemo(() => handleViewLogs, [handleViewLogs]);

  // Map warehouses with action handlers - memoized to prevent dropdown closing
  const warehousesWithActions = useMemo(() => {
    return (
      warehouses?.data?.data?.items?.map((warehouse: Warehouse) => ({
        ...warehouse,
        onEdit: () => handleEditMemo(warehouse),
        onViewLogs: () => handleViewLogsMemo(warehouse),
      })) || []
    );
  }, [warehouses?.data?.data?.items, handleEditMemo, handleViewLogsMemo]);

  // Get totalItems for pagination (fallback to items.length if not present)
  const totalItems =
    warehousesQuery.data?.data?.totalItems || warehousesWithActions.length;

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Warehouses" />

      <div className="w-full space-y-4 rounded-lg bg-white p-4">
        <div>
          <div className="flex flex-col justify-between gap-10 pb-4 md:flex-row">
            <div className="w-full md:w-[40%]">
              <SearchInput
                placeholder="Search warehouse name"
                value={search}
                onChange={setSearch}
                className="w-full"
              />
            </div>
            {permission.has(PERMISSIONS.WAREHOUSE, MENU_RIGHTS.CREATE) && (
              <div className="flex items-center gap-2">
                <Button onClick={handleAddNew}>
                  <PlusIcon className="h-4 w-4" />
                  Add Warehouse
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Location Filters */}
        <LocationFilters
          filters={locationFilters}
          onFiltersChange={setLocationFilters}
          showWarehouse={false}
          showWarehouseType={true}
          className="w-full my-4"
        />


        <DataTable
          columns={useMemo(
            () => columns(warehouseRecordMaps),
            [warehouseRecordMaps]
          )}
          data={warehousesWithActions}
          pageCount={Math.ceil(totalItems / pagination.pageSize)}
          totalItems={totalItems}
          onPaginationChange={useCallback(
            ({
              pageIndex: newPageIndex,
              pageSize: newPageSize,
            }: {
              pageIndex: number;
              pageSize: number;
            }) => {
              setPagination((prev) => {
                if (newPageSize !== prev.pageSize) {
                  return { pageIndex: 0, pageSize: newPageSize };
                } else {
                  return { ...prev, pageIndex: newPageIndex };
                }
              });
            },
            []
          )}
          manualPagination={true}
          initialPagination={pagination}
          isLoading={warehouses.isLoading}
          loadingText="Loading warehouses..."
          tableId="warehouse-table"
        />
      </div>
    </section>
  );
};

export default WarehouseManagementPage;
