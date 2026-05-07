'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { beatColumns } from '@/components/data-tables/outlets/columns';
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
import { CheckboxMultiSelect } from '@/components/shared/checkbox-multiselect';
import OutletsTab from '@/components/tabs/outlets/outlet-tabs';
import { BeatSelectionModal } from '@/components/modals/beat-selection-modal';
import BeatMapModal from '@/components/modals/beat-map-modal';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { OutletStatusEnum, OUTLET_STATUS_OPTIONS } from '@/constants/enums/outlet.enums';
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
import { useQueryClient } from '@tanstack/react-query';

const OutletPage = () => {
  return (
    <RequirePermission module="beats">
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
  const [outletStatus, setOutletStatus] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedBeatId, setSelectedBeatId] = useState<string>('');
  const [selectedBeat, setSelectedBeat] = useState<any>(null);
  const [beatModalOpen, setBeatModalOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [approvalOutletOpen, setApprovalOutletOpen] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<any>(null);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [stockAuditOpen, setStockAuditOpen] = useState(false);
  const [stockAuditProducts, setStockAuditProducts] = useState<any[]>([]);
  const [beatMapOpen, setBeatMapOpen] = useState(false);
  const [outletMapModalOpen, setOutletMapModalOpen] = useState(false);

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
    outletStatus,
    search,
    selectedBeatId,
    locationFilters.divisionId,
    locationFilters.channelId,
    locationFilters.zoneId,
    locationFilters.subZoneId,
  ]);

  // Force refetch when beat selection changes
  useEffect(() => {
    if (selectedBeatId) {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
    }
  }, [selectedBeatId, queryClient]);

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
    ...(outletStatus.length > 0 && { outletStatus: JSON.stringify(outletStatus) }),
    ...(search && { search }),
    ...(selectedBeatId && { beatId: selectedBeatId }),
    isBeat: true,
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
    userId: user?.userId,
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
  const selectedWarehouseName = selectedWarehouseId ? warehouseMap[selectedWarehouseId]?.warehouseName : '';

  const onViewBulkUpload = (record: any) => {
    setBulkUploadOpen(true);
  };

  const handleViewOnMap = () => {
    setOutletMapModalOpen(true);
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
      `${NavKeys.OutletCreation}?mode=view&outletId=${outlet.outletId}&fromBeats=true`
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

  const handleViewMap = () => {
    if (!selectedBeatId) {
      toast.error('Please select a beat first');
      return;
    }
    setBeatMapOpen(true);
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
            `${NavKeys.OutletCreation}?mode=edit&outletId=${outlet.outletId}&fromBeats=true`
          ),
        });
      }

     

      return actions;
    },
    [outletPermission, router]
  );

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
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

      <div className="w-full space-y-4 rounded-lg bg-card p-4">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {/* Business Type */}
              <MasterRecordDropdown
                masterName="businessType"
                value={businessTypeId}
                onChange={setBusinessTypeId}
                placeholder="Business Type"
                className="w-full"
              />

              {/* Beat Filter */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setBeatModalOpen(true)}
                className="w-full justify-between h-10 px-3 py-2 text-left font-normal border border-input bg-card hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <span className="truncate">
                  {selectedBeat ? selectedBeat.beatName : 'Beat'}
                </span>
                <svg
                  className="h-4 w-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"                    
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </Button>

              {/* View in Map Button - Shows beat-specific map */}
              {selectedBeatId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleViewMap}
                  className="w-full justify-center h-10 px-3 py-2 font-normal"
                >
                  <MapIcon className="h-4 w-4 mr-2" />
                  View Beat Map
                </Button>
              )}

              {/* View on Map Button - Shows warehouse outlets with beat management */}
              {selectedWarehouseId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleViewOnMap}
                  className="w-full justify-center h-10 px-3 py-2 font-normal"
                >
                  <MapIcon className="h-4 w-4 mr-2" />
                  View on Map
                </Button>
              )}

              {/* Status */}
              <CheckboxMultiSelect
                options={OUTLET_STATUS_OPTIONS}
                value={outletStatus}
                onChange={setOutletStatus}
                placeholder="Status"
                displayName="status"
                className="w-full"
                searchable={false}
                showSelectAll={false}
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
            columns={beatColumns(
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
        <BeatSelectionModal
          open={beatModalOpen}
          selectedBeatId={selectedBeatId}
          onChange={(beatId, beatData) => {
            setSelectedBeatId(beatId || '');
            setSelectedBeat(beatData || null);
          }}
          onConfirm={() => setBeatModalOpen(false)}
          onCancel={() => setBeatModalOpen(false)}
          initialSelectedOption={selectedBeat}
        />
        <BeatMapModal
          open={beatMapOpen}
          onOpenChange={setBeatMapOpen}
          beatId={selectedBeatId}
        />
        {selectedWarehouseId && (
          <OutletBeatMapModal
            open={outletMapModalOpen}
            onOpenChange={setOutletMapModalOpen}
            warehouseId={selectedWarehouseId}
            warehouseName={selectedWarehouseName}
            filters={{
              divisionId: locationFilters.divisionId,
              channelId: locationFilters.channelId,
              zoneId: locationFilters.zoneId,
              subZoneId: locationFilters.subZoneId,
              businessTypeId: businessTypeId,
              outletStatus: outletStatus,
              search: search,
            }}
          />
        )}
      </div>
    </section>
  );
}

export default OutletPage;
