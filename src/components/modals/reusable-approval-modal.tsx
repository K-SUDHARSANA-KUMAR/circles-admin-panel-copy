'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogDescription } from '@radix-ui/react-dialog';
import React from 'react';

export type Step = {
  label: string;
  approvedStatus: 'active' | 'pending' | 'suspended' | 'inactive';
};

type InfoField = {
  label: string;
  value: string | number;
};

type ReusableModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  steps?: Step[];
  infoFields?: InfoField[];
  iconSrc?: string;
  children?: React.ReactNode;
};

export default function ReusableApprovalModal({
  open,
  onOpenChange,
  title,
  description,
  steps = [],
  infoFields = [],
  children,
}: ReusableModalProps) {
  const getStepStyle = (status: Step['approvedStatus']) => {
    switch (status) {
      case 'active':
        return {
          box: 'bg-green-600 text-white ',
          text: 'text-black-700',
        };
      case 'pending':
        return {
          box: 'bg-white text-green-600 border border-green-600',
          text: 'text-black-600',
        };
      case 'suspended':
      case 'inactive':
        return {
          box: 'bg-red-500 text-white',
          text: 'text-black-700',
        };
      default:
        return {
          box: 'bg-gray-300 text-white',
          text: 'text-gray-600',
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[700px] max-h-[80vh] w-full max-w-[1110px] overflow-y-auto">
        <DialogHeader className=" pb-0">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Left Column: Stepper */}
          {steps.length > 0 && (
            <div className="col-span-12 md:col-span-4">
              <div className="flex flex-col gap-6 rounded-xl bg-gray-50 p-5 shadow-sm">
                {steps.map((step, index) => {
                  const { box, text } = getStepStyle(step.approvedStatus);
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div
                     className={`h-10 w-10 flex items-center justify-center rounded-md text-sm font-semibold shadow-md ${box}`}
                      >
                        {index + 1}
                      </div>
                      <div className={`mt-1 text-sm font-semibold ${text}`}>
                        {step.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Right Column: Info */}
          {infoFields.length > 0 && (
            <div className="col-span-12 md:col-span-8">
              <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  {infoFields.map((field, index) => (
                    <div key={index}>
                      <dt className="text-sm font-medium text-gray-500">
                        {field.label}
                      </dt>
                      <dd className="mt-1 text-base font-semibold text-gray-900">
                        {field.value || '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Approve / Reject */}
        <DialogFooter className="sticky  right-0 bottom-0 left-0 z-100 border-t border-gray-200 bg-white px-4 pt-2">
          {children}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
