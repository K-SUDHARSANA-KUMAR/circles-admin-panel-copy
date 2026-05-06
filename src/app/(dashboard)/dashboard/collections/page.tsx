'use client';

import {
  createColumns,
} from '@/components/data-tables/collections/columns';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import PageHeader from '@/components/shared/page-header';
import { WarehouseDropdown } from '@/components/shared/warehouse-dropdown';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { DateRangePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Collection } from '@/features/dashboard/collections/api/collections';
import { useCollections } from '@/features/dashboard/collections/hooks/useCollections';
import { useRouter } from 'next/navigation';
import { Action } from '@/components/data-tables/util/types';
import GenericError from '@/components/ui/generic-error';
import { LocationFilters, LocationFilters as LocationFiltersType } from '@/components/shared/location-filters';
import { useAppSelector } from '@/store/hooks';
import { toast } from 'sonner';
import { PaymentStatusEnum, PaymentTypeEnum, PaymentModeEnum } from '@/constants/enums/payment.enums';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CollectionListPage = () => {
  const [selectedPaymentType, setSelectedPaymentType] = useState<
    string | undefined
  >(undefined);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string | undefined>(
    undefined
  );
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string | undefined>(
    undefined
  );
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const [locationFilters, setLocationFilters] = useState<LocationFiltersType>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize] = useState<number>(10);

  const [selectedCount, setSelectedCount] = useState<number>(0);
  const [selectedRows, setSelectedRows] = useState<Collection[]>([]);
  const [selectedAmount, setSelectedAmount] = useState<number>(0);

  // Build filters object
  const filters = {
    skip: currentPage * pageSize,
    limit: pageSize,
    search: searchQuery || undefined,
    status: selectedPaymentStatus || undefined,
    paymentMode: selectedPaymentMode || undefined,
    ...(locationFilters.warehouseIds && locationFilters.warehouseIds.length > 0 && {
      warehouseId: JSON.stringify(locationFilters.warehouseIds),
    }),
    ...(locationFilters.salesPersonId && {
      salesPersonId: locationFilters.salesPersonId,
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
    dateFrom: selectedDateRange?.from && selectedDateRange?.to ? selectedDateRange.from.toISOString() : undefined,
    dateTo: selectedDateRange?.from && selectedDateRange?.to ? selectedDateRange.to.toISOString() : undefined,
  };

  const { 
    data: collections, 
    isLoading, 
    error, 
    totalItems, 
    totalPages,
    handoverPayments
  } = useCollections(filters);
  const router = useRouter();
  
  const handleViewCollection = (collection: Collection) => {
    const params = new URLSearchParams();
    params.set('paymentId', collection.paymentId);
    
    // Get invoiceId from invoiceIds array
    const invoiceId = collection.invoiceIds && collection.invoiceIds[0];
    
    if (invoiceId) {
      params.set('invoiceId', invoiceId);
    }
    
    router.push(`/dashboard/collections/collection-view?${params.toString()}`);
  };

  const getActionsForRow = (collection: Collection): Action[] => [
    {
      title: 'View',
      handleAction: () => handleViewCollection(collection),
    },
  ];

  const userId = useAppSelector((state) => state.auth.user?.userId);
  const user = useAppSelector((state) => state.auth.user);
  
  const userDivisionIds = (user as any)?.division?.map((d: any) => d.divisionId) || [];
  const userZoneIds = (user as any)?.zone?.map((z: any) => z.zoneId) || [];
  const userSubZoneIds = (user as any)?.subZone?.map((s: any) => s.subZoneId) || [];
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [
    selectedPaymentType,
    selectedPaymentMode,
    selectedPaymentStatus,
    searchQuery,
    selectedDateRange,
    locationFilters,
    locationFilters.salesPersonId,
  ]);



  const handleRowSelectionChange = (selectedRows: Collection[]) => {
    // Filter out items that are already collected by current user
    const selectableRows = selectedRows.filter(collection => {
      if (!userId || !collection.collections) return true;
      
      // Check if any collection has the current user as the "to" admin
      const isCollectedByCurrentUser = collection.collections.some(collectionItem => 
        collectionItem.to.type === 'admin' && 
        collectionItem.to.id === userId &&
        collectionItem.status === 'completed'
      );
      
      return !isCollectedByCurrentUser;
    });
    
    setSelectedRows(selectableRows);
    setSelectedCount(selectableRows.length);
    
    // Calculate total amount of selected items
    const totalAmount = selectableRows.reduce((sum, collection) => sum + collection.amount, 0);
    setSelectedAmount(totalAmount);
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (value: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setSearchQuery(value);
          setCurrentPage(0); // Reset to first page when searching
        }, 300); // 300ms delay
      };
    })(),
    []
  );

  const handleSearch = (value: string) => {
    debouncedSearch(value);
  };

  const handleFilterChange = () => {
    setCurrentPage(0); // Reset to first page when filters change
  };


  const handleCollectPayments = () => {
    if (selectedRows.length === 0) {
      toast.error('Please select at least one payment to collect');
      return;
    }

    if (!userId) {
      toast.error('User authentication required');
      return;
    }

    const paymentIds = selectedRows.map(row => row.paymentId);
    
    handoverPayments.mutate({
      paymentIds: paymentIds,
      userId: userId,
      remarks: 'DE → Admin handover'
    }, {
      onSuccess: () => {
        toast.success(`Successfully collected ${selectedRows.length} payment(s)`);
        setSelectedRows([]);
        setSelectedCount(0);
        setSelectedAmount(0);
      },
      onError: (error: any) => {
        toast.error(
          error.response?.data?.message || 'Failed to collect payments'
        );
      }
    });
  };

  // Add onView handler to collections data
  const collectionsWithActions = collections.map(collection => ({
    ...collection,
    onView: () => handleViewCollection(collection as any),
  })) as Collection[];

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Collections" />
      
      <div className="w-full space-y-4 rounded-lg bg-white p-4">
        <div className="flex flex-col">
          <div className="flex flex-col justify-between gap-10 pb-4 md:flex-row">
            <div className="relative w-full">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-500" />
              <Input
                placeholder="Search by invoice ID, order ID, payment ID, collector name, or employee code"
                className="w-full pl-10 md:w-[calc(50%-1rem)]"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div />
          </div>
          {/* Payment Filters Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 mb-4">
            <Select
              value={selectedPaymentType || ''}
              onValueChange={(value) => {
                setSelectedPaymentType(value === 'all' ? undefined : value);
                handleFilterChange();
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Payment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value={PaymentTypeEnum.PAY_NOW}>Pay Now</SelectItem>
                <SelectItem value={PaymentTypeEnum.PAY_LATER}>Pay Later</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedPaymentMode || ''}
              onValueChange={(value) => {
                setSelectedPaymentMode(value === 'all' ? undefined : value);
                handleFilterChange();
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Payment Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value={PaymentModeEnum.ONLINE}>Online</SelectItem>
                <SelectItem value={PaymentModeEnum.CASH}>Cash</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedPaymentStatus || ''}
              onValueChange={(value) => {
                setSelectedPaymentStatus(value === 'all' ? undefined : value);
                handleFilterChange();
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={PaymentStatusEnum.PAYMENT_CREATED}>Created</SelectItem>
                <SelectItem value={PaymentStatusEnum.PAYMENT_INITIATED}>Initiated</SelectItem>
                <SelectItem value={PaymentStatusEnum.PAYMENT_PROCESSING}>Processing</SelectItem>
                <SelectItem value={PaymentStatusEnum.PAYMENT_CAPTURED}>Captured</SelectItem>
                <SelectItem value={PaymentStatusEnum.REFUND_INITIATED}>Refund Initiated</SelectItem>
                <SelectItem value={PaymentStatusEnum.REFUND_FAILED}>Refund Failed</SelectItem>
                <SelectItem value={PaymentStatusEnum.REFUND_PROCESSED}>Refund Processed</SelectItem>
                <SelectItem value={PaymentStatusEnum.PARTIALLY_REFUNDED}>Partially Refunded</SelectItem>
                <SelectItem value={PaymentStatusEnum.PAYMENT_FAILED}>Failed</SelectItem>
                <SelectItem value={PaymentStatusEnum.PAYMENT_COMPLETED}>Completed</SelectItem>
                <SelectItem value={PaymentStatusEnum.PAYMENT_PENDING}>Pending</SelectItem>
                <SelectItem value={PaymentStatusEnum.PAYMENT_AUTHORIZED}>Authorized</SelectItem>
              </SelectContent>
            </Select>

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
            showSalesPerson={true}
            className="w-full my-4"
          />

        </div>
        <div className="bg-background mb-4 flex items-center justify-between rounded-lg p-2">
          <div className="text-sm text-gray-600">
            {!isLoading && (
              <>
                Showing {collections.length} of {totalItems} collections
                {totalPages > 1 && ` (Page ${currentPage + 1} of ${totalPages})`}
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-base font-medium">
                {selectedCount.toString().padStart(2, '0')} Items Selected
              </span>
              {selectedCount > 0 && (
                <span className="text-sm text-gray-600">
                  Total Amount: ₹{selectedAmount.toLocaleString()}
                </span>
              )}
            </div>
            <Button 
              variant="default" 
              disabled={selectedCount === 0 || handoverPayments.isPending}
              onClick={handleCollectPayments}
            >
              {handoverPayments.isPending ? 'Collecting...' : 'Collect'}
            </Button>
          </div>
        </div>
          {error ? (
            <div className="flex h-64 items-center justify-center">
              <GenericError text="Error loading collections. Please try again." />
            </div>
          ) : (
            <DataTable
              columns={createColumns(userId, getActionsForRow)}
              data={collections}
              tableId="collections-table"
              onRowSelectionChange={handleRowSelectionChange}
              isLoading={isLoading}
              loadingText="Loading collections..."
              pageCount={totalPages}
              totalItems={totalItems}
              onPaginationChange={(pagination) => setCurrentPage(pagination.pageIndex)}
              manualPagination={true}
              initialPagination={{ pageIndex: currentPage, pageSize: pageSize }}
            />
          )}
        
      </div>
    </section>
  );
};

export default CollectionListPage;
