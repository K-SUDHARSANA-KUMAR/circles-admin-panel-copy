'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { masterRecordsApi } from '@/features/master-managment/api/master-records';
import { useQueryClient } from '@tanstack/react-query';

interface ActiveStatusCellProps {
  value: boolean;
  schemaName: string;
  recordId: string;
}

export function ActiveStatusCell({ value, schemaName, recordId }: ActiveStatusCellProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isActive, setIsActive] = useState(value);
  const queryClient = useQueryClient();

  const handleToggle = async (checked: boolean) => {
    try {
      setIsUpdating(true);
      await masterRecordsApi.patchIsActive(schemaName, recordId, checked);
      await queryClient.invalidateQueries({ queryKey: ['master-records', schemaName] });
      setIsActive(checked);
      toast.success('Status updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
      setIsActive(!checked); // Revert on error
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <Switch
        checked={isActive}
        onCheckedChange={handleToggle}
        disabled={isUpdating}
        aria-label="Toggle active status"
      />
    </div>
  );
}
