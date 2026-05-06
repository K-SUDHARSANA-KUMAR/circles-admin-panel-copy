'use client';

import { useState, useEffect, useCallback } from 'react';
import { MasterRecordCheckboxMultiSelect } from '@/components/shared/master-record-checkbox-multiselect';
import { WarehouseMultiSelectFilter } from '@/components/shared/warehouse-multiselect-filter';
import { SalesPersonDropdown } from '@/components/shared/sales-person-dropdown';
import { useAppDispatch } from '@/store/hooks';
import { setSelectedValue } from '@/store/slices/masterRecordsSlice';
import { useUsers } from '@/features/user-managment/users/hooks/useUsers';

export interface LocationFilters {
  divisionId?: string[];
  channelId?: string[];
  zoneId?: string[];
  subZoneId?: string[];
  warehouseIds?: string[];
  salesPersonId?: string;
}

interface LocationFiltersProps {
  filters: LocationFilters;
  onFiltersChange: (filters: LocationFilters) => void;
  className?: string;
  showWarehouse?: boolean;
  showSalesPerson?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export const LocationFilters = ({ 
  filters, 
  onFiltersChange, 
  className = '',
  showWarehouse = true,
  showSalesPerson = false,
  showSearch = false,
  searchPlaceholder = "Search...",
  searchValue = '',
  onSearchChange
}: LocationFiltersProps) => {
  const dispatch = useAppDispatch();
  const [localFilters, setLocalFilters] = useState<LocationFilters>(filters);

  // Get sales persons data when warehouse is selected
  const { users } = useUsers(
    localFilters.warehouseIds && localFilters.warehouseIds.length > 0
      ? {
          warehouseId: localFilters.warehouseIds, // Pass all selected warehouse IDs as array
          nonPaginated: 'true',
        }
      : undefined
  );

  // Debug logging
  console.log('LocationFilters - warehouseIds:', localFilters.warehouseIds);
  console.log('LocationFilters - users query enabled:', !!localFilters.warehouseIds && localFilters.warehouseIds.length > 0);
  console.log('LocationFilters - users data:', users.data);

  const salesPersonOptions = users.data?.data?.items || [];
  const isLoadingSalesPersons = users.isLoading;

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = useCallback((key: keyof LocationFilters, value: any) => {
    // Convert empty arrays to undefined, otherwise use the value or undefined for falsy values
    const processedValue = Array.isArray(value) && value.length === 0 ? undefined : (value || undefined);
    const newFilters = { ...localFilters, [key]: processedValue };
    
    // Clear child selections when parent changes
    if (key === 'divisionId') {
      newFilters.channelId = undefined;
      newFilters.zoneId = undefined;
      newFilters.subZoneId = undefined;
      dispatch(setSelectedValue({ masterName: 'channel', value: '' }));
      dispatch(setSelectedValue({ masterName: 'zone', value: '' }));
      dispatch(setSelectedValue({ masterName: 'subZone', value: '' }));
    } else if (key === 'channelId') {
      newFilters.zoneId = undefined;
      newFilters.subZoneId = undefined;
      dispatch(setSelectedValue({ masterName: 'zone', value: '' }));
      dispatch(setSelectedValue({ masterName: 'subZone', value: '' }));
    } else if (key === 'zoneId') {
      newFilters.subZoneId = undefined;
      dispatch(setSelectedValue({ masterName: 'subZone', value: '' }));
    } else if (key === 'warehouseIds') {
      // Clear sales person when warehouse changes
      newFilters.salesPersonId = undefined;
    }

    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  }, [localFilters, dispatch, onFiltersChange]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filter Dropdowns */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {/* Division */}
        <MasterRecordCheckboxMultiSelect
          masterName="division"
          value={localFilters.divisionId || []}
          onChange={(value) => handleFilterChange('divisionId', value)}
          placeholder="Division"
          className="w-full"
          displayName="division"
        />

        {/* Channel */}
        <MasterRecordCheckboxMultiSelect
          masterName="channel"
          value={localFilters.channelId || []}
          onChange={(value) => handleFilterChange('channelId', value)}
          placeholder="Channel"
          className="w-full"
          displayName="channel"
          filters={localFilters.divisionId && localFilters.divisionId.length > 0 ? { divisionId: localFilters.divisionId } : undefined}
        />

        {/* Zone */}
        <MasterRecordCheckboxMultiSelect
          masterName="zone"
          value={localFilters.zoneId || []}
          onChange={(value) => handleFilterChange('zoneId', value)}
          placeholder="Zone"
          className="w-full"
          displayName="zone"
          filters={localFilters.channelId && localFilters.channelId.length > 0 ? { channelId: localFilters.channelId } : undefined}
        />

        {/* Subzone */}
        <MasterRecordCheckboxMultiSelect
          masterName="subZone"
          value={localFilters.subZoneId || []}
          onChange={(value) => handleFilterChange('subZoneId', value)}
          placeholder="Subzone"
          className="w-full"
          displayName="subzone"
          filters={localFilters.zoneId && localFilters.zoneId.length > 0 ? { zoneId: localFilters.zoneId } : undefined}
        />

        {/* Warehouse - Only show if enabled */}
        {showWarehouse && (
          <div className="lg:col-span-1">
            <WarehouseMultiSelectFilter
              selectedWarehouseIds={localFilters.warehouseIds || []}
              onChange={(value) => handleFilterChange('warehouseIds', value)}
              className="w-full"
            />
          </div>
        )}

        {/* Sales Person - Only show if enabled */}
        {showSalesPerson && (
          <div className="lg:col-span-1">
            <SalesPersonDropdown
              value={localFilters.salesPersonId}
              onChange={(value) => handleFilterChange('salesPersonId', value)}
              placeholder={
                !localFilters.warehouseIds || localFilters.warehouseIds.length === 0
                  ? 'Select Warehouse First'
                  : isLoadingSalesPersons
                    ? 'Please Wait...'
                    : 'Select Sales Person'
              }
              className="w-full"
              disabled={!localFilters.warehouseIds || localFilters.warehouseIds.length === 0 || isLoadingSalesPersons}
              salesPersons={salesPersonOptions}
            />
          </div>
        )}
      </div>
    </div>
  );
};
