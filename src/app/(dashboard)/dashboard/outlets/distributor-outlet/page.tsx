'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { columns } from '@/components/data-tables/outlets/columns';
import { Action } from '@/components/data-tables/util/types';
import ApprovalModal from '@/components/modals/approval-modal';
// Removed import for deleted approve-outlet-modal
import { OutletStockAuditModal } from '@/components/modals/outlets/outlet-stock-audit-modal';
import GenericPageError from '@/components/shared/generic-page-error';
import {
  LocationFilters,
  LocationFilters as LocationFiltersType,
} from '@/components/shared/location-filters';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import PageHeader from '@/components/shared/page-header';
import OutletsTab from '@/components/tabs/outlets/outlet-tabs';
import { OutletStatusTabs } from '@/components/tabs/outlets/outlet-status-tabs';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { OutletStatusEnum } from '@/constants/enums/outlet.enums';
import NavKeys from '@/constants/navkeys';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import {
  normalizeOutlet,
  useOutlets,
} from '@/features/dashboard/outlets/hooks/useOutlets';
import { useAppSelector } from '@/store/hooks';
import { PaginationState } from '@tanstack/react-table';
import { FileTextIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const OutletPage = () => {
  return (
    <RequirePermission module="outlets">
      <OutletContent />
    </RequirePermission>
  );
};

function OutletContent() {
  const router = useRouter();
  const [locationFilters, setLocationFilters] = useState<LocationFiltersType>(
    {}
  );
  const [businessTypeId, setBusinessTypeId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [approvalOutletOpen, setApprovalOutletOpen] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<any>(null);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [stockAuditOpen, setStockAuditOpen] = useState(false);
  const [stockAuditProducts, setStockAuditProducts] = useState<any[]>([]);

  const { recordMaps } = useAppSelector((state) => state.masterRecords);
  const { warehouseMap } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);

  const outletPermission = useOptimizedPermissionChecker();
  const queryClient = useQueryClient();

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [
    businessTypeId,
    selectedStatus,
    search,
    locationFilters.divisionId,
    locationFilters.channelId,
    locationFilters.zoneId,
    locationFilters.subZoneId,
  ]);

  const getStatusFilter = () => {
    if (selectedStatus === 'all') {
      return [
        OutletStatusEnum.ACTIVE,
        OutletStatusEnum.PENDING,
        OutletStatusEnum.SUSPENDED,
      ];
    }
    return [selectedStatus];
  };

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
    outletStatus: JSON.stringify(getStatusFilter()),
    ...(search && { search }),
    outletType: 'distributor-outlet',
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
    userId: user?.userId,
    showMetrics: true,
  });

  // Fetch metrics separately with all statuses to get counts
  const { outlets: metricsData } = useOutlets({
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
    outletStatus: JSON.stringify([
      OutletStatusEnum.ACTIVE,
      OutletStatusEnum.PENDING,
      OutletStatusEnum.SUSPENDED,
    ]),
    ...(search && { search }),
    outletType: 'distributor-outlet',
    skip: 0,
    limit: 1,
    userId: user?.userId,
    showMetrics: true,
  });

  const currentUserRoleId = user?.roleId || '';
  const isCurrentApprover = selectedOutlet?.approvers?.some(
    (a: { roleId: string; approvedStatus: string }) =>
      a.roleId === currentUserRoleId && a.approvedStatus === 'pending'
  );
  const isSuspended = selectedOutlet?.approvers?.some(
    (a: { approvedStatus: string }) => a.approvedStatus === 'suspended'
  );



  const handleEdit = (outlet: any) => {
    router.push(
      `${NavKeys.OutletCreation}?mode=view&outletId=${outlet.outletId}`
    );
  };

  const handleViewLogs = (outlet: any) => {
    router.push(
      `/dashboard/outlets/outlet/logs?outletId=${outlet.outletId}`
    );
  };

  const handleApprovalModal = (outlet: any) => {
    setSelectedOutlet(outlet);
    setSelectedOutletId(outlet.outletId);
    setApprovalOutletOpen(true);
  };


  const handleStockAudit = (outlet: any) => {
    setSelectedOutlet(outlet);
    setStockAuditProducts(outlet.products || []);
    setStockAuditOpen(true);
  };

  const handleViewInvoices = (outlet: any) => {
    router.push(`${NavKeys.Invoices}?outletId=${outlet.outletId}`);
  };

  const getActionsForOutlet = useCallback(
    (outlet: any): Action[] => {
      const actions: Action[] = [];

      if (outletPermission.has(PERMISSIONS.OUTLETS, MENU_RIGHTS.EDIT)) {
        actions.push({
          title: 'View',
          handleAction: () => handleEdit(outlet),
        });
      }

      if (outletPermission.has(PERMISSIONS.OUTLETS, MENU_RIGHTS.EDIT)) {
        actions.push({
          title: 'Approve',
          handleAction: () => handleApprovalModal(outlet),
        });
      }

      if (outletPermission.has(PERMISSIONS.OUTLETS, MENU_RIGHTS.LOG)) {
        actions.push({
          title: 'Logs',
          handleAction: () => handleViewLogs(outlet),
        });
      }

      if (outletPermission.has(PERMISSIONS.OUTLETS, MENU_RIGHTS.STOCK_AUDIT)) {
        actions.push({
          title: 'Stock Audit',
          handleAction: () => handleStockAudit(outlet),
        });
      }

      if (outletPermission.has(PERMISSIONS.INVOICES, MENU_RIGHTS.VIEW)) {
        actions.push({
          title: 'Invoices',
          handleAction: () => handleViewInvoices(outlet),
        });
      }

      return actions;
    },
    [outletPermission]
  );

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    // Invalidate and refetch outlets when status changes
    queryClient.invalidateQueries({ queryKey: ['outlets'] });
  };

  // Create the expected MasterRecordMaps structure
  const masterRecordMaps = {
    businessType: recordMaps.businessType || {},
    warehouseMap: recordMaps.warehouse || {},
    beat: recordMaps.beat || {},
    paymentMode: recordMaps.paymentMode || {},
  };

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Outlets" />

      <div className="w-full space-y-4 rounded-lg bg-white p-4">
        <OutletsTab />
        <OutletStatusTabs
          currentStatus={selectedStatus}
          onStatusChange={handleStatusChange}
          className="mb-4"
          metrics={metricsData?.data?.data?.metrics}
        />
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

        {outlets.error ? (
          <GenericPageError
            title="Outlets"
            errorText="Error loading outlets. Please try again."
            inline={true}
          />
        ) : (
          <DataTable
            columns={columns(
              masterRecordMaps,
              warehouseMap,
              getActionsForOutlet,
              pagination.pageIndex,
              pagination.pageSize
            )}
            data={
              outlets.data?.data?.items?.map((outlet: any) =>
                normalizeOutlet(outlet)
              ) || []
            }
            pageCount={outlets.data?.data?.totalPages}
            totalItems={outlets.data?.data?.totalItems}
            onPaginationChange={handlePaginationChange}
            manualPagination={true}
            initialPagination={pagination}
            isLoading={outlets.isLoading}
            loadingText="Loading outlets..."
            tableId="outlet-creation-table"
          />
        )}
        <ApprovalModal
          open={approvalOutletOpen}
          onOpenChange={(open) => {
            setApprovalOutletOpen(open);
            if (!open) setSelectedOutlet(null);
          }}
          entityId={selectedOutletId || ''}
          entityType="outlets"
          approverId={user?.userId || ''}
          approverRoleId={user?.roleId || ''}
          entityName={selectedOutlet?.outletName}
          status="pending"
          onSuccess={() => {
            // Refresh the outlets data after successful approval/rejection
            // This will be handled by the modal's internal API call
          }}
        />
        <OutletStockAuditModal
          open={stockAuditOpen}
          onOpenChange={setStockAuditOpen}
          onProductsChange={(products) => {
            setStockAuditOpen(false);
          }}
          initialProducts={stockAuditProducts}
          outletId={selectedOutlet?.outletId || ''}
        />
      </div>
    </section>
  );
}

export default OutletPage;
