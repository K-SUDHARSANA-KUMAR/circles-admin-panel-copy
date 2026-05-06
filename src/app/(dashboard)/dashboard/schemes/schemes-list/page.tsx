'use client';

import { createColumns } from '@/components/data-tables/schemes/columns';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { StatusDropdown } from '@/components/shared/status-dropdown';
import { ApprovalStatusEnum, SchemeStatusEnum } from '@/constants/enums/scheme.enums';
import EmptyState from '@/components/ui/empty-state';
import Loading from '@/components/ui/loading';
import { PlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  useSchemes,
  useUpdateSchemeStatus,
} from '@/features/dashboard/schemes/hooks/useSchemes';
import { toast } from 'sonner';
import ApprovalModal from '@/components/modals/approval-modal';
import { useAppSelector } from '@/store/hooks';
import SchemesTab from '@/components/tabs/schemes/schemes-tabs';
import PageHeader from '@/components/shared/page-header';
import { pagetittleConfig } from '@/constants/pagetittle-config';
import { PaginationState } from '@tanstack/react-table';
import NavKeys from '@/constants/navkeys';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';
import { RequirePermission } from '@/components/auth/require-permission';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { LocationFilters, LocationFilters as LocationFiltersType } from '@/components/shared/location-filters';

const SchemesListPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.SCHEMES} action={MENU_RIGHTS.VIEW}>
      <SchemesListContent />
    </RequirePermission>
  );
};

const SchemesListContent = () => {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const permission = useOptimizedPermissionChecker();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const [locationFilters, setLocationFilters] = useState<LocationFiltersType>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<any>(null);

  const SCHEME_STATUS_FILTER = {
    ACTIVE: SchemeStatusEnum.ACTIVE,
    INACTIVE: SchemeStatusEnum.INACTIVE,
    PENDING: SchemeStatusEnum.PENDING,
    IN_REVIEW: SchemeStatusEnum.IN_REVIEW,
    REJECTED: SchemeStatusEnum.REJECTED,
  };

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // API hooks
  const {
    data: schemesData,
    isLoading,
    error,
  } = useSchemes({
    search: debouncedSearch || undefined,
    status: selectedStatus ? selectedStatus.toLowerCase() : undefined,
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
    // Location-based filters (serialized as JSON arrays when present)
    ...(locationFilters.warehouseIds && locationFilters.warehouseIds.length > 0 && { warehouseId: JSON.stringify(locationFilters.warehouseIds) }),
    ...(locationFilters.divisionId && locationFilters.divisionId.length > 0 && { divisionId: JSON.stringify(locationFilters.divisionId) }),
    ...(locationFilters.channelId && locationFilters.channelId.length > 0 && { channelId: JSON.stringify(locationFilters.channelId) }),
    ...(locationFilters.zoneId && locationFilters.zoneId.length > 0 && { zoneId: JSON.stringify(locationFilters.zoneId) }),
    ...(locationFilters.subZoneId && locationFilters.subZoneId.length > 0 && { subZoneId: JSON.stringify(locationFilters.subZoneId) }),
  });

  const updateStatusMutation = useUpdateSchemeStatus();

  const handleAddScheme = () => {
    router.push(NavKeys.SchemesCreation);
  };

  const handleEdit = (scheme: any) => {
    router.push(
      `${NavKeys.SchemesCreation}?mode=edit&schemeId=${scheme.schemeId}`
    );
  };

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [selectedStatus, debouncedSearch, locationFilters]);

  const handleStatusChange = async (
    scheme: any,
    newStatus: 'DRAFT' | 'ACTIVE' | 'INACTIVE'
  ) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: scheme.schemeId,
        status: newStatus,
      });
      toast.success(`Scheme status updated to ${newStatus}`);
    } catch (error: any) {
      console.error('Status update error:', error);

      let errorMessage = 'Failed to update scheme status';

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, {
        duration: 5000,
      });
    }
  };

  const handleViewApprovals = (scheme: any) => {
    setSelectedScheme(scheme);
    setApprovalModalOpen(true);
  };

  const schemes = Array.isArray(schemesData?.data?.items)
    ? schemesData?.data?.items
    : [];

  const enhancedSchemes = schemes?.map((scheme: any) => ({
    ...scheme,
    onEdit: () => handleEdit(scheme),
    onStatusChange: (status: 'DRAFT' | 'ACTIVE' | 'INACTIVE') =>
      handleStatusChange(scheme, status),
    onViewApprovals: () => handleViewApprovals(scheme),
  }));

  if (error) {
    return (
      <section className="w-full space-y-6">
        <PageHeader title={pagetittleConfig.schemes?.pageTitle || 'Schemes'} />
        <div className="flex h-64 items-center justify-center">
          <EmptyState text="Error loading schemes. Please try again." />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <PageHeader title={pagetittleConfig.schemes?.pageTitle || 'Schemes'} />
      <div className="w-full space-y-3 rounded-lg bg-white p-4">
        <SchemesTab />
        <div>
          <div className="flex flex-col justify-between gap-10 pb-4 md:flex-row">
            <div className="w-full md:w-[35%]">
              <Input
                placeholder="Search Scheme name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              {permission.has(PERMISSIONS.SCHEMES, MENU_RIGHTS.CREATE) && (
                <Button onClick={handleAddScheme}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Scheme
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
              {/* Status */}
              <StatusDropdown
                value={selectedStatus}
                onChange={setSelectedStatus}
                statusEnum={SCHEME_STATUS_FILTER}
                placeholder="Status"
                className="w-full "
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loading text="Loading schemes..." />
          </div>
        ) : enhancedSchemes && enhancedSchemes?.length > 0 ? (
          <DataTable
            columns={createColumns(
              pagination.pageIndex,
              pagination.pageSize,
              permission
            )}
            data={enhancedSchemes || []}
            pageCount={schemesData?.data?.totalPages}
            totalItems={schemesData?.data?.totalItems}
            onPaginationChange={handlePaginationChange}
            manualPagination={true}
            initialPagination={pagination}
            isLoading={isLoading}
            loadingText="Loading schemes..."
            tableId="schemes-table"
          />
        ) : (
          <div className="flex h-64 items-center justify-center">
            <EmptyState text="No schemes found. Start by adding your first scheme." />
          </div>
        )}
      </div>

      <ApprovalModal
        open={approvalModalOpen}
        onOpenChange={(open) => {
          setApprovalModalOpen(open);
          if (!open) setSelectedScheme(null);
        }}
        entityId={selectedScheme?.schemeId ?? ''}
        entityType="schemes"
        approverId={user?.userId || ''}
        approverRoleId={user?.roleId || ''}
        entityName={selectedScheme?.schemeName}
        status={ApprovalStatusEnum?.PENDING ?? 'pending'}
        onSuccess={() => {
          setApprovalModalOpen(false);
          setSelectedScheme(null);
        }}
      />
    </section>
  );
};

export default SchemesListPage;
