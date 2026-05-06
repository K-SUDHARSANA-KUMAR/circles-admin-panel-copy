'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

interface DiscountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyDiscount?: (discountData: any) => void;
}

export function DiscountModal({
  open,
  onOpenChange,
  onApplyDiscount,
}: DiscountModalProps) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');

  const handleApply = () => {
    if (discountValue && onApplyDiscount) {
      onApplyDiscount({
        type: discountType,
        value: parseFloat(discountValue),
      });
      onOpenChange(false);
      setDiscountValue('');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setDiscountValue('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Custom Discount</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="discountType">Discount Type</Label>
            <Select
              value={discountType}
              onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select discount type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="discountValue">
              {discountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
            </Label>
            <Input
              id="discountValue"
              type="number"
              placeholder={discountType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="mt-2"
              min="0"
              max={discountType === 'percentage' ? '100' : undefined}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={!discountValue}>
              Apply Discount
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
