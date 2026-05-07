import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import { MasterRecordSelect } from '@/components/shared/master-record-select';
import { MasterRecordCheckboxMultiSelect } from '@/components/shared/master-record-checkbox-multiselect';
import { Label } from '@/components/ui/label';
import {
  Warehouse,
  warehousesApi,
} from '@/features/warehouse-managment/api/warehouses';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import { useAppSelector } from '@/store/hooks';
import { usePjpConfig } from '@/features/config-management/pjp-config/hooks/usePjpConfig';
import { LocationFilters as LocationFiltersComponent } from '@/components/shared/location-filters';
import type { LocationFilters as LocationFiltersType } from '@/components/shared/location-filters';

interface WarehouseMultiSelectModalProps {
  open: boolean;
  selectedWarehouseIds: string[];
  onChange: (ids: string[]) => void;
  onConfirm: (optimizationParams?: {
    maxOutletPerDay: number;
    outletActivityDuration: number;
    breakHours: number;
    maxTravelDistancePerDay: number;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
  onOptimizePjp?: () => void;
  onCreatePjp?: () => void;
  pincode?: string;
  // User mapping props for pre-selecting filters
  selectedDivisionIds?: string[];
  selectedChannelIds?: string[];
  selectedZoneIds?: string[];
  selectedSubZoneIds?: string[];
  // Show optimization fields flag
  showOptimizationFields?: boolean;
  // Optional userId to scope warehouses to a specific user (overrides selector)
  userId?: string;
  // Disable all checkboxes (for read-only mode)
  disabled?: boolean;
}

export const WarehouseMultiSelectModal: React.FC<
  WarehouseMultiSelectModalProps
> = ({
  open,
  selectedWarehouseIds,
  onChange,
  onConfirm,
  onCancel,
  loading = false,
  onOptimizePjp,
  onCreatePjp,
  pincode,
  selectedDivisionIds: userDivisionIds = [],
  selectedChannelIds: userChannelIds = [],
  selectedZoneIds: userZoneIds = [],
  selectedSubZoneIds: userSubZoneIds = [],
  showOptimizationFields = false,
  userId: overrideUserId,
  disabled = false,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const user = useAppSelector((state) => state.auth.user);
  const [search, setSearch] = useState('');
  const [locationFilters, setLocationFilters] = useState<LocationFiltersType>({});

  // Optimization parameters state - use string to allow empty input
  const [maxOutletPerDay, setMaxOutletPerDay] = useState<string>('');
  const [outletActivityDuration, setOutletActivityDuration] = useState<string>('');
  const [breakHours, setBreakHours] = useState<string>('');
  const [maxTravelDistancePerDay, setMaxTravelDistancePerDay] = useState<string>('');

  // Single warehouse selection for optimization mode
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  
  // Track if PJP config data has been loaded
  const [isConfigLoaded, setIsConfigLoaded] = useState<boolean>(false);
  const [configError, setConfigError] = useState<string>('');

  // PJP Config hook for fetching warehouse-specific config
  const { pjpConfigs } = usePjpConfig({
    warehouseId: selectedWarehouseId || undefined
  });

  // Populate optimization fields when PJP config is loaded
  useEffect(() => {
    if (!showOptimizationFields) return;
    
    // Reset states when warehouse changes
    if (!selectedWarehouseId) {
      setMaxOutletPerDay('');
      setOutletActivityDuration('');
      setBreakHours('');
      setMaxTravelDistancePerDay('');
      setIsConfigLoaded(false);
      setConfigError('');
      return;
    }
    
    // Handle loading state
    if (pjpConfigs.isLoading) {
      setConfigError('');
      setIsConfigLoaded(false);
      return;
    }
    
    // Handle error or no data
    if (pjpConfigs.isError || !pjpConfigs.data?.data?.items || pjpConfigs.data.data.items.length === 0) {
      setConfigError('No PJP config found for this warehouse');
      setIsConfigLoaded(false);
      setMaxOutletPerDay('');
      setOutletActivityDuration('');
      setBreakHours('');
      setMaxTravelDistancePerDay('');
      return;
    }
    
    // Handle successful data load
    if (pjpConfigs.data?.data?.items && pjpConfigs.data.data.items.length > 0) {
      const config = pjpConfigs.data.data.items[0];
      
      setMaxOutletPerDay(config.MaxOutletCountPerDay ? String(config.MaxOutletCountPerDay) : '');
      setOutletActivityDuration(config.outletActivityDurationInMins ? String(config.outletActivityDurationInMins) : '');
      setBreakHours(config.breakHoursInMins ? String(config.breakHoursInMins) : '');
      setMaxTravelDistancePerDay(config.maxTravelDistancePerDay ? String(config.maxTravelDistancePerDay) : '');
      setIsConfigLoaded(true);
      setConfigError('');
    }
  }, [pjpConfigs.data, pjpConfigs.isLoading, pjpConfigs.isError, showOptimizationFields, selectedWarehouseId]);

  // Fetch master records for channels and warehouse types
  const { records: channelRecords } = useMasterRecords(
    'channel',
    undefined,
    1,
    1000,
    true
  );
  const { records: warehouseTypeRecords } = useMasterRecords(
    'warehouseType',
    undefined,
    1,
    1000,
    true
  );

  // Create lookup maps for displaying names
  const channelLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    if (channelRecords?.data) {
      channelRecords.data.forEach((record: any) => {
        lookup[record.channelId] =
          record.channelName || record.name || record.channelId;
      });
    }
    return lookup;
  }, [channelRecords?.data]);

  const warehouseTypeLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    if (warehouseTypeRecords?.data) {
      warehouseTypeRecords.data.forEach((record: any) => {
        lookup[record.warehouseTypeId] =
          record.warehouseTypeName || record.name || record.warehouseTypeId;
      });
    }
    return lookup;
  }, [warehouseTypeRecords?.data]);

  // Debug logging when modal opens
  useEffect(() => {
    if (open) {
      setPageIndex(0);
      setSearch('');
    }
    // Only run when modal is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset pagination when location filters change
  useEffect(() => {
    setPageIndex(0);
  }, [locationFilters]);

  // Reset page index when pincode or user mapping values actually change
  const lastKeyRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentKey = JSON.stringify({
      pincode,
      divisionIds: userDivisionIds,
      channelIds: userChannelIds,
      zoneIds: userZoneIds,
      subZoneIds: userSubZoneIds,
    });
    if (lastKeyRef.current !== currentKey) {
      lastKeyRef.current = currentKey;
      setPageIndex(0);
    }
  }, [pincode, userDivisionIds, userChannelIds, userZoneIds, userSubZoneIds]);

  const initialPagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPageIndex(0); // Reset to first page
  };

  // Use React Query directly instead of useWarehouse hook to avoid Redux state conflicts
  // Determine effective filters combining user-mapped defaults with modal selections
  const effectiveDivisionIds = useMemo(
    () => (locationFilters.divisionId && locationFilters.divisionId.length > 0 ? locationFilters.divisionId : userDivisionIds),
    [locationFilters.divisionId, userDivisionIds]
  );
  const effectiveChannelIds = useMemo(
    () => (locationFilters.channelId && locationFilters.channelId.length > 0 ? locationFilters.channelId : userChannelIds),
    [locationFilters.channelId, userChannelIds]
  );
  const effectiveZoneIds = useMemo(
    () => (locationFilters.zoneId && locationFilters.zoneId.length > 0 ? locationFilters.zoneId : userZoneIds),
    [locationFilters.zoneId, userZoneIds]
  );
  const effectiveSubZoneIds = useMemo(
    () => (locationFilters.subZoneId && locationFilters.subZoneId.length > 0 ? locationFilters.subZoneId : userSubZoneIds),
    [locationFilters.subZoneId, userSubZoneIds]
  );

  // Prefer userId from props if provided, else fallback to logged-in user
  const effectiveUserId = useMemo(() => {
    return overrideUserId || user?.userId || undefined;
  }, [overrideUserId, user?.userId]);

  const warehousesQuery = useQuery({
    queryKey: [
      'modal-warehouses',
      {
        skip: pageIndex * pageSize,
        limit: pageSize,
        divisionId: effectiveDivisionIds.length > 0 ? effectiveDivisionIds : undefined,
        channelId: effectiveChannelIds.length > 0 ? effectiveChannelIds : undefined,
        zoneId: effectiveZoneIds.length > 0 ? effectiveZoneIds : undefined,
        subZoneId: effectiveSubZoneIds.length > 0 ? effectiveSubZoneIds : undefined,
        search: search || undefined,
        pincode: pincode || undefined,
        userId: effectiveUserId,
      },
    ],
    queryFn: async () => {
      const filters = {
        skip: pageIndex * pageSize,
        limit: pageSize,
        divisionId: effectiveDivisionIds.length > 0 ? effectiveDivisionIds : undefined,
        channelId: effectiveChannelIds.length > 0 ? effectiveChannelIds : undefined,
        zoneId: effectiveZoneIds.length > 0 ? effectiveZoneIds : undefined,
        subZoneId: effectiveSubZoneIds.length > 0 ? effectiveSubZoneIds : undefined,
        search: search || undefined,
        pincode: pincode || undefined,
        userId: effectiveUserId,
      };
      return await warehousesApi.getAll(filters);
    },
    enabled: open,
  });

  // Log when warehouses are fetched
  useEffect(() => {
    if (warehousesQuery.data?.data?.items) {
      console.log(
        'Modal: Fetched warehouses:',
        warehousesQuery.data.data.items.length,
        'items'
      );
      // Log the first warehouse to see its structure
      if (warehousesQuery.data.data.items.length > 0) {
        console.log(
          'First warehouse structure:',
          warehousesQuery.data.data.items[0]
        );
      }
    }
  }, [warehousesQuery.data?.data?.items]);

  const warehouses = warehousesQuery.data?.data?.items || [];
  const isLoading = warehousesQuery.isLoading || loading;
  const error = warehousesQuery.error;
  const totalItems = warehousesQuery.data?.data?.totalItems || 0;

  // Table columns with checkbox for multi-select or radio for single select
  const columns = [
    {
      id: 'select',
      header: ({ table }: any) => {
        if (showOptimizationFields) {
          // For optimization mode, show "Select" header without select all functionality
          return <span className="text-sm font-medium">Select</span>;
        }

        // For normal mode, show select all checkbox
        const currentPageWarehouseIds = table
          .getRowModel()
          .rows.map((row: any) => {
            // Try multiple possible ID field names
            const warehouseId =
              row.original.warehouseId ||
              row.original.id ||
              row.original._id ||
              row.original.warehouse_id;
            return warehouseId;
          })
          .filter(Boolean); // Filter out any undefined values

        const hasWarehouses = currentPageWarehouseIds.length > 0;
        const allCurrentPageSelected =
          hasWarehouses &&
          currentPageWarehouseIds.every((warehouseId: string) =>
            selectedWarehouseIds.includes(warehouseId)
          );
        // If there are no warehouses, the checkbox should be unchecked and disabled
        return (
          <Checkbox
            checked={hasWarehouses ? allCurrentPageSelected : false}
            disabled={!hasWarehouses || disabled}
            onCheckedChange={(value) => {
              if (!hasWarehouses || disabled) return;
              if (value) {
                // Select all warehouses on current page
                const newSelectedIds = [...selectedWarehouseIds];
                currentPageWarehouseIds.forEach((warehouseId: string) => {
                  if (!newSelectedIds.includes(warehouseId)) {
                    newSelectedIds.push(warehouseId);
                  }
                });
                onChange(newSelectedIds);
                console.log(
                  'Modal: Selected all on page, new IDs:',
                  newSelectedIds
                );
              } else {
                // Deselect all warehouses on current page
                const newSelectedIds = selectedWarehouseIds.filter(
                  (warehouseId: string) =>
                    !currentPageWarehouseIds.includes(warehouseId)
                );
                onChange(newSelectedIds);
                console.log(
                  'Modal: Deselected all on page, new IDs:',
                  newSelectedIds
                );
              }
            }}
            aria-label="Select all"
          />
        );
      },
      cell: ({ row }: any) => {
        // Try multiple possible ID field names
        const warehouseId =
          row.original.warehouseId ||
          row.original.id ||
          row.original._id ||
          row.original.warehouse_id;

        if (!warehouseId) {
          console.warn('Modal: No warehouse ID found for row:', row.original);
          return null;
        }

        if (showOptimizationFields) {
          // For optimization mode, use radio button for single selection
          return (
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id={warehouseId}
                name="warehouse-selection"
                value={warehouseId}
                checked={selectedWarehouseId === warehouseId}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedWarehouseId(value);
                  onChange([value]); // Pass as array to maintain compatibility
                }}
                className="h-4 w-4 text-secondary focus:ring-secondary border-gray-300"
              />
            </div>
          );
        }

        // For normal mode, use checkbox for multi-selection
        const isSelected = selectedWarehouseIds.includes(warehouseId);

        return (
          <Checkbox
            checked={isSelected}
            disabled={disabled}
            onCheckedChange={(value) => {
              if (!warehouseId || disabled) return;
              if (value) {
                const newIds = [...selectedWarehouseIds, warehouseId];
                onChange(newIds);
                console.log(
                  'Modal: Selected warehouse',
                  warehouseId,
                  'new IDs:',
                  newIds
                );
              } else {
                const newIds = selectedWarehouseIds.filter(
                  (wid) => wid !== warehouseId
                );
                onChange(newIds);
                console.log(
                  'Modal: Deselected warehouse',
                  warehouseId,
                  'new IDs:',
                  newIds
                );
              }
            }}
            aria-label="Select row"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'warehouseName',
      header: 'Warehouse Name',
    },
    {
      accessorKey: 'channelId',
      header: 'Channel',
      cell: ({ row }: any) => {
        const channelId = row.original.channelId;
        return channelLookup[channelId] || channelId || '-';
      },
    },
    {
      accessorKey: 'warehouseTypeId',
      header: 'Warehouse Type',
      cell: ({ row }: any) => {
        const warehouseTypeId = row.original.warehouseTypeId;
        return warehouseTypeLookup[warehouseTypeId] || warehouseTypeId || '-';
      },
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] max-w-6xl flex-col p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Select Warehouses</DialogTitle>
        </DialogHeader>

        {/* Modal Content - Scrollable Area */}
        <div className="flex flex-1 flex-col overflow-hidden px-6 py-4">
          {/* Search Bar */}
          <div className="flex-shrink-0 mb-4">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search warehouses..."
                value={search}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table Section - Flexible Height */}
          <div className="min-h-0 flex-1 mb-4">
          {/* Location Filters within modal */}
          <div className="mb-4 w-full">
            <LocationFiltersComponent
              filters={locationFilters}
              onFiltersChange={setLocationFilters}
              showWarehouse={false}
              showWarehouseType={true}
              showSalesPerson={false}
              allowedDivisionIds={userDivisionIds}
              allowedChannelIds={userChannelIds}
              allowedZoneIds={userZoneIds}
              allowedSubZoneIds={userSubZoneIds}
            />
          </div>
            {isLoading || loading ? (
              <div className="flex h-full items-center justify-center">
                <Loading text="Loading warehouses..." />
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center">
                <GenericError
                  text={
                    typeof error === 'string'
                      ? error
                      : error?.message || 'Error'
                  }
                />
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <DataTable
                  columns={columns}
                  data={warehouses}
                  pageCount={Math.ceil(totalItems / pageSize)}
                  totalItems={totalItems}
                  onPaginationChange={({
                    pageIndex: newPageIndex,
                    pageSize: newPageSize,
                  }) => {
                    if (newPageSize !== pageSize) {
                      setPageSize(newPageSize);
                      setPageIndex(0); // Reset to first page when page size changes
                    } else {
                      setPageIndex(newPageIndex);
                    }
                  }}
                  manualPagination={true}
                  initialPagination={initialPagination}
                  isLoading={isLoading}
            tableId="warehouse-multiselect-table"
            isDownload={false}
            isColumnDisplay={false}

                />
              </div>
            )}
          </div>

          {/* Optimization Fields - Only shown when showOptimizationFields is true */}
          {showOptimizationFields && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-semibold text-foreground">
                Optimization Parameters
              </h3>
              
              {/* Loading State */}
              {selectedWarehouseId && pjpConfigs.isLoading && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-secondary"></div>
                      <p className="mt-4 text-sm text-gray-600">Loading warehouse configuration...</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error message when no config found */}
              {configError && selectedWarehouseId && !pjpConfigs.isLoading && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-600">{configError}</p>
                </div>
              )}
              
              {/* Show fields only when not loading */}
              {!pjpConfigs.isLoading && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Max Outlet Per Day */}
                <div className="space-y-2">
                  <Label htmlFor="maxOutletPerDay">
                    Max Outlet Per Day *
                  </Label>
                  <Input
                    id="maxOutletPerDay"
                    type="text"
                    value={maxOutletPerDay}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow numbers
                      if (value === '' || /^\d+$/.test(value)) {
                        setMaxOutletPerDay(value);
                      }
                    }}
                    placeholder="Enter max outlet count per day"
                    disabled={!isConfigLoaded || !!configError}
                    className={!isConfigLoaded || configError ? "bg-gray-100 cursor-not-allowed" : ""}
                  />
                </div>

                {/* Outlet Activity Duration */}
                <div className="space-y-2">
                  <Label htmlFor="outletActivityDuration">
                    Outlet Activity Duration (minutes) *
                  </Label>
                  <Input
                    id="outletActivityDuration"
                    type="text"
                    value={outletActivityDuration}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow numbers
                      if (value === '' || /^\d+$/.test(value)) {
                        setOutletActivityDuration(value);
                      }
                    }}
                    placeholder="Enter outlet activity duration"
                    disabled={!isConfigLoaded || !!configError}
                    className={!isConfigLoaded || configError ? "bg-gray-100 cursor-not-allowed" : ""}
                  />
                </div>

                {/* Break Hours */}
                <div className="space-y-2">
                  <Label htmlFor="breakHours">
                    Break Hours (minutes) *
                  </Label>
                  <Input
                    id="breakHours"
                    type="text"
                    value={breakHours}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow numbers
                      if (value === '' || /^\d+$/.test(value)) {
                        setBreakHours(value);
                      }
                    }}
                    placeholder="Enter break hours in minutes"
                    disabled={!isConfigLoaded || !!configError}
                    className={!isConfigLoaded || configError ? "bg-gray-100 cursor-not-allowed" : ""}
                  />
                </div>

                {/* Max Travel Distance Per Day */}
                <div className="space-y-2">
                  <Label htmlFor="maxTravelDistancePerDay">
                    Max Travel Distance Per Day (km) *
                  </Label>
                  <Input
                    id="maxTravelDistancePerDay"
                    type="text"
                    value={maxTravelDistancePerDay}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow numbers
                      if (value === '' || /^\d+$/.test(value)) {
                        setMaxTravelDistancePerDay(value);
                      }
                    }}
                    placeholder="Enter max travel distance"
                    disabled={!isConfigLoaded || !!configError}
                    className={!isConfigLoaded || configError ? "bg-gray-100 cursor-not-allowed" : ""}
                  />
                </div>
              </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions - Fixed at Bottom */}
        <div className="bg-background flex justify-end gap-2 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              console.log(
                'Modal: Confirming selection with IDs:',
                selectedWarehouseIds
              );
              if (showOptimizationFields) {
                // Pass optimization parameters when in optimization mode
                onConfirm({
                  maxOutletPerDay: parseInt(maxOutletPerDay) || 0,
                  outletActivityDuration: parseInt(outletActivityDuration) || 0,
                  breakHours: parseInt(breakHours) || 0,
                  maxTravelDistancePerDay: parseInt(maxTravelDistancePerDay) || 0,
                });
              } else {
                // Normal mode without optimization params
                onConfirm();
              }
            }}
            disabled={
              showOptimizationFields 
                ? !isConfigLoaded || !!configError
                : selectedWarehouseIds.length === 0
            }
          >
            {showOptimizationFields 
              ? (isConfigLoaded && !configError && selectedWarehouseIds.length > 0 ? `Optimize (${selectedWarehouseIds.length})` : 'Confirm')
              : `Confirm${selectedWarehouseIds.length > 0 ? ` (${selectedWarehouseIds.length})` : ''}`
            }
          </Button>
          {onCreatePjp && (
            <Button
              type="button"
              onClick={() => {
                console.log('Modal: Creating PJP for all warehouses');
                onCreatePjp();
              }}
              disabled={selectedWarehouseIds.length > 0}
            >
              Create PJP
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WarehouseMultiSelectModal;
