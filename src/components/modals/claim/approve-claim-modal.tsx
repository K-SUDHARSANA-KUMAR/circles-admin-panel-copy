'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  CheckCircle2Icon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export type Step = {
  label: string;
  approvedStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
};

export type InfoField = {
  label: string;
  value: string | number;
};

export type ApproveClaimModalProps = {
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  steps?: Step[];
  infoFields: InfoField[];
  onReject?: (remarks: string) => void;
  onRemarksChange?: (value: string) => void;
  defaultRemarks?: string;
  isActionDisabled?: boolean;
  onApprove?: (remarks: string) => void;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'suspended':
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    case 'pending':
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
      return 'text-green-600';
    case 'rejected':
      return 'text-red-600';
    case 'suspended':
      return 'text-yellow-600';
    case 'pending':
    default:
      return 'text-gray-400';
  }
};

export default function ApproveClaimModal({
  open,
  onOpenChange,
  title,
  steps,
  infoFields,
  onApprove,
  onReject,
  onRemarksChange,
  defaultRemarks = '',
  isActionDisabled,
}: ApproveClaimModalProps) {
  const [remarks, setRemarks] = React.useState(defaultRemarks);
  const [remarksError, setRemarksError] = React.useState(false);

  React.useEffect(() => {
    setRemarks(defaultRemarks || '');
  }, [defaultRemarks]);

  const handleRejectClick = () => {
    if (!remarks.trim()) {
      setRemarksError(true);
      return;
    }
    setRemarksError(false);
    onReject?.(remarks);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0 space-y-4">
          <DialogTitle>
            <div className="flex flex-col gap-1">
              <div className="bg-freshleaf/10 w-fit rounded-full p-2">
                <CheckCircle2Icon className="text-freshleaf h-5 w-5" />
              </div>
              <div className="text-lg font-medium">{title}</div>
              <div className="text-sm font-normal text-zinc-500">
                Review the details of the submitted outlet
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col space-y-6">
          <ScrollArea className="min-h-0 w-full flex-1 space-y-6 pr-4">
            {steps && steps.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-semibold">Approval Progress</h3>
                <div className="space-y-2">
                  {steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      {getStatusIcon(step.approvedStatus)}
                      <div className="flex-1">
                        <div className="text-sm font-medium">{step.label}</div>
                        <div
                          className={`text-xs capitalize ${getStatusColor(step.approvedStatus)}`}
                        >
                          {step.approvedStatus}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remarks Textarea */}
            <div className="space-y-2">
              <label htmlFor="remarks" className="text-sm font-medium">
                Remarks <span className="text-gray-500">(required for Reject and Changes Required)</span>
              </label>
              <Input
                id="remarks"
                value={remarks}
                onChange={(e) => {
                  setRemarks(e.target.value);
                  setRemarksError(false);
                  onRemarksChange?.(e.target.value);
                }}
                placeholder="Enter remarks..."
                className={`h-10 ${remarksError ? 'border-red-500' : ''}`} // Set standard height
              />
              {remarksError && (
                <p className="text-sm text-red-500">
                  Remarks are required for Rejected and Changes Required actions.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex flex-shrink-0 items-center justify-end gap-2">
          <Button
            variant="destructive"
            onClick={handleRejectClick}
            disabled={isActionDisabled}
          >
            Reject
          </Button>
          <Button
            variant="default"
            onClick={() => onApprove?.(remarks)}
            disabled={isActionDisabled}
          >
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
