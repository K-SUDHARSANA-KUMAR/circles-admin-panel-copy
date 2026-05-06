'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { columns } from '@/components/data-tables/outlets/columns';
import { Action } from '@/components/data-tables/util/types';
import {
  LocationFilters,
  LocationFilters as LocationFiltersType,
} from '@/components/shared/location-filters';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { SearchInput } from '@/components/ui/search-input';
import { DataTable } from '@/components/ui/data-table';
import GenericPageError from '@/components/shared/generic-page-error';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import {
  useOutlets,
  normalizeOutlet,
} from '@/features/dashboard/outlets/hooks/useOutlets';
import { useAppSelector } from '@/store/hooks';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';
import { PaginationState } from '@tanstack/react-table';
import ApprovalModal from '@/components/modals/approval-modal';
import OutletsTab from '@/components/tabs/outlets/outlet-tabs';
import { toast } from 'sonner';
import NavKeys from '@/constants/navkeys';
import PageHeader from '@/components/shared/page-header';

const OutletApprovalPage = () => {
  return (
    <RequirePermission module="outlets">
      <OutletApprovalContent />
    </RequirePermission>
  );
};

function OutletApprovalContent() {
  const router = useRouter();
  const [locationFilters, setLocationFilters] = useState<LocationFiltersType>(
    {}
  );
  const [businessTypeId, setBusinessTypeId] = useState('');
  const [search, setSearch] = useState('');
  const [approvalOutletOpen, setApprovalOutletOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const { recordMaps } = useAppSelector((state) => state.masterRecords);
  const { warehouseMap } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);
  const outletPermission = usePermissionChecker('outlet-approval');
  const [selectedOutlet, setSelectedOutlet] = useState<any>(null);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);

  // Reset pagination when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [
    businessTypeId,
    search,
    locationFilters.divisionId,
    locationFilters.channelId,
    locationFilters.zoneId,
    locationFilters.subZoneId,
  ]);

  const { outlets } = useOutlets({
    ...(locationFilters.warehouseIds &&
      locationFilters.warehouseIds.length > 0 && {
        warehouseId: JSON.stringify(locationFilters.warehouseIds),
      }),
    ...(locationFilters.divisionId &&
      locationFilters.divisionId.length > 0 && {
        divisionId: JSON.stringify(locationFilters.divisionId),
      }),
    ...(locationFilters.channelId &&
      locationFilters.channelId.length > 0 && {
        channelId: JSON.stringify(locationFilters.channelId),
      }),
    ...(locationFilters.zoneId &&
      locationFilters.zoneId.length > 0 && {
        zoneId: JSON.stringify(locationFilters.zoneId),
      }),
    ...(locationFilters.subZoneId &&
      locationFilters.subZoneId.length > 0 && {
        subZoneId: JSON.stringify(locationFilters.subZoneId),
      }),
    ...(businessTypeId && { businessTypeId }),
    status: 'pending', // Always send pending
    ...(search && { search }),
    ...(user?.userId && { approverId: user.userId }),
    ...(user?.roleId && { approverRoleId: user.roleId }),
    // Remove skip and limit since backend returns all data
    // skip: pagination.pageIndex * pagination.pageSize,
    // limit: pagination.pageSize,
  });

  // No need to fetch approval data here anymore - the modal will handle it internally


  const handleEdit = (outlet: any) => {
    router.push(
      `${NavKeys.OutletCreation}?mode=view&outletId=${outlet.outletId}`
    );
  };

  const handleViewLogs = (outlet: any) => {
    router.push(`/dashboard/outlets/outlet/logs?outletId=${outlet.outletId}`);
  };

  const handleApprovalModal = (outlet: any) => {
    setSelectedOutlet(outlet);
    setSelectedOutletId(outlet.outletId);
    setApprovalOutletOpen(true);
  };

  const handleApprovalSuccess = () => {
    // Refresh the outlets data after successful approval/rejection
    outlets.refetch();
  };

  const getActionsForOutlet = useCallback(
    (outlet: any): Action[] => {
      const actions: Action[] = [];

      if (outletPermission.has('edit')) {
        actions.push({
          title: 'View',
          handleAction: () => handleEdit(outlet),
        });
      }

      if (outletPermission.has('edit')) {
        actions.push({
          title: 'Approve',
          handleAction: () => handleApprovalModal(outlet),
        });
      }

      if (outletPermission.has('log')) {
        actions.push({
          title: 'Logs',
          handleAction: () => handleViewLogs(outlet),
        });
      }

      return actions;
    },
    [outletPermission]
  );

  const handlePaginationChange = (newPagination: PaginationState) => {
    console.log('🔄 Pagination changing from:', pagination, 'to:', newPagination);
    
    const totalItems = outlets.data?.data?.items?.length || 0;
    const maxPageIndex = Math.max(0, Math.ceil(totalItems / newPagination.pageSize) - 1);
    
    // Prevent going beyond the last page
    if (newPagination.pageIndex > maxPageIndex) {
      newPagination.pageIndex = maxPageIndex;
    }
    
    setPagination(newPagination);
  };

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Outlets" />

      <div className="w-full space-y-4 rounded-lg bg-white p-4">
        <OutletsTab />
        <div>
          <div className="flex flex-col justify-between gap-10 pb-4 md:flex-row">
            <div className="w-full md:w-[35%]">
              <SearchInput
                placeholder="Search Outlets"
                staticPrefix="Search by"
                rotatingWords={['Outlet Name', 'Owner Name', 'Phone Number']}
                className="w-full"
                value={search}
                onChange={setSearch}
              />
            </div>
          </div>

          {/* Location Filters */}
          <LocationFilters
            filters={locationFilters}
            onFiltersChange={setLocationFilters}
            showWarehouse={true}
            className="mb-4 w-full"
          />

          {/* Outlet Specific Filters */}
          <div className="space-y-4">
            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {/* Business Type */}
              <MasterRecordDropdown
                masterName="businessType"
                value={businessTypeId}
                onChange={setBusinessTypeId}
                placeholder="Business Type"
                className="w-full"
              />
            </div>
          </div>
        </div>
        <DataTable
          columns={columns(
            {
              businessType: recordMaps.businessType || {},
              warehouseMap: recordMaps.warehouse || {},
              beat: recordMaps.beat || {},
              paymentMode: recordMaps.paymentMode || {},
            },
            warehouseMap,
            getActionsForOutlet,
            pagination.pageIndex,
            pagination.pageSize
          )}
          data={
            (() => {
              const allItems = outlets.data?.data?.items?.map((outlet: any) =>
                normalizeOutlet(outlet)
              ) || [];
              
              // Client-side pagination as workaround for backend issue
              const startIndex = pagination.pageIndex * pagination.pageSize;
              const endIndex = startIndex + pagination.pageSize;
              
              const paginatedItems = allItems.slice(startIndex, endIndex);
              
              console.log('📊 Pagination Debug:', {
                totalItems: allItems.length,
                pageIndex: pagination.pageIndex,
                pageSize: pagination.pageSize,
                startIndex,
                endIndex,
                paginatedItemsCount: paginatedItems.length,
              });
              
              return paginatedItems;
            })()
          }
          pageCount={Math.max(1, Math.ceil((outlets.data?.data?.items?.length || 0) / pagination.pageSize))}
          totalItems={outlets.data?.data?.items?.length || 0}
          onPaginationChange={handlePaginationChange}
          manualPagination={true}
          initialPagination={pagination}
          isLoading={outlets.isLoading}
          loadingText="Loading outlets..."
          tableId="outlet-approval-table"
        />
        {outlets.error && (
          <div className="flex h-64 items-center justify-center">
            <GenericPageError
              title="Outlets"
              errorText="Error loading outlets. Please try again."
              inline={true}
            />
          </div>
        )}
        <ApprovalModal
          open={approvalOutletOpen}
          onOpenChange={setApprovalOutletOpen}
          entityId={selectedOutletId || ''}
          entityType="outlets"
          approverId={user?.userId || ''}
          approverRoleId={user?.roleId || ''}
          entityName={selectedOutlet?.outletName}
          status="pending"
          isLoading={outlets.isLoading}
          onSuccess={handleApprovalSuccess}
        />
      </div>
    </section>
  );
}

export default OutletApprovalPage;
