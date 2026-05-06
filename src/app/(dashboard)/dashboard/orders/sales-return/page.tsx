'use client';

import { createColumns } from '@/components/data-tables/orders/sales-return/columns';
import { DataTable } from '@/components/ui/data-table';
import { useCallback, useEffect, useState } from 'react';
import { DateRangePicker } from '@/components/ui/date-picker';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { Action } from '@/components/data-tables/util/types';
import { RequirePermission } from '@/components/auth/require-permission';
import OrdersTab from '@/components/tabs/orders/orders-tabs';
import PageHeader from '@/components/shared/page-header';
import { useRouter } from 'next/navigation';
import { useReturnOrders } from '@/features/dashboard/orders/hooks/useReturnOrders';
import GenericError from '@/components/ui/generic-error';
import { PaginationState } from '@tanstack/react-table';
import { useAppSelector } from '@/store/hooks';
import { StatusDropdown } from '@/components/shared/status-dropdown';
import { ReturnOrderStatus } from '@/constants/enums/orders.enums';
import { SearchInput } from '@/components/ui/search-input';
import { LocationFilters, LocationFilters as LocationFiltersType } from '@/components/shared/location-filters';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import NavKeys from '@/constants/navkeys';
import { PERMISSIONS } from '@/constants/permissions.constant';

export default function SalesReturnPage() {
  return (
    <RequirePermission module={PERMISSIONS.SALES_RETURN}>
      <SalesReturnContent />
    </RequirePermission>
  );
}

function SalesReturnContent() {
  const router = useRouter();
  const permission = usePermissionChecker(PERMISSIONS.SALES_RETURN);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [locationFilters, setLocationFilters] = useState<LocationFiltersType>({});
  const [search, setSearch] = useState('');
  const { recordMaps } = useAppSelector((state) => state.masterRecords);
  const { warehouseMap } = useAppSelector((state) => state.warehouse);
  const [selectedOutletType, setSelectedOutletType] = useState<
    string | undefined
  >();

  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>();
  const [selectedChannel, setSelectedChannel] = useState<string | undefined>(
    undefined
  );

  const { allReturnOrders } = useReturnOrders({
    ...(locationFilters.warehouseIds && locationFilters.warehouseIds.length > 0 && {
      warehouseId: JSON.stringify(locationFilters.warehouseIds),
    }),
    ...(locationFilters.divisionId && locationFilters.divisionId.length > 0 && {
      divisionId: JSON.stringify(locationFilters.divisionId),
    }),
    ...(locationFilters.channelId && locationFilters.channelId.length > 0 && {
      channelId: JSON.stringify(locationFilters.channelId),
    }),
    ...(locationFilters.zoneId && locationFilters.zoneId.length > 0 && {
      zoneId: JSON.stringify(locationFilters.zoneId),
    }),
    ...(locationFilters.subZoneId && locationFilters.subZoneId.length > 0 && {
      subZoneId: JSON.stringify(locationFilters.subZoneId),
    }),
    returnOrderStatus: selectedStatus,
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
    search,
    fromDate: selectedDateRange?.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : undefined,
    toDate: selectedDateRange?.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : undefined,
  });
  const returnOrdersData = allReturnOrders?.data?.data;

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  const getActionsForPermissions = useCallback(
    (record: any): Action[] => {
      const actions: Action[] = [];
      if (permission.has('view')) {
        actions.push({
          title: 'Return Order Details',
          handleAction: () =>
            router.push(
              `${NavKeys.SalesReturnOrderDetails}?returnId=${record.returnId}`
            ),
        });
      }
      if (permission.has('log')) {
        actions.push({
          title: 'Logs',
          handleAction: () => window.alert('Logs: ' + record.returnDate),
        });
      }
      return actions;
    },
    [permission, router]
  );

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [selectedOutletType, selectedStatus, selectedChannel, selectedDateRange, locationFilters.divisionId, locationFilters.channelId, locationFilters.zoneId, locationFilters.subZoneId, locationFilters.warehouseIds]);

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Sales Return" />
      <div className="w-full space-y-3 rounded-lg bg-white p-4">
        <OrdersTab />

        <div className="w-full space-y-1">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
            <div className="col-span-2">
              <SearchInput
                placeholder="Search Sales Return"
                rotatingWords={['Outlet Name', 'Owner Name', 'Owner Phone Number']}
                staticPrefix="Search by"
                rotateDuration={2500}
                value={search}
                onChange={setSearch}
                className="w-full"
              />
            </div>
            <StatusDropdown
              value={selectedStatus}
              onChange={setSelectedStatus}
              statusEnum={ReturnOrderStatus}
              className="w-full"
            />
            <DateRangePicker
              dateRange={selectedDateRange}
              onSelect={setSelectedDateRange}
              className="w-full"
              placeholder="Select date range"
            />
          </div>

          {/* Location Filters */}
          <LocationFilters
            filters={locationFilters}
            onFiltersChange={setLocationFilters}
            showWarehouse={true}
            className="w-full my-4"
          />

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-5"></div>

          {allReturnOrders.error ? (
            <div className="flex h-64 items-center justify-center">
              <GenericError text="Error loading return orders. Please try again." />
            </div>
          ) : (
            <DataTable
              columns={createColumns(
                getActionsForPermissions,
                pagination.pageIndex,
                pagination.pageSize,
                recordMaps,
                warehouseMap
              )}
              data={returnOrdersData?.items || []}
              pageCount={returnOrdersData?.totalPages || 0}
              totalItems={returnOrdersData?.totalItems || 0}
              manualPagination={true}
              initialPagination={pagination}
              onPaginationChange={handlePaginationChange}
              isLoading={allReturnOrders.isLoading}
              loadingText="Loading return orders..."
              tableId="sales-return-table"
            />
          )}
        </div>
      </div>
    </section>
  );
}
