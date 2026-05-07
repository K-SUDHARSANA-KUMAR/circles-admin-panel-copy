'use client';

import ClaimsTab from '@/components/tabs/claims/claims-tabs';
import { columns } from '@/components/data-tables/claims/claim-approval-columns';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import EmptyState from '@/components/ui/empty-state';
import PageHeader from '@/components/shared/page-header';
import { pagetittleConfig } from '@/constants/pagetittle-config';
import { useClaims } from '@/features/dashboard/claims/hooks/useClaims';
import { useAppSelector } from '@/store/hooks';
import { toast } from 'sonner';
import ApproveClaimModal from '@/components/modals/claim/approve-claim-modal';

export default function ApprovalClaimsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [approvalClaimOpen, setApprovalClaimOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState<string>();
  const [selectedStatus, setSelectedStatus] = useState<string>();
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const { user } = useAppSelector((state) => state.auth);

  const { claims, updateApproverStatus } = useClaims();

  const currentUserRoleId = user?.roleId || '';
  const isCurrentApprover = selectedClaim?.approvers?.some(
    (a: { roleId: string; approvedStatus: string }) =>
      a.roleId === currentUserRoleId && a.approvedStatus === 'pending'
  );
  const isSuspended = selectedClaim?.approvers?.some(
    (a: { approvedStatus: string }) => a.approvedStatus === 'suspended'
  );
  const isActionDisabled = !isCurrentApprover || isSuspended;

  const getStepsFromApprovers = (approvers: any[] = []): Step[] => {
    return approvers.map((approver) => ({
      label: approver.approvedBy?.trim()
        ? `${approver.roleName} - (${approver.approvedBy})`
        : approver.roleName,
      approvedStatus: approver.approvedStatus,
    }));
  };

  const steps = getStepsFromApprovers(selectedClaim?.approvers);

  const infoFields = selectedClaim
    ? [
        { label: 'Claim', value: selectedClaim.claimId },
        { label: 'Claim Type', value: selectedClaim.claimTypeId },
        { label: 'Invoice Number', value: selectedClaim.invoiceNumber },
        { label: 'Claim Status', value: selectedClaim.claimStatus },
        { label: 'claim Amount', value: selectedClaim.claimAmount },
        { label: 'Legitimacy Score', value: selectedClaim.legitimacyScore },
      ]
    : [];

  const onViewClaim = (record: any) => {
    setSelectedClaim(record);
    setApprovalClaimOpen(true);
  };

  const handleApprove = async (remarks: string) => {
    if (!selectedClaim?.claimId || !user?.userId || !user?.roleId) return;
    toast.loading('Updating claim...', { id: 'claim-action' });

    try {
      await updateApproverStatus.mutateAsync({
        claimId: selectedClaim.claimId,
        approvedBy: user.userId,
        roleId: user.roleId,
        status: 'approved',
        reason: remarks ||'Approved by user',
      });

      toast.success('Claim updated successfully!', { id: 'claim-action' });
      setApprovalClaimOpen(false);
    } catch (error: any) {
      toast.error(`Failed to update outlet: ${error?.message}`, {
        id: 'outlet-action',
      });
    }
  };

   const handleReject = async (remarks: string) => {
    if (!selectedClaim?.claimId || !user?.userId || !user?.roleId) return;
    toast.loading('Updating claim...', { id: 'claim-action' });
    try {
      await updateApproverStatus.mutateAsync({
        claimId: selectedClaim.claimId,
        approvedBy: user.userId,
        roleId: user.roleId,
        status: 'rejected',
        reason: remarks || 'Rejected by user',
      });

      toast.success('Claim updated successfully!', { id: 'claim-action' });
      setApprovalClaimOpen(false);
    } catch (error: any) {
      toast.error(`Failed to update outlet: ${error?.message}`, {
        id: 'outlet-action',
      });
    }
  };

  return (
    <>
      <section className="w-full space-y-6">
        <PageHeader title={pagetittleConfig.claim.pageTitle} />
        <div className="w-full space-y-4 rounded-lg bg-card p-4">
          <ClaimsTab />
          <div className="flex flex-col justify-between gap-10 md:flex-row">
            <div className="flex flex-col gap-2 md:flex-row">
              <div className="relative w-full md:max-w-[250px] md:min-w-[180px] md:flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-500" />
                <Input placeholder="Search claim" className="pl-10" />
              </div>

              <Select
                value={selectedDesignation}
                onValueChange={setSelectedDesignation}
              >
                <SelectTrigger className="w-full md:max-w-[250px] md:min-w-[180px] md:flex-1">
                  <SelectValue placeholder="Designation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales Executive</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full md:max-w-[250px] md:min-w-[180px] md:flex-1">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <DatePicker
                date={selectedDate}
                onSelect={setSelectedDate}
                className="w-full md:max-w-[250px] md:min-w-[180px] md:flex-1"
              />
            </div>
          </div>
        </div>

        <div className="w-full rounded-lg bg-card p-6">
          {claims?.data?.data?.items.length > 0 ? (
            <DataTable
              columns={columns}
              data={claims.data.data.items.map((record: any) => ({
                ...record,
                onViewClaim: () => onViewClaim(record),
              }))}
              tableId="claim-approval-table"
            />
          ) : (
            <div className="flex h-64 items-center justify-center">
              <EmptyState text="No Approval Claims found. Start by adding your first claim." />
            </div>
          )}

          <ApproveClaimModal
            open={approvalClaimOpen}
            onOpenChange={setApprovalClaimOpen}
            title="Claim Approvals"
            steps={steps}
            infoFields={infoFields}
            defaultRemarks={selectedClaim?.previousRemarks || ''}
            onApprove={handleApprove}
            onReject={handleReject}
            isActionDisabled={isActionDisabled}
          />
        </div>
      </section>
    </>
  );
}
