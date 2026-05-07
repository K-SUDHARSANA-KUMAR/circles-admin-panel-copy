'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MasterRecordCheckboxMultiSelect } from '@/components/shared/master-record-checkbox-multiselect';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { WarehouseMultiSelectFilter } from '@/components/shared/warehouse-multiselect-filter';
import { ReportingManagerModal } from '@/components/modals/reporting-manager-modal';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedValue } from '@/store/slices/masterRecordsSlice';

export interface LocationFilters {
  divisionId?: string[];
  channelId?: string[];
  zoneId?: string[];
  subZoneId?: string[];
  warehouseIds?: string[];
  salesPersonId?: string;
  warehouseTypeId?: string;
}

interface LocationFiltersProps {
  filters: LocationFilters;
  onFiltersChange: (filters: LocationFilters) => void;
  className?: string;
  showDivision?: boolean;
  showChannel?: boolean;
  showZone?: boolean;
  showSubZone?: boolean;
  showWarehouse?: boolean;
  showSalesPerson?: boolean;
  showWarehouseType?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  statusFilter?: React.ReactNode; // Optional status filter to render after sales person
  statusFilterColSpanClassName?: string; // Optional className to control grid span for status filter
  allowedDivisionIds?: string[];
  allowedChannelIds?: string[];
  allowedZoneIds?: string[];
  allowedSubZoneIds?: string[];
}

export const LocationFilters = ({ 
  filters, 
  onFiltersChange, 
  className = '',
  showDivision = true,
  showChannel = true,
  showZone = true,
  showSubZone = true,
  showWarehouse = true,
  showSalesPerson = false,
  showWarehouseType = false,
  showSearch = false,
  searchPlaceholder = "Search...",
  searchValue = '',
  onSearchChange,
  statusFilter,
  statusFilterColSpanClassName,
  allowedDivisionIds,
  allowedChannelIds,
  allowedZoneIds,
  allowedSubZoneIds,
}: LocationFiltersProps) => {
  const dispatch = useAppDispatch();
  const [localFilters, setLocalFilters] = useState<LocationFilters>(filters);
  const onFiltersChangeRef = useRef(onFiltersChange);
  const isInitialMount = useRef(true);
  const currentUserId = useAppSelector((state) => state.auth.user?.userId) as string | undefined;
  
  // Sales Person Modal state
  const [isSalesPersonModalOpen, setIsSalesPersonModalOpen] = useState(false);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<{userId: string, name: string} | null>(null);
  const [pendingSalesPerson, setPendingSalesPerson] = useState<{userId: string, name: string} | null>(null);
  
  // Keep ref up to date
  useEffect(() => {
    onFiltersChangeRef.current = onFiltersChange;
  }, [onFiltersChange]);

  // Get selected sales person name for display
  const selectedSalesPersonName = useMemo(() => {
    if (selectedSalesPerson) {
      return selectedSalesPerson.name;
    }
    return 'Select Sales Person';
  }, [selectedSalesPerson]);

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
      console.log('🔔 Filter change detected - Notifying parent (triggering API call):', localFilters);
      onFiltersChangeRef.current(localFilters);
    }
  }, [localFilters, filters]);

  const handleFilterChange = useCallback((key: keyof LocationFilters, value: any) => {
    setLocalFilters(prevFilters => {
      // Convert empty arrays to undefined, otherwise use the value or undefined for falsy values
      const processedValue = Array.isArray(value) && value.length === 0 ? undefined : (value || undefined);
      const newFilters = { ...prevFilters, [key]: processedValue };
      
      // Clear child selections when parent changes
      if (key === 'divisionId') {
        newFilters.channelId = undefined;
        newFilters.zoneId = undefined;
        newFilters.subZoneId = undefined;
      } else if (key === 'channelId') {
        newFilters.zoneId = undefined;
        newFilters.subZoneId = undefined;
      } else if (key === 'zoneId') {
        newFilters.subZoneId = undefined;
      } else if (key === 'warehouseIds') {
        // Clear sales person when warehouse changes
        newFilters.salesPersonId = undefined;
        setSelectedSalesPerson(null); // Clear selected sales person state
        setPendingSalesPerson(null); // Clear pending sales person state
      }

      return newFilters;
    });
  }, []);

  // Sales Person Modal handlers
  const handleSalesPersonModalOpen = useCallback(() => {
    // Set pending selection to current selection when opening modal
    setPendingSalesPerson(selectedSalesPerson);
    setIsSalesPersonModalOpen(true);
  }, [selectedSalesPerson]);

  const handleSalesPersonModalClose = useCallback(() => {
    // Reset pending selection when canceling
    setPendingSalesPerson(null);
    setIsSalesPersonModalOpen(false);
  }, []);

  const handleSalesPersonChange = useCallback((salesPersonId: string | undefined, salesPersonData?: any) => {
    // Only update pending state, don't apply filter yet
    console.log('🔵 Sales Person SELECTED in modal (NOT applied yet):', salesPersonData?.name);
    if (salesPersonId && salesPersonData) {
      setPendingSalesPerson({
        userId: salesPersonId,
        name: salesPersonData.name
      });
    } else {
      setPendingSalesPerson(null);
    }
  }, []);

  const handleSalesPersonConfirm = useCallback(() => {
    // Apply the pending selection to actual filter when confirming
    console.log('✅ CONFIRM clicked - Applying sales person filter now:', pendingSalesPerson?.name);
    if (pendingSalesPerson) {
      setSelectedSalesPerson(pendingSalesPerson);
      handleFilterChange('salesPersonId', pendingSalesPerson.userId);
    } else {
      setSelectedSalesPerson(null);
      handleFilterChange('salesPersonId', undefined);
    }
    setPendingSalesPerson(null);
    setIsSalesPersonModalOpen(false);
  }, [pendingSalesPerson, handleFilterChange]);

  // Handle clearing master record selections when filters change
  useEffect(() => {
    // Use setTimeout to defer the dispatch calls to avoid setState during render
    const timeoutId = setTimeout(() => {
      if (!localFilters.channelId) {
        dispatch(setSelectedValue({ masterName: 'channel', value: '' }));
      }
      if (!localFilters.zoneId) {
        dispatch(setSelectedValue({ masterName: 'zone', value: '' }));
      }
      if (!localFilters.subZoneId) {
        dispatch(setSelectedValue({ masterName: 'subZone', value: '' }));
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [localFilters.channelId, localFilters.zoneId, localFilters.subZoneId, dispatch]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filter Dropdowns */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {/* Division */}
        {showDivision && (
          <MasterRecordCheckboxMultiSelect
            masterName="division"
            value={localFilters.divisionId || []}
            onChange={(value) => handleFilterChange('divisionId', value)}
            placeholder="Division"
            className="w-full"
            displayName="division"
            userId={currentUserId}
          //  userId={currentUserId}
         //   skipStoreUpdate={true}
            filters={
              allowedDivisionIds && allowedDivisionIds.length > 0
                ? { divisionId: allowedDivisionIds }
                : undefined
            }
          />
        )}

        {/* Channel */}
        {showChannel && (
          <MasterRecordCheckboxMultiSelect
            masterName="channel"
            value={localFilters.channelId || []}
            onChange={(value) => handleFilterChange('channelId', value)}
            placeholder="Channel"
            className="w-full"
            displayName="channel"
          //  skipStoreUpdate={true}
            filters={
              allowedChannelIds && allowedChannelIds.length > 0
                ? { channelId: allowedChannelIds } 
                : localFilters.divisionId && localFilters.divisionId.length > 0 
                  ? { divisionId: localFilters.divisionId } 
                  : undefined
            }
            userId={currentUserId}
          />
        )}

        {/* Zone */}
        {showZone && (
          <MasterRecordCheckboxMultiSelect
            masterName="zone"
            value={localFilters.zoneId || []}
            onChange={(value) => handleFilterChange('zoneId', value)}
            placeholder="Zone"
            className="w-full"
            displayName="zone"
           // skipStoreUpdate={true}
            filters={
              allowedZoneIds && allowedZoneIds.length > 0
                ? { zoneId: allowedZoneIds }
                : localFilters.channelId && localFilters.channelId.length > 0
                  ? { channelId: localFilters.channelId }
                  : undefined
            }
            userId={currentUserId}
          />
        )}

        {/* Subzone */}
        {showSubZone && (
          <MasterRecordCheckboxMultiSelect
            masterName="subZone"
            value={localFilters.subZoneId || []}
            onChange={(value) => handleFilterChange('subZoneId', value)}
            placeholder="Subzone"
            className="w-full"
            displayName="subzone"
           // skipStoreUpdate={true}
            filters={
              allowedSubZoneIds && allowedSubZoneIds.length > 0
                ? { subZoneId: allowedSubZoneIds }
                : localFilters.zoneId && localFilters.zoneId.length > 0
                  ? { zoneId: localFilters.zoneId }
                  : undefined
            }
            userId={currentUserId}
          />
        )}

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

        {/* Warehouse Type - Only show if enabled */}
        {showWarehouseType && (
          <div className="lg:col-span-1">
            <MasterRecordDropdown
              masterName="warehouseType"
              value={localFilters.warehouseTypeId || ''}
              onChange={(value) => handleFilterChange('warehouseTypeId', value)}
              placeholder="Warehouse Type"
              className="w-full"
            />
          </div>
        )}

        {/* Sales Person - Only show if enabled */}
        {showSalesPerson && (
          <div className="lg:col-span-1">
            <button
              type="button"
              onClick={handleSalesPersonModalOpen}
              className="h-9 w-full rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-input/50 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 text-left"
            >
              {selectedSalesPersonName}
            </button>
          </div>
        )}

        {/* Status Filter - Only show if provided */}
        {statusFilter && (
          <div className={statusFilterColSpanClassName || "lg:col-span-1"}>
            {statusFilter}
          </div>
        )}
      </div>

      {/* Sales Person Modal */}
      {showSalesPerson && (
        <ReportingManagerModal
          open={isSalesPersonModalOpen}
          selectedManagerId={pendingSalesPerson?.userId}
          onChange={handleSalesPersonChange}
          onConfirm={handleSalesPersonConfirm}
          onCancel={handleSalesPersonModalClose}
          warehouseIds={localFilters.warehouseIds} // Pass selected warehouse IDs for filtering
          modalTitle="Select Sales Person" // Custom title for sales person selection
          initialSelectedOption={pendingSalesPerson ? {
            userId: pendingSalesPerson.userId,
            name: pendingSalesPerson.name
          } : undefined}
        />
      )}
    </div>
  );
};
