'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { columns } from '@/components/data-tables/outlets/columns';
import { Action } from '@/components/data-tables/util/types';
import ApprovalModal from '@/components/modals/approval-modal';
// Removed import for deleted approve-outlet-modal
import BulkUpload from '@/components/modals/outlets/bulk-upload';
import { OutletStockAuditModal } from '@/components/modals/outlets/outlet-stock-audit-modal';
import OutletBeatMapModal from '@/components/modals/outlets/outlet-beat-map-modal';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { PlusIcon, FileTextIcon, MapIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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
  const [isGstOutlet, setIsGstOutlet] = useState<string>('all');
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
  const [mapModalOpen, setMapModalOpen] = useState(false);

  const { recordMaps } = useAppSelector((state) => state.masterRecords);
  const { warehouseMap } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);

  const outletPermission = useOptimizedPermissionChecker();
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
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
    isGstOutlet,
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

  const { outlets, bulkUpload, downloadErrorFile } = useOutlets({
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
    ...(isGstOutlet !== 'all' && { isGstOutlet: isGstOutlet === 'true' }),
    outletStatus: JSON.stringify(getStatusFilter()),
    ...(search && { search }),
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
    ...(isGstOutlet !== 'all' && { isGstOutlet: isGstOutlet === 'true' }),
    outletStatus: JSON.stringify([
      OutletStatusEnum.ACTIVE,
      OutletStatusEnum.PENDING,
      OutletStatusEnum.SUSPENDED,
    ]),
    ...(search && { search }),
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

  // Check if exactly one warehouse is selected
  const selectedWarehouseId = locationFilters.warehouseIds?.length === 1 ? locationFilters.warehouseIds[0] : null;
  // Don't access warehouseMap here to prevent API call - let modal fetch warehouse details

  const onViewBulkUpload = (record: any) => {
    setBulkUploadOpen(true);
  };

  const handleViewOnMap = () => {
    setMapModalOpen(true);
  };

  const handleBulkUpload = async (file: File) => {
    try {
      console.log('Starting bulk upload for file:', file.name, file.size);
      const result = await bulkUpload.mutateAsync(file);
      console.log('=== BULK UPLOAD RESULT ===');
      console.log('Full result object:', result);
      console.log('Result structure:', {
        successCount: result?.successCount,
        errorCount: result?.errorCount,
        errorFileId: result?.errorFileId,
        message: result?.message,
        errorFileBlob: result?.errorFileBlob
      });
      console.log('========================');

      // Check if there are errors and an error file blob in the response
      if ((result?.errorCount ?? 0) > 0 && result?.errorFileBlob) {
        console.log('Conditions met for error file download');
        console.log('Error count:', result.errorCount);
        console.log('Error file blob received:', result.errorFileBlob);

        toast.success(`Upload completed! ${result.successCount || 0} outlets created successfully. ${result.errorCount} records had errors. Downloading error file...`);

        // Automatically download error file from the same response
        console.log('Triggering error file download from response...');
        try {
          // Handle ArrayBuffer response
          const blob = new Blob([result.errorFileBlob], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });

          // Create download with custom filename
          const currentDate = new Date();
          const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          const timeString = currentDate.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
          const fileName = `Outlet_Bulk_Upload_Errors_${dateString}_${timeString}.xlsx`;

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          console.log('Error file download completed successfully');
          console.log('Downloaded file name:', fileName);
        } catch (downloadError) {
          console.error('Error during file download:', downloadError);
          toast.error('Failed to download error file');
        }
      } else if ((result?.errorCount ?? 0) > 0 && result?.errorFileId) {
        // Fallback: If errorFileBlob is not available but errorFileId is
        console.log('Using fallback download with errorFileId');
        if (downloadErrorFile) {
          downloadErrorFile.mutate(result.errorFileId);
        }
      } else {
        console.log('Conditions NOT met for error file download');
        console.log('Error count:', result?.errorCount);
        console.log('Error file blob:', result?.errorFileBlob);
        console.log('Error file ID:', result?.errorFileId);

        if ((result?.successCount ?? 0) > 0) {
          toast.success(`${result.successCount} outlets uploaded successfully!`);
        } else {
          toast.success(result?.message || 'Bulk upload completed!');
        }
      }
    } catch (error: any) {
      console.error('Bulk upload error:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Failed to upload outlets');
    }
  };

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

        actions.push({
          title: 'Edit',
          handleAction: () => router.push(
            `${NavKeys.OutletCreation}?mode=edit&outletId=${outlet.outletId}`
          ),
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
    [outletPermission, router]
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
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button
                      onClick={handleViewOnMap}
                      variant="secondary"
                      className="flex items-center gap-2"
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
              <Button onClick={onViewBulkUpload} variant="secondary">
                Bulk Upload
              </Button>
              {outletPermission.has('outlets', 'create') && (
                <Button onClick={() => router.push(NavKeys.OutletCreation)}>
                  <PlusIcon className="h-4 w-4" />
                  Add Outlet
                </Button>
              )}
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

              {/* GST Filter */}
              <Select value={isGstOutlet} onValueChange={setIsGstOutlet}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="GST Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outlets</SelectItem>
                  <SelectItem value="true">Gst Outlets</SelectItem>
                  <SelectItem value="false">Non GST Outlets</SelectItem>
                </SelectContent>
              </Select>
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
        <BulkUpload
          open={bulkUploadOpen}
          onOpenChange={setBulkUploadOpen}
          onBulkUpload={handleBulkUpload}
          isUploading={bulkUpload.isPending}
        />
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
        {selectedWarehouseId && (
          <OutletBeatMapModal
            open={mapModalOpen}
            onOpenChange={setMapModalOpen}
            warehouseId={selectedWarehouseId}
            warehouseName="" // Let modal fetch warehouse details
            filters={{
              divisionId: locationFilters.divisionId,
              channelId: locationFilters.channelId,
              zoneId: locationFilters.zoneId,
              subZoneId: locationFilters.subZoneId,
              businessTypeId: businessTypeId,
              outletStatus: getStatusFilter(),
              search: search,
            }}
          />
        )}
      </div>
    </section>
  );
}

export default OutletPage;
