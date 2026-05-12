'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IconBuilding } from '@tabler/icons-react';

import { useState, useMemo, useEffect } from 'react';
import { StyledMultiSelect } from '../ui/styled-multi-select';
import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';
import { useProducts } from '@/features/dashboard/products/hooks/useProducts';

interface Option {
  value: string;
  label: string;
}

export const WarehouseManagementModal = ({
  open,
  onOpenChange,
  productId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
}) => {
  const [selectedWarehouses, setSelectedWarehouses] = useState<Option[]>([]);
  const { warehouses } = useWarehouse();
  const { assignWarehousesToProduct, getProduct } = useProducts();
  
  // Fetch product details when productId is available and modal is open
  const productQuery = getProduct(productId);

  const warehouseOptions = useMemo(() => {
    if (!warehouses.data?.data?.items) return [];

    return warehouses.data.data.items.map((warehouse: any) => ({
      value: warehouse.pincode,
      label: warehouse.pincode,
    }));
  }, [warehouses.data?.data?.items]);

  // Effect to handle prefilling existing warehouses and clearing on modal close
  useEffect(() => {
    if (open && productQuery.data?.data?.warehouses && warehouseOptions.length > 0) {
      // Prefill with existing warehouses from product data
      const existingOptions = productQuery.data.data.warehouses
        .map((warehouse: any) => {
          return warehouseOptions.find((option: Option) => option.value === warehouse.warehouseId);
        })
        .filter((option: Option | undefined): option is Option => option !== undefined);
      
      setSelectedWarehouses(existingOptions);
    } else if (!open) {
      // Clear selected warehouses when modal closes
      setSelectedWarehouses([]);
    }
  }, [open, productQuery.data?.data?.warehouses, warehouseOptions]);

  const handleWarehouseChange = (warehouses: Option[]) => {
    setSelectedWarehouses(warehouses);
  };

  const handleAssignWarehouses = () => {
    const warehousesToAssign = selectedWarehouses.map(warehouse => ({
      warehouseId: warehouse.value
    }));

    assignWarehousesToProduct.mutate({
      productId,
      warehouseIds: warehousesToAssign
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setSelectedWarehouses([]);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-visible sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <div className="gap- flex flex-col">
              <div className="flex flex-col gap-1">
                <div className="bg-primary/10 w-fit rounded-full p-2">
                  <IconBuilding className="text-primary h-5 w-5" />
                </div>
                <div className="text-lg font-medium">Manage Warehouses</div>
                <div className="text-sm font-normal text-zinc-500">
                  Assign Warehouses for this product
                </div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <StyledMultiSelect
          options={warehouseOptions}
          value={selectedWarehouses}
          onChange={handleWarehouseChange}
          placeholder="Select warehouses..."
          isMulti={true}
          maxToShow={1}
          isLoading={warehouses.isLoading || productQuery.isLoading}
          isDisabled={warehouses.isError}
        />

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAssignWarehouses}
            disabled={
              selectedWarehouses.length === 0 ||
              assignWarehousesToProduct.isPending
            }
          >
            {assignWarehousesToProduct.isPending ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
