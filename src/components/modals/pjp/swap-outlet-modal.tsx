import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { IconTopologyStar3 } from '@tabler/icons-react';
import { Store } from 'lucide-react';

interface SwapOutletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { salesPerson: string; day: BigInteger }) => void;
  initialData?: {
    groupId?: string;
    salesPerson: string;
    day: BigInteger;
  } | null;
  mode: 'create' | 'edit';
  isSubmitting: boolean;
}

export function SwapOutletModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode,
  isSubmitting,
}: SwapOutletModalProps) {
  const [formData, setFormData] = useState({
    salesPerson: '',
    day: '',
  });

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setIsDirty(false);
    } else {
      setFormData({ salesPerson: '', day: '' });
    }
  }, [initialData]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      setIsDirty(
        mode === 'edit' &&
          (newData.salesPerson !== initialData?.salesPerson ||
            newData.day !== initialData?.day)
      );
      return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <div className="flex flex-col gap-1">
              <div className="bg-freshleaf/10 w-fit rounded-full p-2">
                <Store className="text-freshleaf h-5 w-5" />
              </div>
              <div className="text-lg font-medium">
                {'Swap Outlet'}
              </div>
              <div className="text-sm font-normal text-zinc-500">
                {'Swap outlet to another sales person '}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="salesPerson">Group Name</Label>
            <Input
              id="salesPerson"
              value={formData.salesPerson}
              onChange={(e) => handleChange('salesPerson', e.target.value)}
              placeholder="Enter group name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="day">Day</Label>
            <Input
              id="day"
              value={formData.day}
              onChange={(e) => handleChange('day', e.target.value)}
              placeholder="Enter day"
            />
          </div>
          <div className="flex justify-end pt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (mode === 'edit' && !isDirty)}
            >
              {isSubmitting
                ? mode === 'create'
                  ? 'Creating...'
                  : 'Updating...'
                : mode === 'create'
                  ? 'Create Group'
                  : 'Edit Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
