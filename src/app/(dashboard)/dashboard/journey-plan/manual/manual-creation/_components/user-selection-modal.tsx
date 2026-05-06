import React, { useState } from 'react';
import { ReportingManagerModal } from '@/components/modals/reporting-manager-modal';

interface UserData {
  userId: string;
  name: string;
  employeeCode?: string;
  phoneNumber?: string;
}

interface UserSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUserId?: string;
  selectedUserName?: string;
  onUserSelect: (userId: string, userData: { userId: string; name: string }) => void;
  warehouseIds?: string[];
  onWarehouseFilterChange?: (warehouseIds: string[]) => void;
}

export const UserSelectionModal = ({
  open,
  onOpenChange,
  selectedUserId,
  selectedUserName,
  onUserSelect,
  warehouseIds,
  onWarehouseFilterChange,
}: UserSelectionModalProps) => {
  const [tempSelectedUserId, setTempSelectedUserId] = useState<string | undefined>(selectedUserId);
  const [tempSelectedUserData, setTempSelectedUserData] = useState<UserData | null>(null);

  const handleUserChange = (managerId: string | undefined, managerData?: UserData) => {
    setTempSelectedUserId(managerId);
    setTempSelectedUserData(managerData || null);
  };

  const handleConfirm = () => {
    if (tempSelectedUserId && tempSelectedUserData) {
      onUserSelect(tempSelectedUserId, {
        userId: tempSelectedUserId,
        name: tempSelectedUserData.name,
      });
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTempSelectedUserId(selectedUserId);
    setTempSelectedUserData(null);
    onOpenChange(false);
  };

  return (
    <ReportingManagerModal
      open={open}
      selectedManagerId={tempSelectedUserId}
      onChange={handleUserChange}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      modalTitle="Select User for PJP"
      showWarehouseFilter={true}
      warehouseIds={warehouseIds}
      onWarehouseFilterChange={onWarehouseFilterChange}
      initialSelectedOption={
        selectedUserId && selectedUserName
          ? {
              userId: selectedUserId,
              name: selectedUserName,
            }
          : undefined
      }
    />
  );
};