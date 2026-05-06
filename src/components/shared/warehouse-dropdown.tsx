import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback } from 'react';

interface Warehouse {
  warehouseId: string;
  warehouseName: string;
}

interface WarehouseDropdownProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  defaultSelect?: boolean;
  disabled?: boolean;
  channelId?: string; 
  userId?: string;
}

export const WarehouseDropdown = ({
  value,
  onChange,
  placeholder = 'Select Warehouse',
  className,
  defaultSelect = false,
  disabled = false,
  channelId,
  userId,
}: WarehouseDropdownProps) => {
  // Only include channelId if it is not undefined, null, or empty string
  const warehouseFilters: Record<string, any> = { nonPaginated: true };
  if (channelId !== undefined && channelId !== null && channelId !== '') {
    warehouseFilters['channelId'] = channelId;
  }
  if (userId) {
    warehouseFilters['userId'] = userId;
  }
  const { warehouses } = useWarehouse(
    undefined,
    warehouseFilters
  );
  const [selectedValue, setSelectedValue] = useState<string | undefined>(value);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Only set default value if defaultSelect is true and no value is provided
    if (defaultSelect && !value && warehouses.data?.data?.items?.length > 0) {
      const firstWarehouse = warehouses.data.data.items[0];
      setSelectedValue(firstWarehouse.warehouseId);
      onChange?.(firstWarehouse.warehouseId);
    } else {
      setSelectedValue(value);
    }
  }, [value, warehouses.data?.data?.items, onChange, defaultSelect]);

  // Get warehouse records
  const warehouseRecords = warehouses.data?.data?.items || [];

  // Filter warehouses based on search term
  const filteredWarehouses = useMemo(() => {
    if (!searchTerm.trim()) return warehouseRecords;
    
    return warehouseRecords.filter((warehouse: Warehouse) => {
      return warehouse.warehouseName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [warehouseRecords, searchTerm]);

  const handleValueChange = (newValue: string) => {
    if (newValue === 'select-warehouse') {
      setSelectedValue(undefined);
      onChange?.(undefined);
    } else {
      setSelectedValue(newValue);
      onChange?.(newValue);
    }
  };

  // Clear search when dropdown closes
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSearchTerm('');
    }
  }, []);

  return (
    <Select
      value={selectedValue ?? ''}
      onValueChange={handleValueChange}
      disabled={disabled}
      onOpenChange={handleOpenChange}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {/* Show search input when there are more than 2 warehouses */}
        {warehouseRecords.length > 2 && (
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search warehouses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="pl-9 w-full"
              />
            </div>
          </div>
        )}
        
        <SelectItem value="select-warehouse">Select Warehouse</SelectItem>
        {filteredWarehouses.map((warehouse: Warehouse) => (
          <SelectItem key={warehouse.warehouseId} value={warehouse.warehouseId}>
            {warehouse.warehouseName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};