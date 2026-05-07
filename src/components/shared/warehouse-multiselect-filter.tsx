import React, { useState, useMemo } from 'react';
import { WarehouseMultiSelectModal } from '@/components/modals/warehouse-multiselect-modal';
import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';

interface WarehouseMultiSelectFilterProps {
  className?: string;
  selectedWarehouseIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export const WarehouseMultiSelectFilter: React.FC<WarehouseMultiSelectFilterProps> = ({
  className = '',
  selectedWarehouseIds,
  onChange,
  disabled = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingSelectedWarehouseIds, setPendingSelectedWarehouseIds] = useState<string[]>(selectedWarehouseIds);

  // Fetch warehouse details for selected IDs
  const { warehouses } = useWarehouse(undefined, { warehouseIds: selectedWarehouseIds });
  const warehouseItems = warehouses.data?.data?.items || [];

  // Compute label
  const label = useMemo(() => {
    if (selectedWarehouseIds.length === 0) return 'Select Warehouses';
    if (selectedWarehouseIds.length === 1) {
      const warehouse = warehouseItems.find(
        (w: any) =>
          w.warehouseId === selectedWarehouseIds[0] ||
          w.id === selectedWarehouseIds[0] ||
          w._id === selectedWarehouseIds[0]
      );
      return warehouse?.warehouseName || '1 Warehouse';
    }
    return `${selectedWarehouseIds.length} Warehouses`;
  }, [selectedWarehouseIds, warehouseItems]);



  return (
    <>
      <button
        type="button"
        className={`h-9 rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-input/50 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 truncate whitespace-nowrap overflow-hidden text-left ${className}`}
        style={{ color: '#7E7E7E' }}
        onClick={() => {
          setPendingSelectedWarehouseIds(selectedWarehouseIds);
          setIsModalOpen(true);
        }}
        disabled={disabled}
      >
        {label}
      </button>
      <WarehouseMultiSelectModal
        open={isModalOpen}
        selectedWarehouseIds={pendingSelectedWarehouseIds}
        onChange={setPendingSelectedWarehouseIds}
        onCancel={() => {
          onChange(pendingSelectedWarehouseIds);
          setIsModalOpen(false);
        }}
        onConfirm={() => {
          onChange(pendingSelectedWarehouseIds);
          setIsModalOpen(false);
        }}
      />
    </>
  );
};
