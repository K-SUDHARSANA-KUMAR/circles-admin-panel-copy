'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { OutletMultiSelectorModal } from '@/components/modals/pjp/outlet-multi-selector-modal';
import MapRoutePlanSalesView from '@/components/modals/map-route-plan-sales-view';
import GenericPageLoading from '@/components/shared/generic-page-loading';
import EmptyState from '@/components/ui/empty-state';
import GenericError from '@/components/ui/generic-error';
import { Button } from '@/components/ui/button';
import { getBreadcrumbData } from '@/constants/breadcrumb-config';
import { usePjp } from '@/features/dashboard/pjp/hooks/usePjp';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';

// Import components from manual creation
import { OutletVisitTable } from '../../manual/manual-creation/_components/outlet-visit-table';
import { ExtendedOutletVisitRecord } from '../../manual/manual-creation/_types';

const SalesPersonViewPage = () => {
  return (
    <RequirePermission module="pjp">
      <SalesPersonViewContent />
    </RequirePermission>
  );
};

const SalesPersonViewContent = () => {
  const searchParams = useSearchParams();
  const routePlanId = searchParams.get('routePlanId');
  const day = searchParams.get('day');
  const breadcrumb = getBreadcrumbData('pjp', 'view');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [currentViewingRecord, setCurrentViewingRecord] = useState<ExtendedOutletVisitRecord | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [outletPagination, setOutletPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const { getRoutePlanById, getOVByDay } = usePjp();

  // Fetch route plan data by ID
  const {
    data: routePlanData,
    isLoading,
    error,
  } = getRoutePlanById(routePlanId || '');

  // Fetch outlet visit orders by date (only when modal is open and date is selected)
  const {
    data: outletVisitOrdersData,
    isLoading: isLoadingOutletOrders,
    error: outletOrdersError,
  } = getOVByDay(
    routePlanId || '',
    undefined,
    outletPagination.pageIndex * outletPagination.pageSize,
    outletPagination.pageSize,
    undefined,
    selectedDate || undefined,
    false, // Use pagination
    isModalOpen && !!selectedDate && !!routePlanId // Only fetch when modal is open and date is selected
  );

  const routePlan = routePlanData?.data;
  const salesPersonName = routePlan?.userInfo?.name || routePlan?.userName || 'Sales Person';
  const salesPersonCoordinates = useMemo(() => {
    const coordinates = routePlan?.userInfo?.userAddress?.location?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return null;
    }

    const [longitude, latitude] = coordinates;
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      return null;
    }

    return [latitude, longitude] as [number, number];
  }, [routePlan?.userInfo?.userAddress?.location?.coordinates]);
  // Filter API items strictly to the selected date (backend may return adjacent dates)
  const outletVisitOrders = useMemo(() => {
    const items = outletVisitOrdersData?.data?.items || [];
    if (!selectedDate) return items;
    const toYyyyMmDd = (d: string | Date) => {
      const date = new Date(d);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    // 1) Strict date filter
    const sameDate = items.filter((it: any) => {
      const apiDate = it?.visitDate ? toYyyyMmDd(it.visitDate) : undefined;
      return apiDate === selectedDate;
    });
    // 2) Deduplicate by outletId (keep first occurrence)
    const seen = new Set<string>();
    const uniqueByOutlet = sameDate.filter((it: any) => {
      const id = it?.outletId;
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return uniqueByOutlet;
  }, [outletVisitOrdersData?.data?.items, selectedDate]);

  // Transform route plan journey plan data into outlet visit records
  const outletVisitRecords = useMemo(() => {
    if (!routePlan?.journeyPlan) return [];

    const journeyPlan = routePlan.journeyPlan;

    // Filter by day if provided
    const filteredJourneyPlan = day
      ? journeyPlan.filter((jp) => {
        if (!jp.visitDate) return false;
        const visitDate = new Date(jp.visitDate);
        return visitDate.getDay().toString() === day;
      })
      : journeyPlan;

    // Convert journey plan to ExtendedOutletVisitRecord format
    const records: ExtendedOutletVisitRecord[] = filteredJourneyPlan
      .filter((dayPlan) => dayPlan.visitDate) // Ensure visitDate exists
      .map((dayPlan) => {
        const date = new Date(dayPlan.visitDate!);
        const dateKey = format(date, 'yyyy-MM-dd');

        return {
          id: `date-${dateKey}`,
          date: dateKey,
          formattedDate: format(date, 'MMM dd, yyyy'),
          numberOfOutlets: dayPlan.outlets?.length || 0,
          totalTravelDistInMeters: dayPlan.totalTravelDistInMeters,
          totalTravelTimeInSecs: dayPlan.totalTravelTimeInSecs,
          selectedOutlets: dayPlan.outlets?.map((outlet) => ({
            outletId: outlet.outletId,
            outletName: outlet.outletName,
            location: outlet.location,
            warehouseId: routePlan.warehouseId?.[0]?.warehouseId || '',
            index: outlet.index || 0,
          })) || [],
        };
      });

    return records.sort((a, b) => a.date.localeCompare(b.date));
  }, [routePlan, day]);

  const handleViewRecord = (record: ExtendedOutletVisitRecord) => {
    setCurrentViewingRecord(record);
    // Format date as yyyy-MM-dd for API
    const date = new Date(record.date);
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(formattedDate);
    setOutletPagination({ pageIndex: 0, pageSize: 10 }); // Reset pagination when opening modal
    setIsModalOpen(true);
  };

  const handleDeleteRecord = () => {
    // View only - no delete action
  };

  const handleOutletsSelect = () => {
    // View only - close modal
    setIsModalOpen(false);
    setCurrentViewingRecord(null);
    setSelectedDate(null);
    setOutletPagination({ pageIndex: 0, pageSize: 10 }); // Reset pagination
  };

  // Convert outlet visit orders to modal outlet format
  const preloadedOutlets = useMemo(() => {
    // Use API data if available, otherwise fallback to record data
    if (outletVisitOrders.length > 0) {
      return outletVisitOrders.map((order) => ({
        _id: order.outletId,
        outletId: order.outletId,
        outletName: order.outletName,
        phoneNumber: order.outletInfo?.phoneNumber || '-',
        outletImageUrl: null,
        outletStatus: (order.outletInfo?.outletStatus as any) || 'active',
        visitOrderStatus: (order.visitOrderStatus as any) || 'pending',
        outletAddress: {
          location: {
            type: 'Point' as const,
            coordinates: (order.location?.coordinates || [0, 0]) as [number, number],
          },
          streetAddress: order.outletInfo?.outletAddress?.streetAddress || 'Address not available',
        },
        isDeleted: false,
        verificationDocuments: [],
        createdAt: order.createdAt || '',
        updatedAt: order.updatedAt || '',
        outletStoreSqFtId: order.outletInfo?.outletStoreSqFtId || '',
        area: '',
        district: '',
        state: '',
        ownerName: order.outletInfo?.ownerName || '',
        warehouseId: order.warehouseId,
      }));
    }

    if (!currentViewingRecord?.selectedOutlets) return [];

    return currentViewingRecord.selectedOutlets.map((outlet) => ({
      _id: outlet.outletId,
      outletId: outlet.outletId,
      outletName: outlet.outletName,
      phoneNumber: '-',
      outletImageUrl: null,
      outletStatus: 'active' as const,
      visitOrderStatus: 'pending' as const,
      outletAddress: {
        location: {
          type: 'Point' as const,
          coordinates: (outlet.location?.coordinates || [0, 0]) as [number, number],
        },
        streetAddress: 'Address not available',
      },
      isDeleted: false,
      verificationDocuments: [],
      createdAt: '',
      updatedAt: '',
      outletStoreSqFtId: '',
      area: '',
      district: '',
      state: '',
      ownerName: '',
      warehouseId: outlet.warehouseId,
    }));
  }, [outletVisitOrders, currentViewingRecord]);

  if (isLoading) {
    return (
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-3 rounded-lg bg-card">
          <BreadcrumbHeader {...breadcrumb} />
        </div>
        <div className="flex h-64 items-center justify-center rounded-lg bg-card">
          <GenericPageLoading inline={true} loadingText="Loading journey plan..." />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-3 rounded-lg bg-card">
          <BreadcrumbHeader {...breadcrumb} />
        </div>
        <div className="flex h-64 items-center justify-center rounded-lg bg-card">
          <GenericError text="Error loading journey plan. Please try again." />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-3 rounded-lg bg-card">
        <BreadcrumbHeader {...breadcrumb} />
      </div>

      <div className="rounded-lg bg-card p-4">
        <div className="bg-background mb-6 rounded-lg p-3 text-lg font-medium">
          Sales Person PJP View
        </div>

        {/* PJP Configuration */}
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">PJP Configuration</h3>
            <Button
              onClick={() => setIsMapModalOpen(true)}
              className="flex items-center gap-2"
              disabled={!routePlan || !routePlan.journeyPlan || routePlan.journeyPlan.length === 0}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              View on Map
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* User */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">User</label>
              <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                {salesPersonName}
              </div>
            </div>

            {/* PJP Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">PJP Type</label>
              <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground capitalize">
                {routePlan?.planType || '-'}
              </div>
            </div>

            {/* Visit Period */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Visit Period</label>
              <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                {routePlan?.visitPeriod?.from && routePlan?.visitPeriod?.to
                  ? `${format(new Date(routePlan.visitPeriod.from), 'MMM dd, yyyy')} - ${format(new Date(routePlan.visitPeriod.to), 'MMM dd, yyyy')}`
                  : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Outlet Visit Table */}
      {outletVisitRecords.length > 0 ? (
        <OutletVisitTable
          outletVisitRecords={outletVisitRecords}
          onViewRecord={handleViewRecord}
          onDeleteRecord={handleDeleteRecord}
          isDeleteDisabled={true} // Always disabled in view mode
          showAssignedAreas={false} // Hide assigned areas for auto PJP
        />
      ) : (
        <div className="flex h-64 items-center justify-center rounded-lg bg-card">
          <EmptyState text="No outlets found in the journey plan." />
        </div>
      )}

      {/* Outlet Multi-Selector Modal - View Only */}
      <OutletMultiSelectorModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setSelectedDate(null);
            setCurrentViewingRecord(null);
            setOutletPagination({ pageIndex: 0, pageSize: 10 });
          }
        }}
        onOutletsSelect={handleOutletsSelect}
        selectedOutletIds={
          outletVisitOrders.length > 0
            ? outletVisitOrders.map((order) => order.outletId)
            : currentViewingRecord?.selectedOutlets?.map((outlet) => outlet.outletId) || []
        }
        excludedOutletIds={[]}
        userId={routePlan?.userId || ''}
        warehouseId={routePlan?.warehouseId?.[0]?.warehouseId || undefined}
        viewOnly={true}
        preloadedOutlets={preloadedOutlets}
        totalItems={outletVisitOrdersData?.data?.totalItems}
        totalPages={outletVisitOrdersData?.data?.totalPages}
        isLoadingOutlets={isLoadingOutletOrders}
        onPaginationChange={setOutletPagination}
        initialPagination={outletPagination}
      />

      {/* Map Route Plan Modal */}
      <MapRoutePlanSalesView
        open={isMapModalOpen}
        onOpenChange={setIsMapModalOpen}
        routePlan={routePlan || null}
        salesPersonCoordinates={salesPersonCoordinates}
      />
    </section>
  );
};

export default SalesPersonViewPage;
