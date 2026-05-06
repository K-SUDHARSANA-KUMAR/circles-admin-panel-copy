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
import { capitalizeDisplayName, readableToCamelCase } from '@/utils/string-utils';

interface GroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { groupName: string; displayName: string }) => void;
  initialData?: {
    groupId?: string;
    groupName: string;
    displayName: string;
  } | null;
  mode: 'create' | 'edit';
  isSubmitting: boolean;
}

export function GroupModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode,
  isSubmitting,
}: GroupModalProps) {
  const [formData, setFormData] = useState({
    groupName: '',
    displayName: '',
  });

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setIsDirty(false);
    } else {
      setFormData({ groupName: '', displayName: '' });
    }
  }, [initialData]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      setIsDirty(
        mode === 'edit' &&
          (newData.groupName !== initialData?.groupName ||
            newData.displayName !== initialData?.displayName)
      );
      return newData;
    });
  };

  const handleDisplayNameChange = (value: string) => {
    // Only allow letters, numbers, hyphens, and spaces
    const filteredValue = value.replace(/[^a-zA-Z0-9- ]/g, '');
    // Capitalize the first letter of each word
    const capitalizedValue = filteredValue.replace(/\b\w/g, (char) => char.toUpperCase());
    const camelCaseValue = readableToCamelCase(capitalizedValue);
    setFormData((prev) => {
      const newData = {
        ...prev,
        displayName: capitalizedValue,
        groupName: camelCaseValue
      };
      setIsDirty(
        mode === 'edit' &&
          (newData.groupName !== initialData?.groupName ||
            newData.displayName !== initialData?.displayName)
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            <div className="flex flex-col gap-1">
              <div className="bg-freshleaf/10 w-fit rounded-full p-2">
                <IconTopologyStar3 className="text-freshleaf h-5 w-5" />
              </div>
              <div className="text-lg font-medium">
                {mode === 'create' ? 'Add Group' : 'View & Edit Group'}
              </div>
              <div className="text-sm font-normal text-zinc-500">
                {mode === 'create'
                  ? 'Add a new group in master group'
                  : 'View and edit the details of a group'}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              placeholder="Enter display name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={formData.groupName}
              onChange={(e) => handleChange('groupName', e.target.value)}
              placeholder="Auto Generated from Display Name"
              disabled
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
