'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { createColumns } from '@/components/data-tables/pjp/columns';
import { Action } from '@/components/data-tables/util/types';
import PageHeader from '@/components/shared/page-header';
import PjpTab from '@/components/tabs/pjp/pjp-tabs';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { pagetittleConfig } from '@/constants/pagetittle-config';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { usePjp } from '@/features/dashboard/pjp/hooks/usePjp';
import { PaginationState } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { MapIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
// useAppSelector no longer needed as Business Type column is removed
import NavKeys from '@/constants/navkeys';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';
import { toast } from 'sonner';
import { LocationFilters, LocationFilters as LocationFiltersType } from '@/components/shared/location-filters';
import { WarehouseMultiSelectModal } from '@/components/modals/warehouse-multiselect-modal';
import WarehouseMapViewModal from '@/components/modals/warehouse-map-view-modal';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const JourneyPlanPage = () => {
  return (
    <RequirePermission module="pjp">
      <JourneyPlanContent />
    </RequirePermission>
  );
};

const JourneyPlanContent = () => {
  const [locationFilters, setLocationFilters] = useState<LocationFiltersType>({});
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([]);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const permission = useOptimizedPermissionChecker();
  // recordMaps no longer needed as Business Type column is removed

  const hasPjpCreatePermission = permission.has(PERMISSIONS.PJP, MENU_RIGHTS.CREATE);

  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const { optimizePjp } = usePjp();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { routePlans, transformedData, isLoading, error } = usePjp({
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
    search: searchTerm || undefined,
    warehouseIds: locationFilters.warehouseIds && locationFilters.warehouseIds.length > 0 
      ? locationFilters.warehouseIds 
      : undefined,
    divisionId: locationFilters.divisionId && locationFilters.divisionId.length > 0 
      ? JSON.stringify(locationFilters.divisionId) 
      : undefined,
    channelId: locationFilters.channelId && locationFilters.channelId.length > 0 
      ? JSON.stringify(locationFilters.channelId) 
      : undefined,
    zoneId: locationFilters.zoneId && locationFilters.zoneId.length > 0 
      ? JSON.stringify(locationFilters.zoneId) 
      : undefined,
    subZoneId: locationFilters.subZoneId && locationFilters.subZoneId.length > 0 
      ? JSON.stringify(locationFilters.subZoneId) 
      : undefined,
    salesPersonId: locationFilters.salesPersonId || undefined,
  });

  const handleAddNew = () => {
    router.push(NavKeys.PjpCreation);
  };

  const handleOptimizePjp = () => {
    setWarehouseModalOpen(true);
  };

  const handleViewOnMap = () => {
    setMapModalOpen(true);
  };

  const handleWarehouseSelection = (warehouseIds: string[]) => {
    setSelectedWarehouseIds(warehouseIds);
  };

  const handleWarehouseConfirm = async (optimizationParams?: {
    maxOutletPerDay: number;
    outletActivityDuration: number;
    breakHours: number;
    maxTravelDistancePerDay: number;
  }) => {
    try {
      // Close modal first
      setWarehouseModalOpen(false);
      
      // Show loading toast
      toast.loading('Optimizing PJP...', { id: 'optimize-pjp' });
      
      // Prepare payload with warehouse IDs and optimization parameters
      const payload = {
        warehouseIds: selectedWarehouseIds,
        ...optimizationParams,
      };
      
      // Call API with payload
      await optimizePjp.mutateAsync(payload);
      
      // Show success toast
      toast.success('PJP optimization completed successfully!', { id: 'optimize-pjp' });
      
      // Reset selected warehouses
      setSelectedWarehouseIds([]);
      
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to optimize PJP', { id: 'optimize-pjp' });
    }
  };

  const handleWarehouseCancel = () => {
    setWarehouseModalOpen(false);
    setSelectedWarehouseIds([]);
  };

  const handleViewSalesPerson = (record: any) => {
    router.push(
      `${NavKeys.PjpSalesView}?routePlanId=${record.routePlanId}`
    );
  };

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  // Reset pagination when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [locationFilters, searchTerm]);

  // Refetch data when location filters change
  useEffect(() => {
    routePlans.refetch();
  }, [locationFilters.warehouseIds, locationFilters.divisionId, locationFilters.channelId, locationFilters.zoneId, locationFilters.subZoneId, locationFilters.salesPersonId]);

  // Remove client-side filtering since we're now using server-side pagination and filtering
  const pjpData = routePlans?.data?.data;

  const getActionsForPermissions = useCallback(
    (record: any): Action[] => {
      const actions: Action[] = [];

      if (permission.has('pjp', 'view')) {
        actions.push({
          title: 'View',
          href: (record: any) => `${NavKeys.PjpSalesView}?routePlanId=${record.routePlanId}`,
          handleAction: () => handleViewSalesPerson(record),
        });
      }


      if (permission.has('pjp', 'log')) {
        actions.push({
          title: 'Logs',
        });
      }


      return actions;
    },
    [permission]
  );

  return (
    <section className="w-full space-y-6">
      <PageHeader title={pagetittleConfig.pjp.pageTitle} />
      <div className="w-full space-y-3 rounded-lg bg-card p-4">
        <PjpTab />
        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <div className="flex flex-col gap-2 md:flex-row">
            <Input
              placeholder="Search by sales person name, route plan ID, or plan type"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button 
                      onClick={handleViewOnMap}
                      variant="secondary"
                      disabled={
                        !locationFilters.warehouseIds || 
                        locationFilters.warehouseIds.length === 0 || 
                        locationFilters.warehouseIds.length > 1
                      }
                    >
                      <MapIcon className="h-4 w-4" />
                      View on Map
                    </Button>
                  </span>
                </TooltipTrigger>
                {(!locationFilters.warehouseIds || 
                  locationFilters.warehouseIds.length === 0 || 
                  locationFilters.warehouseIds.length > 1) && (
                  <TooltipContent>
                    Select a single warehouse to view map
                  </TooltipContent>
                )}
              </Tooltip>
              <Button 
                onClick={handleOptimizePjp}
                disabled={optimizePjp.isPending}
              >
                {optimizePjp.isPending ? 'Optimizing...' : 'Optimize PJP'}
              </Button>
            </div>
        </div>

        <LocationFilters
          filters={locationFilters}
          onFiltersChange={setLocationFilters}
          showWarehouse={true}
          showSalesPerson={true}
          className="w-full my-4"
        />
        <DataTable
          columns={createColumns(
            undefined,
            getActionsForPermissions,
            pagination.pageIndex,
            pagination.pageSize
          )}
          data={transformedData || []}
          pageCount={pjpData?.totalPages || 0}
          totalItems={pjpData?.totalItems || 0}
          manualPagination={true}
          initialPagination={pagination}
          onPaginationChange={handlePaginationChange}
          isLoading={isLoading}
          loadingText="Loading PJP data..."
          tableId="pjp-table"
        />
      </div>

      <WarehouseMultiSelectModal
        open={warehouseModalOpen}
        selectedWarehouseIds={selectedWarehouseIds}
        onChange={handleWarehouseSelection}
        onConfirm={handleWarehouseConfirm}
        onCancel={handleWarehouseCancel}
        showOptimizationFields={true}
      />

      {mapModalOpen && (
        <WarehouseMapViewModal
          open={mapModalOpen}
          onOpenChange={setMapModalOpen}
          selectedWarehouseIds={locationFilters.warehouseIds}
        />
      )}
    </section>
  );
};

export default JourneyPlanPage;
