'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExistingOutlet {
  reasons: string[];
  outletId: string;
  outletCode?: string;
  outletName: string;
  phoneNumber: string;
  ownerName: string;
}

interface DuplicateOutletsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingOutlets: ExistingOutlet[];
  onCreateNew: () => void;
  isCreating?: boolean;
}

export const DuplicateOutletsModal = ({
  open,
  onOpenChange,
  existingOutlets,
  onCreateNew,
  isCreating = false,
}: DuplicateOutletsModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          Outlet Already Exists
        </DialogTitle>
        
        <DialogDescription className="text-sm text-gray-600">
          The following outlets match your submission. Please review them before proceeding.
        </DialogDescription>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            {existingOutlets.map((outlet, index) => (
              <div
                key={outlet.outletId}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-gray-900">
                      {outlet.outletName}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      {outlet.outletCode && (
                        <span>Code: {outlet.outletCode}</span>
                      )}
                      <span>ID: {outlet.outletId}</span>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-gray-500">
                    #{index + 1}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex gap-2">
                    <span className="font-medium text-gray-700">Owner:</span>
                    <span className="text-gray-600">{outlet.ownerName}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-medium text-gray-700">Phone:</span>
                    <span className="text-gray-600">{outlet.phoneNumber}</span>
                  </div>
                </div>

                {outlet.reasons && outlet.reasons.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-1">
                      Matching Criteria:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {outlet.reasons.map((reason, idx) => (
                        <li key={idx} className="text-xs text-amber-700">
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onCreateNew}
            disabled={isCreating}
            className="w-full sm:w-auto"
          >
            {isCreating ? 'Creating...' : 'Create New Anyway'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

