'use client';

import { createColumns } from '@/components/data-tables/pjp-history/columns';
import { Action } from '@/components/data-tables/util/types';
import { LocationFilters, LocationFilters as LocationFiltersType } from '@/components/shared/location-filters';
import PjpTab from '@/components/tabs/pjp/pjp-tabs';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { usePjp } from '@/features/dashboard/pjp/hooks/usePjp';
import { VisitDetailsModal } from '@/components/modals/pjp/visit-details-modal';
import { useCallback, useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { PaginationState } from '@tanstack/react-table';
import GenericError from '@/components/ui/generic-error';
import { RequirePermission } from '@/components/auth/require-permission';
import PageHeader from '@/components/shared/page-header';
import { PERMISSIONS } from '@/constants/permissions.constant';
import { VisitOrderStatus } from '@/constants/enums/pjp.enums';

const JourneyPlanPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.PJP_HISTORY}>
      <JourneyPlanContent />
    </RequirePermission>
  );
};

const JourneyPlanContent = () => {
  const permission = useOptimizedPermissionChecker();
  const [locationFilters, setLocationFilters] = useState<LocationFiltersType>({});
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [visitDetailsOpen, setVisitDetailsOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [pendingDateRange, setPendingDateRange] = useState<DateRange | undefined>(undefined);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);



  // Fetch history data with filters using the correct API endpoint
  const { getPjpHistory } = usePjp();
  const isRangeActive = !!(dateRange?.from && dateRange?.to);
  const {
    data: historyData,
    isLoading,
    error,
  } = getPjpHistory(
    pagination.pageIndex * pagination.pageSize,
    pagination.pageSize,
    {
      ...(selectedStatus && { status: selectedStatus }),
      ...(locationFilters.warehouseIds && locationFilters.warehouseIds.length > 0 && {
        warehouseId: locationFilters.warehouseIds.join(','), // Send all selected warehouse IDs
      }),
      ...(locationFilters.channelId && locationFilters.channelId.length > 0 && {
        channelId: JSON.stringify(locationFilters.channelId),
      }),
      ...(locationFilters.salesPersonId && {
        userId: locationFilters.salesPersonId,
      }),
      ...(locationFilters.divisionId && locationFilters.divisionId.length > 0 && {
        divisionId: JSON.stringify(locationFilters.divisionId),
      }),
      ...(locationFilters.zoneId && locationFilters.zoneId.length > 0 && {
        zoneId: JSON.stringify(locationFilters.zoneId),
      }),
      ...(locationFilters.subZoneId && locationFilters.subZoneId.length > 0 && {
        subZoneId: JSON.stringify(locationFilters.subZoneId),
      }),
      // Send single date or range to the API
      ...(dateRange?.from && !dateRange?.to && {
        visitDate: format(dateRange.from, 'yyyy-MM-dd'),
      }),
      ...(isRangeActive && {
        fromdate: format(dateRange.from!, 'yyyy-MM-dd'),
        todate: format(dateRange.to!, 'yyyy-MM-dd'),
      }),
    }
  );

  const pjpHistoryData = historyData?.data?.items || [];

  const handleViewDetails = (record: any) => {
    setSelectedVisit(record);
    setVisitDetailsOpen(true);
  };

  const getActionsForPermissions = useCallback(
    (record: any): Action[] => {
      const actions: Action[] = [];
      if (permission.has('pjp', 'view')) {
        actions.push({
          title: 'View Details',
          handleAction: () => handleViewDetails(record),
        });
      }
      return actions;
    },
    [permission]
  );

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [locationFilters, selectedStatus, dateRange]);

  const formatDateRangeLabel = (range: DateRange | undefined) => {
    if (!range?.from && !range?.to) return 'Pick a date range';
    if (range?.from && !range?.to) return format(range.from, 'dd/MM/yyyy');
    if (range?.from && range?.to) return `${format(range.from, 'dd/MM/yyyy')} - ${format(range.to, 'dd/MM/yyyy')}`;
    return 'Pick a date range';
  };

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Permanent Journey Plan" />

      <div className="w-full space-y-3 rounded-lg bg-card p-4">
        <PjpTab />

        <LocationFilters
          filters={locationFilters}
          onFiltersChange={setLocationFilters}
          showWarehouse={true}
          showSalesPerson={true}
          className="w-full"
          statusFilterColSpanClassName="md:col-span-2 lg:col-span-2"
          statusFilter={
            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
              <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value === "select-status" ? "" : value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select-status">Select Status</SelectItem>
                  <SelectItem value={VisitOrderStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={VisitOrderStatus.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={VisitOrderStatus.VISITED}>Visited</SelectItem>
                  <SelectItem value={VisitOrderStatus.CANCELLED}>Cancelled</SelectItem>
                  <SelectItem value={VisitOrderStatus.UN_ASSIGNED}>Un Assigned</SelectItem>
                </SelectContent>
              </Select>
              <Popover open={isDatePopoverOpen} onOpenChange={(open) => {
                setIsDatePopoverOpen(open);
                if (open) {
                  setPendingDateRange(dateRange);
                }
              }}>
                <PopoverTrigger asChild>
                  <Button
                    variant="white"
                    className={cn('w-full justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateRangeLabel(dateRange)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <div className="p-3">
                    <Calendar
                      mode="range"
                      selected={pendingDateRange as any}
                      onSelect={setPendingDateRange as any}
                      numberOfMonths={1}
                      initialFocus
                    />
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPendingDateRange(undefined);
                          setDateRange(undefined);
                          setIsDatePopoverOpen(false);
                        }}
                      >
                        Clear
                      </Button>
                      <Button
                        onClick={() => {
                          setDateRange(pendingDateRange);
                          setIsDatePopoverOpen(false);
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          }
        />


        {error ? (
          <div className="flex h-64 items-center justify-center">
            <GenericError text="Error loading PJP history. Please try again." />
          </div>
        ) : (
          <DataTable
            columns={createColumns(
              getActionsForPermissions,
              pagination.pageIndex,
              pagination.pageSize
            )}
            data={pjpHistoryData}
            pageCount={historyData?.data?.totalPages || 0}
            totalItems={historyData?.data?.totalItems || 0}
            onPaginationChange={handlePaginationChange}
            manualPagination={true}
            initialPagination={pagination}
            isLoading={isLoading}
            loadingText="Loading PJP history..."
            tableId="pjp-history-table"
          />
        )}
      </div>

      <VisitDetailsModal
        open={visitDetailsOpen}
        onOpenChange={setVisitDetailsOpen}
        visitData={selectedVisit}
      />
    </section>
  );
};

export default JourneyPlanPage;
