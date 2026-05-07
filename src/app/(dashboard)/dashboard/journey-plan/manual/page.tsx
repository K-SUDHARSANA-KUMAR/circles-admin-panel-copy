'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import SpringBoard from '@/components/shared/spring-board';
import PjpTab from '@/components/tabs/pjp/pjp-tabs';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { LocationFilters, LocationFilters as LocationFiltersType } from '@/components/shared/location-filters';
import { StatusDropdown } from '@/components/shared/status-dropdown';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue,} from '@/components/ui/select';
import {
  createManualPjpColumns,
  ManualPjpRecord,
} from '@/components/data-tables/pjp/manual-pjp-columns';
import { useRouter } from 'next/navigation';
import {
  useManualPjp,
  usePjpApprovals,
  useUpdatePjpApprovalStatus,
} from '@/features/dashboard/pjp/hooks/usePjp';
import { PaginationState } from '@tanstack/react-table';
import GenericError from '@/components/shared/generic-page-error';
import { Edit } from 'lucide-react';
import ApprovalModal from '@/components/modals/approval-modal';
import { toast } from 'sonner';
import { useAppSelector } from '@/store/hooks';
import NavKeys from '@/constants/navkeys';
import PageHeader from '@/components/shared/page-header';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { RoutePlannerApprovalStatus } from '@/constants/enums/pjp.enums';

const ManualPjpPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.MANUAL_PJP} action={MENU_RIGHTS.VIEW}>
      <ManualPjpContent />
    </RequirePermission>
  );
};

const ManualPjpContent = () => {
  const permission = useOptimizedPermissionChecker();
  const hasCreatePermission = permission.has(PERMISSIONS.MANUAL_PJP, MENU_RIGHTS.CREATE);
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const [locationFilters, setLocationFilters] = useState<LocationFiltersType>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedPjp, setSelectedPjp] = useState<any>(null);


  const { transformedManualData, isLoading, error, manualRoutePlans } =
    useManualPjp({
      skip: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
      search: searchTerm || undefined,
      routePlanMode: 'manual',
      ...(selectedStatus && { status: selectedStatus }),
      ...(locationFilters.warehouseIds && locationFilters.warehouseIds.length > 0 && {
        warehouseIds: locationFilters.warehouseIds,
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
      ...(locationFilters.salesPersonId && {
        salesPersonId: locationFilters.salesPersonId,
      }),
    });

  const { data: approvalData, isLoading: approvalLoading } = usePjpApprovals(
    selectedPjp?.routePlanId || '',
    user?.userId,
    user?.roleId,
    'pending'
  );

  const updateApprovalStatusMutation = useUpdatePjpApprovalStatus();

  const handleGenerate = () => {
    router.push(NavKeys.ManualPjpCreation);
  };

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  // Reset pagination when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [locationFilters, searchTerm, selectedStatus]);

  const handleEdit = (item: any) => {
    router.push(
      `${NavKeys.ManualPjpCreation}?mode=edit&routePlanId=${item.routePlanId}`
    );
  };

  const handleViewApprovals = (pjp: any) => {
    setSelectedPjp(pjp);
    setApprovalModalOpen(true);
  };

  // Check if current user has already approved/rejected this PJP
  const hasUserAlreadyApproved = approvalData?.data?.[0]?.approvals?.some(
    (approval: any) =>
      approval.roleId === user?.roleId &&
      (approval.approvalStatus === 'approved' ||
        approval.approvalStatus === 'rejected')
  );

  // Check if current user can take action (has pending approval and hasn't already acted)
  const canUserTakeAction =
    approvalData?.data?.[0]?.approvals?.some(
      (approval: any) =>
        approval.roleId === user?.roleId &&
        approval.approvalStatus === 'pending'
    ) && !hasUserAlreadyApproved;

  const handleApprove = async (reason?: string) => {
    if (!selectedPjp || !user?.userId || !user?.roleId) return;

    try {
      await updateApprovalStatusMutation.mutateAsync({
        entityId: selectedPjp.routePlanId,
        approvalStatus: 'approved',
        remarks: reason || '',
        approverId: user.userId,
        roleId: user.roleId,
        entityType: 'manual-pjp',
      });
      toast.success('Manual PJP approved successfully');
    } catch (error) {
      toast.error('Failed to approve Manual PJP');
      throw error;
    }
  };

  const handleReject = async (reason: string) => {
    if (!selectedPjp || !user?.userId || !user?.roleId) return;

    try {
      await updateApprovalStatusMutation.mutateAsync({
        entityId: selectedPjp.routePlanId,
        approvalStatus: 'rejected',
        remarks: reason,
        approverId: user.userId,
        roleId: user.roleId,
        entityType: 'manual-pjp',
      });
      toast.success('Manual PJP rejected successfully');
    } catch (error) {
      toast.error('Failed to reject Manual PJP');
      throw error;
    }
  };

  const columns = createManualPjpColumns(
    (item) => [
      {
        title: 'View/Edit',
        handleAction: handleEdit,
      },
      {
        title: 'Approvals',
        handleAction: handleViewApprovals,
      },
      {
        title: 'Deviation',
        handleAction: (record) => {
          router.push(
            `${NavKeys.Deviations}?routePlanId=${record.routePlanId}`
          );
        },
      },
    ],
    pagination.pageIndex,
    pagination.pageSize
  );
  const manualPjpData = manualRoutePlans?.data?.data;

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Manual Journey Plan" />

      <div className="w-full space-y-3 rounded-lg bg-card p-4">
        <PjpTab />

        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <div className="flex flex-col gap-2 md:flex-row">
            <SearchInput
              placeholder="Search Route Plans"
              value={searchTerm}
              onChange={setSearchTerm}
              rotatingWords={['User Name', 'Route Plan ID', 'Plan Type']}
              staticPrefix="Search by"
              rotateDuration={2500}
            />
          </div>

          {hasCreatePermission && (
            <Button className="w-full md:w-auto" onClick={handleGenerate}>
              Generate
            </Button>
          )}
        </div>

        <LocationFilters
          filters={locationFilters}
          onFiltersChange={setLocationFilters}
          showWarehouse={true}
          showSalesPerson={true}
          className="w-full"
          statusFilter={
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value === "select-status" ? "" : value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="select-status">Select Status</SelectItem>
                <SelectItem value={RoutePlannerApprovalStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={RoutePlannerApprovalStatus.APPROVED}>Approved</SelectItem>
                <SelectItem value={RoutePlannerApprovalStatus.REJECTED}>Rejected</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {error ? (
          <div className="flex h-64 items-center justify-center">
            <GenericError
              errorText="Error loading manual PJP data. Please try again."
              inline
            />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={(transformedManualData || []) as ManualPjpRecord[]}
            pageCount={manualPjpData?.totalPages || 0}
            totalItems={manualPjpData?.totalItems || 0}
            manualPagination={true}
            initialPagination={pagination}
            onPaginationChange={handlePaginationChange}
            isLoading={isLoading}
            loadingText="Loading manual PJP data..."
            tableId="manual-pjp-table"
          />
        )}
      </div>

      <ApprovalModal
        open={approvalModalOpen}
        onOpenChange={(open) => {
          setApprovalModalOpen(open);
          if (!open) setSelectedPjp(null);
        }}
        entityId={selectedPjp?.routePlanId || ''}
        approverId={user?.userId || ''}
        approverRoleId={user?.roleId || ''}
        approvalData={approvalData?.data?.[0]}
        entityName={selectedPjp?.salesPerson}
        entityType="manual-pjp"
        onApprove={canUserTakeAction ? handleApprove : undefined}
        onReject={canUserTakeAction ? handleReject : undefined}
        isLoading={approvalLoading || updateApprovalStatusMutation.isPending}
        currentUserId={user?.userId}
        currentUserRoleId={user?.roleId}
        onSuccess={() => {
          // Refresh the data after successful approval/rejection
          // You might want to add a refetch function here if available
        }}
      />
    </section>
  );
};

export default ManualPjpPage;
