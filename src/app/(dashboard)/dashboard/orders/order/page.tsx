'use client';

import { createColumns } from '@/components/data-tables/orders/orders/columns';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { PlusIcon } from 'lucide-react';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { DateRangePicker } from '@/components/ui/date-picker';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { Action } from '@/components/data-tables/util/types';
import { RequirePermission } from '@/components/auth/require-permission';
import OrdersTab from '@/components/tabs/orders/orders-tabs';
import PageHeader from '@/components/shared/page-header';
import { useRouter, useSearchParams } from 'next/navigation';
import NavKeys from '@/constants/navkeys';
import { useOrders } from '@/features/dashboard/orders/hooks/useOrders';
import GenericError from '@/components/ui/generic-error';
import { PaginationState } from '@tanstack/react-table';
import { useAppSelector } from '@/store/hooks';
import { StatusDropdown } from '@/components/shared/status-dropdown';
import { OrderStatus } from '@/constants/enums/orders.enums';
import { LocationFilters, LocationFilters as LocationFiltersType } from '@/components/shared/location-filters';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';
import { ReportingManagerModal } from '@/components/modals/reporting-manager-modal';



export default function OrderPage() {
  return (
    <RequirePermission module={PERMISSIONS.ORDER}>
      <OrderContent />
    </RequirePermission>
  );
}

function OrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const permission = useOptimizedPermissionChecker();
  const hasOrdersCreatePermission = permission.has(PERMISSIONS.ORDER, MENU_RIGHTS.CREATE);
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

  const [salesPersonId, setSalesPersonId] = useState<string | undefined>();

  const [isSalesPersonModalOpen, setIsSalesPersonModalOpen] = useState(false);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<{ userId: string, name: string } | null>(null);
  const [pendingSalesPerson, setPendingSalesPerson] = useState<{ userId: string, name: string } | null>(null);

  const selectedSalesPersonName = useMemo(() => {
    if (selectedSalesPerson) {
      return selectedSalesPerson.name;
    }
    return 'Select Sales Person';
  }, [selectedSalesPerson]);

  const handleSalesPersonModalOpen = useCallback(() => {
    setPendingSalesPerson(selectedSalesPerson);
    setIsSalesPersonModalOpen(true);
  }, [selectedSalesPerson]);

  const handleSalesPersonModalClose = useCallback(() => {
    setPendingSalesPerson(null);
    setIsSalesPersonModalOpen(false);
  }, []);

  const handleSalesPersonChange = useCallback((salesPersonId: string | undefined, salesPersonData?: any) => {
    if (salesPersonId && salesPersonData) {
      setPendingSalesPerson({
        userId: salesPersonId,
        name: salesPersonData.name
      });
    } else {
      setPendingSalesPerson(null);
    }
  }, []);

  const handleSalesPersonConfirm = useCallback(() => {
    if (pendingSalesPerson) {
      setSelectedSalesPerson(pendingSalesPerson);
      setSalesPersonId(pendingSalesPerson.userId);
    } else {
      setSelectedSalesPerson(null);
      setSalesPersonId(undefined);
    }
    setPendingSalesPerson(null);
    setIsSalesPersonModalOpen(false);
  }, [pendingSalesPerson]);


  const orderIdFromQuery = searchParams?.get('orderId') || undefined;

  const { allOrders } = useOrders({
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
    orderStatus: selectedStatus,
    search: search || undefined,
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
    fromDate: selectedDateRange?.from ? format(selectedDateRange.from, 'yyyy-MM-dd') : undefined,
    toDate: selectedDateRange?.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : undefined,

    ...(salesPersonId && {
      userId: [salesPersonId],
    }),
    ...(orderIdFromQuery && {
      orderId: orderIdFromQuery,
    }),
  });
  const ordersData = allOrders?.data?.data;

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  const getActionsForPermissions = useCallback(
    (record: any): Action[] => {
      const actions: Action[] = [];
      if (permission.has(PERMISSIONS.ORDER, MENU_RIGHTS.VIEW)) {
        actions.push({
          title: 'Order Details',
          handleAction: () =>
            router.push(
              `${NavKeys.OrderCreation}?mode=view&orderId=${record.orderId}`
            ),
        });
      }

      if (
        permission.has(PERMISSIONS.ORDER, MENU_RIGHTS.EDIT) &&
        record.orderStatus !== OrderStatus.DELIVERED &&
        record.orderStatus !== OrderStatus.CANCELLED &&
        record.orderStatus !== OrderStatus.CONFIRMED
      ) {
        actions.push({
          title: 'Edit Order',
          handleAction: () =>
            router.push(
              `${NavKeys.OrderCreation}?mode=view&orderId=${record.orderId}&edit=true`
            ),
        });
      }

      if (permission.has(PERMISSIONS.ORDER, MENU_RIGHTS.LOG)) {
        actions.push({
          title: 'Logs',
          handleAction: () => window.alert('Logs: ' + record.orderDate),
        });
      }
      actions.push({
        title: 'View Invoices',
        handleAction: () =>
          router.push(`${NavKeys.Invoices}?orderId=${record.orderId}`),
      });
      return actions;
    },
    [permission, router]
  );

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [
    selectedOutletType,
    selectedStatus,
    selectedChannel,
    selectedDateRange,
    search,
    locationFilters.divisionId,
    locationFilters.channelId,
    locationFilters.zoneId,
    locationFilters.subZoneId,
    locationFilters.warehouseIds,
    salesPersonId
  ]);

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Orders" />
      <div className="w-full space-y-3 rounded-lg bg-card p-4">
        <OrdersTab />

        <div className="w-full space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:w-[40%]">
              <SearchInput
                placeholder="Search Orders"
                value={search}
                onChange={setSearch}
                className="w-full"
                rotatingWords={['Outlet Name', 'Owner Name', 'Owner Phone Number']}
                staticPrefix="Search by"
                rotateDuration={2500}
              />
            </div>
            {hasOrdersCreatePermission && (
              <Button
                className="w-full md:w-auto"
                onClick={() => router.replace(NavKeys.OrderCreation)}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Place Order
              </Button>
            )}
          </div>

          {/* Location Filters */}
          <LocationFilters
            filters={locationFilters}
            onFiltersChange={setLocationFilters}
            showWarehouse={true}
            // showSalesPerson={true} // Manually implemented below
            className="w-full my-4"
          />

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-5">
            <StatusDropdown
              value={selectedStatus}
              onChange={setSelectedStatus}
              statusEnum={OrderStatus}
              className="w-full"
            />
            <DateRangePicker
              dateRange={selectedDateRange}
              onSelect={setSelectedDateRange}
              className="w-full"
              placeholder="Select date range"
              mode="manual"
            />
            <button
              type="button"
              onClick={handleSalesPersonModalOpen}
              className="h-9 w-full rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-input/50 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 text-left"
            >
              {selectedSalesPersonName}
            </button>
          </div>

          <ReportingManagerModal
            open={isSalesPersonModalOpen}
            selectedManagerId={pendingSalesPerson?.userId}
            onChange={handleSalesPersonChange}
            onConfirm={handleSalesPersonConfirm}
            onCancel={handleSalesPersonModalClose}
            warehouseIds={locationFilters.warehouseIds}
            modalTitle="Select Sales Person"
            initialSelectedOption={pendingSalesPerson ? {
              userId: pendingSalesPerson.userId,
              name: pendingSalesPerson.name
            } : undefined}
          />

          {allOrders.error ? (
            <div className="flex h-64 items-center justify-center">
              <GenericError text="Error loading orders. Please try again." />
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
              data={ordersData?.items || []}
              pageCount={ordersData?.totalPages || 0}
              totalItems={ordersData?.totalItems || 0}
              manualPagination={true}
              initialPagination={pagination}
              onPaginationChange={handlePaginationChange}
              isLoading={allOrders.isLoading}
              loadingText="Loading orders..."
              tableId="order-creation-table"
            />
          )}
        </div>
      </div>
    </section>
  );
}
