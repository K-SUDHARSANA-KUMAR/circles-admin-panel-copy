'use client';

import React from 'react';
import ReusableApprovalModal, { Step } from '@/components/modals/reusable-approval-modal';
import { Button } from '@/components/ui/button'; 

type InfoField = {
  label: string;
  value: string | number;
};

type ApproveClaimPageProps = {
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  steps?: Step[];
  infoFields: InfoField[];
  onApprove?: () => void;
  onReject?: () => void;
  isActionDisabled?: boolean;
};

export default function ApproveClaimPage({
  open,
  onOpenChange,
  title,
  steps,
  infoFields,
  onApprove,
  onReject,
  isActionDisabled,
}: ApproveClaimPageProps) {
  return (
    <ReusableApprovalModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Review the details of the submitted outlet"
      iconSrc="/file.svg"
      steps={steps}
      infoFields={infoFields}
    >
      {/* Approve / Reject buttons */}
      <div className="mt-2 flex justify-end gap-4">
        <Button
          variant="outline"
          className="border border-red-500 text-red-600 hover:bg-red-50"
          onClick={onReject}
          disabled={isActionDisabled}
        >
          Reject
        </Button>
        <Button
          className="bg-green-600 text-white hover:bg-green-700"
          onClick={onApprove}
          disabled={isActionDisabled}
        >
          Approve
        </Button>
      </div>
    </ReusableApprovalModal>
  );
}
