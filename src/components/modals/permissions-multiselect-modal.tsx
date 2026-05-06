'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IconShieldLock } from '@tabler/icons-react';
import { useMemo, useEffect } from 'react';
import { StyledMultiSelect } from '../ui/styled-multi-select';
import { usePermissions } from '@/features/user-managment/permissions/hooks/usePermissions';

interface Option {
  value: string;
  label: string;
}

export const PermissionsMultiSelectModal = ({
  open,
  onOpenChange,
  selectedPermissions,
  setSelectedPermissions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPermissions: string[];
  setSelectedPermissions: (perms: string[]) => void;
}) => {
  const { permissions } = usePermissions();

  const permissionOptions = useMemo(() => {
    if (!permissions.data?.data) return [];
    return permissions.data.data.map((perm: any) => ({
      value: perm.permissionId,
      label: perm.name,
    }));
  }, [permissions.data?.data]);

  const selectedOptionObjects = useMemo(
    () =>
      permissionOptions.filter((option) =>
        selectedPermissions.includes(option.value)
      ),
    [permissionOptions, selectedPermissions]
  );

  const handleChange = (options: Option[]) => {
    setSelectedPermissions(options.map((opt) => opt.value));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-visible sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <div className="flex flex-col gap-1">
              <div className="bg-blue-100 w-fit rounded-full p-2">
                <IconShieldLock className="text-freshleaf h-5 w-5" />
              </div>
              <div className="text-lg font-medium">Manage Permissions</div>
              <div className="text-sm font-normal text-zinc-500">
                Assign permissions to this group
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <StyledMultiSelect
          options={permissionOptions}
          value={selectedOptionObjects}
          onChange={handleChange}
          placeholder="Select permissions..."
          isMulti={true}
          maxToShow={1}
          isLoading={permissions.isLoading}
          isDisabled={permissions.isError}
        />
        <DialogFooter className="flex flex-col gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Select permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
