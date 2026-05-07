'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogDescription } from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, CheckCircle2Icon } from 'lucide-react';
import allDone from '@/assets/svgs/all-done.svg';
import { useProcessApproval, useGetApprovals } from '@/features/common/hooks/useApprovals';
import { ActionConfirmationModal } from './action-confirmation-modal';
import Loading from '@/components/ui/loading';

export interface ApprovalLevel {
  level: number;
  roleId: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'changes_required' | 'suspended';
  roleName?: string;
  approvedBy?: string;
  approvedAt?: string;
  reason?: string;
  remarks?: string;
}

export interface ApprovalHistory {
  action: string;
  status: string;
  remarks: string;
}

export interface ApprovalData {
  _id: string;
  entityType: string;
  entityId: string;
  currentLevel: number;
  status: 'pending' | 'approved' | 'rejected' | 'changes_required' | 'suspended';
  approvals: ApprovalLevel[];
  history?: ApprovalHistory[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Core required props for API calls
  entityId: string;
  entityType: string;
  approverId: string;
  approverRoleId: string;
  // Optional props
  entityName?: string;
  status?: string;
  onSuccess?: () => void; // Callback for successful approval/rejection
  // Legacy props for backward compatibility (deprecated)
  approvalData?: ApprovalData;
  onApprove?: (reason?: string) => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
  onChangesRequired?: (reason: string) => Promise<void>;
  isLoading?: boolean;
  currentUserId?: string;
  currentUserRoleId?: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved':
      return <CheckCircle className="h-4 w-4 text-primary" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-gray-400" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    case 'rejected':
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
    case 'changes_required':
      return <Badge className="bg-yellow-100 text-yellow-800">Changes Required</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
      return 'text-primary';
    case 'rejected':
      return 'text-red-600';
    case 'changes_required':
      return 'text-yellow-600';
    case 'pending':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
};

const getBorderColor = (status: string) => {
  switch (status) {
    case 'approved':
      return 'border-primary';
    case 'rejected':
      return 'border-red-500';
    case 'changes_required':
      return 'border-yellow-500';
    case 'pending':
      return 'border-gray-300';
    default:
      return 'border-gray-300';
  }
};

// Skeleton components for loading states
const ApprovalStatusSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-6 w-32" />
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-8" />
      </div>
    </div>
  </div>
);

const ApprovalProgressSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-6 w-36" />
    <div className="space-y-2">
      {[1, 2, 3].map((index) => (
        <div key={index} className="flex items-center gap-3 rounded-lg border p-3">
          <Skeleton className="h-4 w-4 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const RemarksSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-20 w-full" />
  </div>
);

// Reusable Approval Item Component
const ApprovalItem = ({ 
  approval, 
  isHistory = false 
}: { 
  approval: ApprovalLevel | ApprovalHistory; 
  isHistory?: boolean;
}) => {
  const status = 'approvalStatus' in approval ? approval.approvalStatus : approval.status;
  const level = 'level' in approval ? approval.level : 'History';
  const roleName = 'roleName' in approval ? approval.roleName : 'System';
  const roleId = 'roleId' in approval ? approval.roleId : '';
  
  return (
    <div className={`bg-card flex items-start gap-3 rounded-lg border-2 p-3 shadow-sm ${getBorderColor(status)}`}>
      <div className="flex-shrink-0 mt-0.5">
        {getStatusIcon(status)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div className="text-sm font-medium text-foreground">
            {isHistory ? `Level ${level} - ${'approvedBy' in approval ? approval.approvedBy : 'System'}` : `Level ${level} - ${roleName || `Role ${roleId}`}`}
          </div>
          <div className={`text-xs font-medium capitalize ${getStatusColor(status)}`}>
            {status.replace('_', ' ')}
          </div>
        </div>
        
        {/* Approver and time on the same row */}
        {'approvedBy' in approval && approval.approvedBy && (
          <div className="flex justify-between items-center mt-1">
            <div className="text-xs text-gray-600">
              {isHistory ? roleName : approval.approvedBy}
            </div>
            {'approvedAt' in approval && approval.approvedAt && (
              <div className="text-xs text-gray-600">
                {new Date(approval.approvedAt).toLocaleString()}
              </div>
            )}
          </div>
        )}
        
        {'remarks' in approval && approval.remarks && (
          <div className="text-xs text-gray-600 mt-1 break-words">
            Reason: {approval.remarks}
          </div>
        )}
      </div>
    </div>
  );
};

export default function ApprovalModal({
  open,
  onOpenChange,
  entityId,
  entityType,
  approverId,
  approverRoleId,
  entityName,
  status,
  onSuccess,
  // Legacy props for backward compatibility
  approvalData,
  onApprove,
  onReject,
  onChangesRequired,
  isLoading = false,
  currentUserId,
  currentUserRoleId,
}: ApprovalModalProps) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const [showApproveConfirmation, setShowApproveConfirmation] = useState(false);
  const [showRejectConfirmation, setShowRejectConfirmation] = useState(false);

  // Use the approval API hooks
  const processApprovalMutation = useProcessApproval();

  // Fetch approval data using common hook
  const {
    data: fetchedApprovalData,
    isLoading: approvalLoading
  } = useGetApprovals(
    {
      entityId,
      entityType,
      approverId,
      approverRoleId,
    },
    open && !!entityId // Only fetch when modal is open and entityId is provided
  );

  // Determine which approval data to use (fetched vs passed)
  const finalApprovalData = fetchedApprovalData?.data?.[0] || approvalData;
  const finalLoading = approvalLoading || isLoading;
  const isEmptyApproval = !finalApprovalData || (
    !finalApprovalData.approvals?.length && !finalApprovalData.history?.length
  );

  // Use the provided user info or fallback to legacy props
  const finalApproverId = approverId || currentUserId;
  const finalApproverRoleId = approverRoleId || currentUserRoleId;

  const handleApproveClick = () => {
    setShowApproveConfirmation(true);
  };

  const handleApproveConfirm = async () => {
    setShowApproveConfirmation(false);
    if (!canTakeAction) return;

    try {
      // If custom onApprove handler is provided, use it (legacy support)
      if (onApprove) {
        await onApprove(reason);
      } else {
        // Use the built-in API call with provided props
        await processApprovalMutation.mutateAsync({
          entityId,
          entityType,
          approvalStatus: 'approved',
          remarks: reason || 'Approved by user',
          approverId: finalApproverId!,
          roleId: finalApproverRoleId!,
        });
        toast.success('Successfully approved!');
      }
      setReason('');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      toast.error(`Failed to approve: ${errorMessage}`);
    }
  };

  const handleRejectClick = () => {
    if (!canTakeAction) return;

    if (!reason.trim()) {
      setReasonError(true);
      toast.error('Please provide a reason for rejection');
      return;
    }

    setReasonError(false);
    setShowRejectConfirmation(true);
  };

  const handleRejectConfirm = async () => {
    setShowRejectConfirmation(false);
    if (!canTakeAction) return;

    try {
      // If custom onReject handler is provided, use it (legacy support)
      if (onReject) {
        await onReject(reason);
      } else {
        // Use the built-in API call with provided props
        await processApprovalMutation.mutateAsync({
          entityId,
          entityType,
          approvalStatus: 'rejected',
          remarks: reason,
          approverId: finalApproverId!,
          roleId: finalApproverRoleId!,
        });
        toast.success('Successfully rejected!');
      }
      setReason('');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      toast.error(`Failed to reject: ${errorMessage}`);
    }
  };

  const handleChangesRequired = async () => {
    if (!canTakeAction) return;

    if (!reason.trim()) {
      setReasonError(true);
      toast.error('Please provide a reason for changes required');
      return;
    }
    setReasonError(false);
    try {
      // If custom onChangesRequired handler is provided, use it (legacy support)
      if (onChangesRequired) {
        await onChangesRequired(reason);
      } else {
        // Use the built-in API call with 'changes_required' status
        await processApprovalMutation.mutateAsync({
          entityId,
          entityType,
          approvalStatus: 'changes_required',
          remarks: reason,
          approverId: finalApproverId!,
          roleId: finalApproverRoleId!,
        });
        toast.success('Changes required status updated!');
      }
      setReason('');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      toast.error(`Failed to update changes required: ${errorMessage}`);
    }
  };

  // Check if current user is the approver for the pending level
  const isCurrentApprover = finalApprovalData?.approvals?.some(
    (approval: ApprovalLevel) =>
      approval.roleId === finalApproverRoleId &&
      approval.approvalStatus === 'pending'
  );

  // Check if any approval is suspended
  const isSuspended = finalApprovalData?.approvals?.some(
    (approval: ApprovalLevel) => approval.approvalStatus === 'suspended'
  );

  // Find current user's approval level
  const currentUserApprovalLevel = finalApprovalData?.approvals?.find(
    (approval: ApprovalLevel) => approval.roleId === finalApproverRoleId
  )?.level;

  // Check if current user is level 1
  const isLevel1User = currentUserApprovalLevel === 1;

  // Determine if actions should be disabled
  const isActionDisabled = !isCurrentApprover || isSuspended;

  // Only show action buttons if user can take action
  // Either custom handlers are provided OR we have the required data for built-in API calls
  const canTakeAction = !isActionDisabled && (
    (onApprove && onReject) ||
    (entityId && entityType && finalApproverId && finalApproverRoleId)
  );

  // Show action buttons if:
  // 1. User can take action AND current level is 2 or higher
  const shouldShowActionButtons = canTakeAction;

  useEffect(() => {
    if (open) {
      setReason('');
      setReasonError(false);
    }
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-4xl flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0 space-y-4">
          <DialogTitle>
            <div className="flex flex-col gap-1">
              <div className="bg-primary/10 w-fit rounded-full p-2">
                <CheckCircle2Icon className="text-primary h-5 w-5" />
              </div>
              <div className="text-lg font-medium">Approval Details</div>

            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Fixed Header Section */}
        <div className="flex-shrink-0 space-y-4">
          {/* Approval Status Overview */}
          {finalLoading ? (
            <ApprovalStatusSkeleton />
          ) : (
            <div className="space-y-3 mb-4">
              <div className="rounded-lg ">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-600">Current Level - {finalApprovalData?.currentLevel || 0}</span>
                  {finalApprovalData?.status && getStatusBadge(finalApprovalData.status)}
                </div>
              </div>
            </div>
          )}


        </div>

         {/* Scrollable Content */}
         <div className="flex-1 min-h-0 bg-gray-100">
           <ScrollArea className="h-[50vh] w-full pr-4">
            <div className="p-4">
            {/* History Section */}
            {finalApprovalData?.history && finalApprovalData.history.length > 0 && (
              <div className="space-y-3 mb-6">
                <h3 className="text-base font-semibold text-foreground border-b border-gray-200 pb-2">
                  Approval History
                </h3>
                <div className="space-y-3">
                  {finalApprovalData.history.map((historyItem: ApprovalHistory, index: number) => (
                    <ApprovalItem 
                      key={`history-${index}`} 
                      approval={historyItem} 
                      isHistory={true} 
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Pending Approvers Section */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-foreground border-b border-gray-200 pb-2">
                Current Pending Approvers
              </h3>
              {finalLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loading text="Loading approvals..." />
                </div>
              ) : (
                <div className="space-y-3">
                  {finalApprovalData?.approvals
                    ?.filter((approval: ApprovalLevel) => approval.approvalStatus === 'pending')
                    ?.map((approval: ApprovalLevel, index: number) => (
                      <ApprovalItem 
                        key={`pending-${index}`} 
                        approval={approval} 
                        isHistory={false} 
                      />
                    ))}
                  {(!finalApprovalData?.approvals?.filter((approval: ApprovalLevel) => approval.approvalStatus === 'pending')?.length) && (
                    <div className="text-center py-8 text-gray-500">
                     <div className="h-full flex flex-col items-center justify-center text-center">
                        <img
                          src={allDone.src}
                          alt="All Done"
                          className="h-auto w-35 opacity-60"
                        />
                        <p className="text-sm text-center">No pending approvers</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
          </ScrollArea>
        </div>

        {/* Fixed Footer Section - Remarks and Buttons */}
        <div className="flex-shrink-0 space-y-4">
          {/* Action Section - Hide when current level is 1 (unless level 1 is optional) */}
          {shouldShowActionButtons && (
            finalLoading ? (
              <RemarksSkeleton />
            ) : (
              <div className="space-y-1">
                <label htmlFor="reason" className="text-xs font-medium">
                  Remarks <span className="text-gray-500">(required for Reject and Changes Required)</span>
                </label>
                <Input
                  id="reason"
                  placeholder="Enter the remarks if rejects or changes required"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setReasonError(false);
                  }}
                  className={reasonError ? 'border-red-500' : ''}
                />
                {reasonError && (
                  <p className="text-xs text-red-500">
                    Remarks are required for Rejected and Changes Required actions.
                  </p>
                )}
              </div>
            )
          )}
        </div>

        <DialogFooter className="flex flex-shrink-0 items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processApprovalMutation.isPending || finalLoading}
          >
            Close
          </Button>
          {shouldShowActionButtons && !finalLoading && (
            <>
              <Button
                variant="destructive"
                onClick={handleRejectClick}
                disabled={processApprovalMutation.isPending || finalLoading}
              >
                Reject
              </Button>
              {/* Only show Changes Required button if user is NOT level 1 */}
              {!isLevel1User && (
                <Button
                  variant="outline"
                  onClick={handleChangesRequired}
                  disabled={processApprovalMutation.isPending || finalLoading}
                  style={{
                    backgroundColor: '#EAB308',
                    color: 'white',
                    borderColor: '#EAB308'
                  }}
                  className="hover:bg-yellow-600 hover:border-yellow-600"
                >
                  Changes Required
                </Button>
              )}
              <Button
                variant="default"
                onClick={handleApproveClick}
                disabled={processApprovalMutation.isPending || finalLoading}
              >
                Approve
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
      
      <ActionConfirmationModal
        open={showApproveConfirmation}
        onOpenChange={setShowApproveConfirmation}
        onConfirm={handleApproveConfirm}
        title="Confirm Approval"
        description={`Are you sure you want to approve ${entityName || 'this item'}?`}
        confirmText="Approve"
        variant="approve"
        isLoading={processApprovalMutation.isPending}
      />

      <ActionConfirmationModal
        open={showRejectConfirmation}
        onOpenChange={setShowRejectConfirmation}
        onConfirm={handleRejectConfirm}
        title="Confirm Rejection"
        description={`Are you sure you want to reject ${entityName || 'this item'}?`}
        confirmText="Reject"
        variant="reject"
        isLoading={processApprovalMutation.isPending}
      />
    </Dialog>
  );
}
