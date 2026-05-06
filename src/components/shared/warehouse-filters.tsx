'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LocationFilters, LocationFilters as LocationFiltersType } from '@/components/shared/location-filters';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { SearchInput } from '@/components/ui/search-input';

export interface WarehouseFilters {
  divisionId?: string;
  channelId?: string;
  zoneId?: string;
  subZoneId?: string;
  warehouseTypeId?: string;
  search?: string;
}

interface WarehouseFiltersProps {
  filters: WarehouseFilters;
  onFiltersChange: (filters: WarehouseFilters) => void;
  className?: string;
}

export const WarehouseFilters = ({ 
  filters, 
  onFiltersChange, 
  className = '' 
}: WarehouseFiltersProps) => {
  const [localFilters, setLocalFilters] = useState<WarehouseFilters>(filters);
  const onFiltersChangeRef = useRef(onFiltersChange);
  const isInitialMount = useRef(true);
  
  // Keep ref up to date
  useEffect(() => {
    onFiltersChangeRef.current = onFiltersChange;
  }, [onFiltersChange]);

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Notify parent when local filters change (but not on initial mount or prop updates)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Only notify if filters actually changed from user interaction
    if (JSON.stringify(localFilters) !== JSON.stringify(filters)) {
      onFiltersChangeRef.current(localFilters);
    }
  }, [localFilters, filters]);

  const handleLocationFilterChange = useCallback((locationFilters: LocationFiltersType) => {
    setLocalFilters(prevFilters => ({
      ...prevFilters, 
      divisionId: Array.isArray(locationFilters.divisionId) ? locationFilters.divisionId[0] : locationFilters.divisionId,
      channelId: Array.isArray(locationFilters.channelId) ? locationFilters.channelId[0] : locationFilters.channelId,
      zoneId: Array.isArray(locationFilters.zoneId) ? locationFilters.zoneId[0] : locationFilters.zoneId,
      subZoneId: Array.isArray(locationFilters.subZoneId) ? locationFilters.subZoneId[0] : locationFilters.subZoneId,
    }));
  }, []);

  const handleWarehouseTypeChange = useCallback((value: string) => {
    setLocalFilters(prevFilters => ({
      ...prevFilters, 
      warehouseTypeId: value || undefined
    }));
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setLocalFilters(prevFilters => ({
      ...prevFilters, 
      search: value || undefined
    }));
  }, []);

  // Convert to location filters format
  const locationFilters = useMemo(() => ({
    divisionId: localFilters.divisionId ? [localFilters.divisionId] : [],
    channelId: localFilters.channelId ? [localFilters.channelId] : [],
    zoneId: localFilters.zoneId ? [localFilters.zoneId] : [],
    subZoneId: localFilters.subZoneId ? [localFilters.subZoneId] : [],
    warehouseIds: [],
  }), [localFilters.divisionId, localFilters.channelId, localFilters.zoneId, localFilters.subZoneId]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <SearchInput
        placeholder="Search warehouse name"
        className="w-full"
        value={localFilters.search || ''}
        onChange={handleSearchChange}
      />

      {/* Location Filters */}
      <LocationFilters
        filters={locationFilters}
        onFiltersChange={handleLocationFilterChange}
        showWarehouse={false}
        className="w-full"
      />

      {/* Warehouse Type */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <MasterRecordDropdown
          masterName="warehouseType"
          value={localFilters.warehouseTypeId || ''}
          onChange={handleWarehouseTypeChange}
          placeholder="Warehouse Type"
          className="w-full"
        />
      </div>
    </div>
  );
};

