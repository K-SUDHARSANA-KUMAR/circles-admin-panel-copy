'use client';


import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { StatusDropdown } from '@/components/shared/status-dropdown';
import EmptyState from '@/components/ui/empty-state';
import Loading from '@/components/ui/loading';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { PaginationState } from '@tanstack/react-table';
import {
  useApprovalSchemes,
  useUpdateSchemeStatus,
  useUpdateSchemeApprovalStatus,
  useSchemeApprovals,
} from '@/features/dashboard/schemes/hooks/useSchemes';
import { toast } from 'sonner';
import ApprovalModal from '@/components/modals/approval-modal';
import { useAppSelector } from '@/store/hooks';
import SchemesTab from '@/components/tabs/schemes/schemes-tabs';
import PageHeader from '@/components/shared/page-header';
import NavKeys from '@/constants/navkeys';
import { createApprovalColumns } from '@/components/data-tables/schemes/scheme-approval-columns';
import { SchemeStatusEnum } from '@/constants/enums/scheme.enums';

const ApprovalSchemesPage = () => {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(
    undefined
  );

  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<any>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm, selectedStatus]);

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  // API hooks - get approval schemes directly
  const {
    data: schemesData,
    isLoading,
    error,
  } = useApprovalSchemes(user?.userId, user?.roleId, {
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
    search: searchTerm || undefined,
    status: selectedStatus ? selectedStatus.toLowerCase() : undefined,
  });

  const { data: approvalData, isLoading: approvalLoading } = useSchemeApprovals(
    selectedScheme?.schemeId || '',
    user?.userId,
    user?.roleId,
    'pending'
  );

  const updateStatusMutation = useUpdateSchemeStatus();
  const updateApprovalStatusMutation = useUpdateSchemeApprovalStatus();

  // Check if current user has already approved/rejected this scheme
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

  const handleAddScheme = () => {
    router.push(NavKeys.SchemesCreation);
  };

  const handleEdit = (scheme: any) => {
    router.push(
      `${NavKeys.SchemesCreation}?mode=edit&schemeId=${scheme.schemeId}`
    );
  };

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

      // Extract error message from API response
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

  const handleApprovals = (scheme: any) => {
    console.log('Handle approvals for scheme:', scheme);
    router.push(
      `${NavKeys.SchemesApprovalView}?mode=view&schemeId=${scheme.schemeId}`
    );
  };

  const handleApprove = async (reason?: string) => {
    if (!selectedScheme || !user?.userId || !user?.roleId) return;

    try {
      await updateApprovalStatusMutation.mutateAsync({
        entityId: selectedScheme.schemeId || selectedScheme.schemeId,
        approvalStatus: 'approved',
        remarks: reason ?? '',
        approverId: user.userId,
        roleId: user.roleId,
        entityType: 'schemes',
      });
      toast.success('Scheme approved successfully');
      // Close modal and refresh data
      setApprovalModalOpen(false);
      setSelectedScheme(null);
    } catch (error: any) {
      console.error('Approval error:', error);

      // Extract error message from API response
      let errorMessage = 'Failed to approve scheme';

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
      throw error;
    }
  };

  const handleReject = async (reason: string) => {
    if (!selectedScheme || !user?.userId || !user?.roleId) return;

    try {
      await updateApprovalStatusMutation.mutateAsync({
        entityId: selectedScheme.schemeId || selectedScheme.schemeId,
        approvalStatus: 'rejected',
        remarks: reason,
        approverId: user.userId,
        roleId: user.roleId,
        entityType: 'schemes',
      });
      toast.success('Scheme rejected successfully');
      // Close modal and refresh data
      setApprovalModalOpen(false);
      setSelectedScheme(null);
    } catch (error: any) {
      console.error('Rejection error:', error);

      // Extract error message from API response
      let errorMessage = 'Failed to reject scheme';

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
      throw error;
    }
  };

  // Ensure schemes is always an array - no need to filter since API returns approval schemes
  const allSchemes = Array.isArray(schemesData?.data?.items)
    ? schemesData?.data?.items || []
    : [];
  const schemes = allSchemes;

  // Filter schemes based on search term and status
  const filteredSchemes = schemes.filter((scheme: any) => {
    const matchesSearch =
      !searchTerm ||
      scheme.schemeName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      !selectedStatus ||
      (scheme.status &&
        scheme.status.toLowerCase() === selectedStatus.toLowerCase());
    return matchesSearch && matchesStatus;
  });

  const SCHEME_STATUS_FILTER = {
    ACTIVE: SchemeStatusEnum.ACTIVE,
    INACTIVE: SchemeStatusEnum.INACTIVE,
    PENDING: SchemeStatusEnum.PENDING,
    IN_REVIEW: SchemeStatusEnum.IN_REVIEW,
    REJECTED: SchemeStatusEnum.REJECTED,
  };

  const enhancedSchemes = filteredSchemes.map((scheme: any) => ({
    ...scheme,
    onEdit: () => handleEdit(scheme),
    onStatusChange: (status: 'DRAFT' | 'ACTIVE' | 'INACTIVE') =>
      handleStatusChange(scheme, status),
    onViewApprovals: () => handleViewApprovals(scheme),
  }));

  if (error) {
    return (
      <section className="w-full space-y-6">
        <PageHeader title="Approval Schemes" />

        <div className="flex h-64 items-center justify-center">
          <EmptyState text="Error loading approval schemes. Please try again." />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Approval Schemes" />
      <div className="w-full space-y-3 rounded-lg bg-white p-4">
        <SchemesTab />
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="flex flex-col gap-2 md:flex-row">
            <Input
              placeholder="Search Scheme name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <StatusDropdown
              value={selectedStatus}
              onChange={setSelectedStatus}
              statusEnum={SCHEME_STATUS_FILTER}
              placeholder="Status"
              className="w-full md:w-48"
            />
          </div>
        </div>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loading text="Loading schemes..." />
          </div>
        ) : enhancedSchemes.length > 0 ? (
          <DataTable
            columns={createApprovalColumns(
              (scheme) => [
                {
                  title: 'View Approvals',
                  handleAction: () => handleViewApprovals(scheme),
                },
                {
                  title: 'Approve',
                  handleAction: () => handleApprovals(scheme),
                },
              ],
              pagination.pageIndex,
              pagination.pageSize
            )}
            data={enhancedSchemes}
            pageCount={schemesData?.data?.totalPages}
            totalItems={schemesData?.data?.totalItems}
            onPaginationChange={handlePaginationChange}
            manualPagination={true}
            initialPagination={pagination}
            isLoading={isLoading}
            loadingText="Loading schemes..."
            tableId="approval-schemes-table"
            isColumnDisplay={false}
            isDownload={false}
          />
        ) : (
          <div className="flex h-64 items-center justify-center">
            <EmptyState text="No schemes pending approval for your role." />
          </div>
        )}
      </div>

      <ApprovalModal
        open={approvalModalOpen}
        onOpenChange={(open) => {
          setApprovalModalOpen(open);
          if (!open) setSelectedScheme(null);
        }}
        approvalData={approvalData?.data?.[0]}
        entityName={selectedScheme?.schemeName}
        entityId={selectedScheme?.schemeId || selectedScheme?.schemeId || ''}
        entityType="schemes"
        approverId={user?.userId || ''}
        approverRoleId={user?.roleId || ''}
        status="pending"
        onApprove={canUserTakeAction ? handleApprove : undefined}
        onReject={canUserTakeAction ? handleReject : undefined}
        isLoading={approvalLoading || updateApprovalStatusMutation.isPending}
      />
    </section>
  );
};

export default ApprovalSchemesPage;
