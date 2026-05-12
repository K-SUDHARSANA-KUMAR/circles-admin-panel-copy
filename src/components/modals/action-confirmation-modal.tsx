'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';

interface ActionConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: 'approve' | 'reject';
}

export const ActionConfirmationModal = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText = 'Cancel',
  isLoading = false,
  variant = 'approve',
}: ActionConfirmationModalProps) => {
  const iconBgColor = variant === 'approve' ? 'bg-green-100' : 'bg-red-100';
  const iconColor = variant === 'approve' ? 'text-primary' : 'text-red-600';
  const Icon = variant === 'approve' ? CheckCircle : XCircle;
  const buttonVariant = variant === 'approve' ? 'default' : 'destructive';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className='sr-only'>{title}</DialogTitle>
        <div className="flex flex-col space-y-3 py-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconBgColor}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          
          <h2 className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          
          <p className="text-sm text-gray-600">
            {description}
          </p>
        </div>
        
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={buttonVariant}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
