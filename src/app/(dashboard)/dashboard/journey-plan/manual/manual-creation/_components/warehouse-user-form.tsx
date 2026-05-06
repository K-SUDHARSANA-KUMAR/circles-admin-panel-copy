import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CheckboxMultiSelect } from '@/components/shared/checkbox-multiselect';
import { UserSelectionModal } from './user-selection-modal';
import { FormState } from '../_types';
import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';
import { useMemo } from 'react';

interface WarehouseUserFormProps {
  formState: FormState;
  warehouseOptions: { value: string; label: string }[];
  userOptions: { value: string; label: string }[];
  isWarehouseLoading: boolean;
  isUserLoading: boolean;
  onWarehouseChange: (warehouse: string) => void;
  onUserChange: (userId: string) => void;
}

export const WarehouseUserForm = ({
  formState,
  warehouseOptions,
  userOptions,
  isWarehouseLoading,
  isUserLoading,
  onWarehouseChange,
  onUserChange,
}: WarehouseUserFormProps) => {
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState<string>('');

  // Fetch warehouses for the multiselect
  const { warehouses } = useWarehouse(undefined, { nonPaginated: true });
  
  const warehouseMultiSelectOptions = useMemo(() => {
    if (!warehouses?.data?.data?.items) return [];
    return warehouses.data.data.items.map((warehouse: any) => ({
      value: warehouse.warehouseId || warehouse._id || '',
      label: warehouse.warehouseName,
    }));
  }, [warehouses?.data?.data?.items]);

  const handleWarehouseFilterChange = (warehouseIds: string[]) => {
    setSelectedWarehouseIds(warehouseIds);
  };

  const handleUserSelect = (userId: string, userData: { userId: string; name: string }) => {
    onUserChange(userId);
    setSelectedUserName(userData.name);
    setIsUserModalOpen(false);
  };

  const getSelectedUserDisplay = () => {
    if (formState.selectedUser) {
      return selectedUserName || formState.editModeUserName || 'Selected User';
    }
    return 'Select User';
  };

  return (
    <>
      {/* Warehouse Multi Select */}
      <div className="space-y-2">
        <Label htmlFor="warehouses">Warehouses (Filter for User Selection)</Label>
        <CheckboxMultiSelect
          options={warehouseMultiSelectOptions}
          value={selectedWarehouseIds}
          onChange={handleWarehouseFilterChange}
          placeholder="Select warehouses to filter users"
          displayName="warehouse"
          className="w-full"
          disabled={isWarehouseLoading}
        />
        {selectedWarehouseIds.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Users will be filtered by selected warehouses
          </p>
        )}
      </div>

      {/* User Selection */}
      <div className="space-y-2">
        <Label htmlFor="user">User</Label>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start text-left font-normal"
          onClick={() => setIsUserModalOpen(true)}
        >
          {getSelectedUserDisplay()}
        </Button>
        <p className="text-xs text-muted-foreground">
          Click to open user selection modal
        </p>
      </div>

      {/* User Selection Modal */}
      <UserSelectionModal
        open={isUserModalOpen}
        onOpenChange={setIsUserModalOpen}
        selectedUserId={formState.selectedUser}
        selectedUserName={selectedUserName || formState.editModeUserName}
        onUserSelect={handleUserSelect}
        warehouseIds={selectedWarehouseIds}
        onWarehouseFilterChange={handleWarehouseFilterChange}
      />
    </>
  );
};
