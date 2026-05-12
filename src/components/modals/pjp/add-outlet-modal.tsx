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
import { WarehouseDropdown } from '@/components/shared/warehouse-dropdown';
import { Store } from 'lucide-react';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';

interface AddOutletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { outlet: string; day: BigInteger }) => void;
  initialData?: {
    groupId?: string;
    outlet: string;
    day: BigInteger;
  } | null;
  mode: 'create' | 'edit';
  isSubmitting: boolean;
}

export function AddOutletModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode,
  isSubmitting,
}: AddOutletModalProps) {
  const [formData, setFormData] = useState({
    outlet: '',
    day: '',
  });

  const [isDirty, setIsDirty] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>();
  const [selectedChannel, setSelectedChannel] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setIsDirty(false);
    } else {
      setFormData({ outlet: '', day: '' });
    }
  }, [initialData]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      setIsDirty(
        mode === 'edit' &&
          (newData.outlet !== initialData?.outlet ||
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
              <div className="bg-primary/10 w-fit rounded-full p-2">
                <Store className="text-primary h-5 w-5" />
              </div>
              <div className="text-lg font-medium">{'Add Outlet'}</div>
              <div className="text-sm font-normal text-zinc-500">
                {'Add more outlet for alex '}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="outlet">Outlet</Label>
            <MasterRecordDropdown
              masterName="channel"
              value={selectedChannel}
              onChange={setSelectedChannel}
              placeholder="Channel"
              className="md:w-full"
            />
            <WarehouseDropdown
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
              placeholder="Warehouse"
              className="md:w-full"
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
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
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
                ? 'Add'
                : 'Update'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
