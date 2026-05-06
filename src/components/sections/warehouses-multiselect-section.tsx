import React, { useState, useEffect, useMemo } from 'react';
import {
  Warehouse,
  warehousesApi,
} from '@/features/warehouse-managment/api/warehouses';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WarehouseMultiSelectModal } from '@/components/modals/warehouse-multiselect-modal';
import { DataTable } from '@/components/ui/data-table';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { MasterRecordCheckboxMultiSelect } from '@/components/shared/master-record-checkbox-multiselect';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';

interface WarehouseMultiSelectSectionProps {
  selectedWarehouseIds: string[];
  onChange: (ids: string[]) => void;
  channelId?: string;
  warehouseTypeId?: string;
  disabled?: boolean;
  hidePaginationAndFilters?: boolean; // Hide both filters and pagination
  hideFilters?: boolean; // Hide only filters, keep pagination
  hidePagination?: boolean; // Hide only pagination, keep filters
  pincode?: string;
  requirePincode?: boolean; // New prop to indicate if pincode is required for this context
  requireUserMapping?: boolean; // New prop to indicate if user mapping selections are required
  // User mapping props for pre-selecting filters
  selectedDivisionIds?: string[];
  selectedChannelIds?: string[];
  selectedZoneIds?: string[];
  selectedSubZoneIds?: string[];
}

const PAGE_SIZE = 10;

export const WarehouseMultiSelectSection: React.FC<
  WarehouseMultiSelectSectionProps
> = ({
  selectedWarehouseIds,
  onChange,
  channelId,
  warehouseTypeId,
  disabled,
  hidePaginationAndFilters = false,
  hideFilters = false,
  hidePagination = false,
  pincode,
  requirePincode = false, // Default to false - pincode not required by default
  requireUserMapping = true, // Default to true - user mapping required by default
  selectedDivisionIds = [],
  selectedChannelIds = [],
  selectedZoneIds = [],
  selectedSubZoneIds = [],
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingSelectedWarehouseIds, setPendingSelectedWarehouseIds] =
    useState<string[]>(selectedWarehouseIds);

  const [pageIndex, setPageIndex] = useState(0);
  const [filterDivisionIds, setFilterDivisionIds] = useState<string[]>([]);
  const [filterChannelIds, setFilterChannelIds] = useState<string[]>([]);
  const [filterZoneIds, setFilterZoneIds] = useState<string[]>([]);
  const [filterSubZoneIds, setFilterSubZoneIds] = useState<string[]>([]);
  const [filterWarehouseTypeIds, setFilterWarehouseTypeIds] =
    useState<string[]>([]);

  // Keep pendingSelectedWarehouseIds in sync with selectedWarehouseIds prop
  useEffect(() => {
    setPendingSelectedWarehouseIds(selectedWarehouseIds);
  }, [selectedWarehouseIds]);

  // Update filters when user mapping changes - only when values actually change
  useEffect(() => {
    const hasChanges = 
      JSON.stringify(filterDivisionIds) !== JSON.stringify(selectedDivisionIds) ||
      JSON.stringify(filterChannelIds) !== JSON.stringify(selectedChannelIds) ||
      JSON.stringify(filterZoneIds) !== JSON.stringify(selectedZoneIds) ||
      JSON.stringify(filterSubZoneIds) !== JSON.stringify(selectedSubZoneIds);

    if (hasChanges) {
      setFilterDivisionIds(selectedDivisionIds);
      setFilterChannelIds(selectedChannelIds);
      setFilterZoneIds(selectedZoneIds);
      setFilterSubZoneIds(selectedSubZoneIds);
      setPageIndex(0); // Reset to first page when filters change
    }
  }, [selectedDivisionIds, selectedChannelIds, selectedZoneIds, selectedSubZoneIds, filterDivisionIds, filterChannelIds, filterZoneIds, filterSubZoneIds]);

  // Determine if filters should be hidden
  const shouldHideFilters = hidePaginationAndFilters || hideFilters;
  // Determine if pagination should be hidden  
  const shouldHidePagination = hidePaginationAndFilters || hidePagination;

  // Check if all required mapping selections are made (only if requireUserMapping is true)
  const hasRequiredSelections = requireUserMapping ? (
    selectedDivisionIds.length > 0 && 
    selectedChannelIds.length > 0 && 
    selectedZoneIds.length > 0 && 
    selectedSubZoneIds.length > 0
  ) : true;

  // Reset pagination when filters change (do not reset when selection count changes)
  useEffect(() => {
    setPageIndex(0);
  }, [filterDivisionIds, filterChannelIds, filterZoneIds, filterSubZoneIds, filterWarehouseTypeIds]);

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

  // Use React Query to fetch warehouses based on current filters
  const warehousesQuery = useQuery({
    queryKey: [
      'section-warehouses',
      {
        skip: pageIndex * PAGE_SIZE,
        limit: PAGE_SIZE,
        divisionId: filterDivisionIds.length > 0 ? filterDivisionIds : undefined,
        channelId: filterChannelIds.length > 0 ? filterChannelIds : undefined,
        zoneId: filterZoneIds.length > 0 ? filterZoneIds : undefined,
        subZoneId: filterSubZoneIds.length > 0 ? filterSubZoneIds : undefined,
        warehouseTypeId: filterWarehouseTypeIds.length > 0 ? filterWarehouseTypeIds : undefined,
        pincode: pincode || undefined,
      },
    ],
    queryFn: async () => {
      const filters = {
        skip: pageIndex * PAGE_SIZE,
        limit: PAGE_SIZE,
        divisionId: filterDivisionIds.length > 0 ? filterDivisionIds : undefined,
        channelId: filterChannelIds.length > 0 ? filterChannelIds : undefined,
        zoneId: filterZoneIds.length > 0 ? filterZoneIds : undefined,
        subZoneId: filterSubZoneIds.length > 0 ? filterSubZoneIds : undefined,
        warehouseTypeId: filterWarehouseTypeIds.length > 0 ? filterWarehouseTypeIds : undefined,
        pincode: pincode || undefined,
      };
      return await warehousesApi.getAll(filters);
    },
    enabled: !shouldHideFilters,
  });

  // Use React Query directly to fetch selected warehouses by IDs to avoid conflicts with modal
  const selectedWarehousesQuery = useQuery({
    queryKey: ['selected-warehouses', selectedWarehouseIds],
    queryFn: async () => {
      if (selectedWarehouseIds.length === 0) {
        return { data: { items: [] } };
      }

      try {
        const response = await warehousesApi.findByIds(selectedWarehouseIds);

        if (response?.data?.items) {
          return response;
        } else if (response?.data && Array.isArray(response.data)) {
          return { data: { items: response.data } };
        } else if (Array.isArray(response)) {
          return { data: { items: response } };
        } else {
          return { data: { items: [] } };
        }
      } catch (error) {
        try {
          const fallbackResponse = await warehousesApi.getAll({
            warehouseIds: selectedWarehouseIds,
            nonPaginated: true,
          });
          return fallbackResponse;
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
    },
    enabled: selectedWarehouseIds.length > 0,
    retry: 1,
  });

  // Use warehouses from API query when filters are enabled, otherwise use selected warehouses
  const warehouses = shouldHideFilters 
    ? selectedWarehousesQuery.data?.data?.items || []
    : warehousesQuery.data?.data?.items || [];

  
  
  const isLoading = shouldHideFilters 
    ? selectedWarehousesQuery.isLoading 
    : warehousesQuery.isLoading;
  
  const error = shouldHideFilters 
    ? selectedWarehousesQuery.error 
    : warehousesQuery.error;

  const totalItems = shouldHideFilters 
    ? warehouses.length 
    : warehousesQuery.data?.data?.totalItems || 0;

  // Filtering logic for viewing purpose only (no useMemo)
  let filteredItems = warehouses;
  if (shouldHideFilters) {
    // When filters are hidden, apply local filtering to selected warehouses
    if (filterDivisionIds.length > 0) {
      filteredItems = filteredItems.filter((w: any) => filterDivisionIds.includes(w.divisionId));
    }
    if (filterChannelIds.length > 0) {
      filteredItems = filteredItems.filter((w: any) => filterChannelIds.includes(w.channelId));
    }
    if (filterZoneIds.length > 0) {
      filteredItems = filteredItems.filter((w: any) => filterZoneIds.includes(w.zoneId));
    }
    if (filterSubZoneIds.length > 0) {
      filteredItems = filteredItems.filter((w: any) => filterSubZoneIds.includes(w.subZoneId));
    }
    if (filterWarehouseTypeIds.length > 0) {
      filteredItems = filteredItems.filter((w: any) => filterWarehouseTypeIds.includes(w.warehouseTypeId));
    }
  }


  // Table columns
  const columns = [
    // {
    //   id: 'select',
    //   header: ({ table }: any) => {
    //     const currentPageWarehouseIds = table
    //       .getRowModel()
    //       .rows.map((row: any) => {
    //         const warehouseId =
    //           row.original.warehouseId ||
    //           row.original.id ||
    //           row.original._id ||
    //           row.original.warehouse_id;
    //         return warehouseId;
    //       })
    //       .filter(Boolean);
    //     const allCurrentPageSelected =
    //       currentPageWarehouseIds.length > 0 &&
    //       currentPageWarehouseIds.every((warehouseId: string) =>
    //         selectedWarehouseIds.includes(warehouseId)
    //       );
    //     const someCurrentPageSelected = currentPageWarehouseIds.some(
    //       (warehouseId: string) => selectedWarehouseIds.includes(warehouseId)
    //     );

    //     return (
    //       <Checkbox
    //         checked={allCurrentPageSelected}
    //         onCheckedChange={(value) => {
    //           if (value) {
    //             // Select all warehouses on current page
    //             const newSelectedIds = [...selectedWarehouseIds];
    //             currentPageWarehouseIds.forEach((warehouseId: string) => {
    //               if (!newSelectedIds.includes(warehouseId)) {
    //                 newSelectedIds.push(warehouseId);
    //               }
    //             });
    //             onChange(newSelectedIds);
    //           } else {
    //             // Deselect all warehouses on current page
    //             const newSelectedIds = selectedWarehouseIds.filter(
    //               (warehouseId: string) =>
    //                 !currentPageWarehouseIds.includes(warehouseId)
    //             );
    //             onChange(newSelectedIds);
    //           }
    //         }}
    //         aria-label="Select all"
    //       />
    //     );
    //   },
    //   cell: ({ row }: any) => {
    //     const warehouseId =
    //       row.original.warehouseId ||
    //       row.original.id ||
    //       row.original._id ||
    //       row.original.warehouse_id;

    //     if (!warehouseId) {
    //       console.warn('No warehouse ID found for row:', row.original);
    //       return null;
    //     }

    //     return (
    //       <Checkbox
    //         checked={selectedWarehouseIds.includes(warehouseId)}
    //         onCheckedChange={(value) => {
    //           if (!warehouseId) return;
    //           if (value) {
    //             onChange([...selectedWarehouseIds, warehouseId]);
    //           } else {
    //             onChange(
    //               selectedWarehouseIds.filter((wid) => wid !== warehouseId)
    //             );
    //           }
    //         }}
    //         aria-label="Select row"
    //       />
    //     );
    //   },
    //   enableSorting: false,
    //   enableHiding: false,
    // },
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }: any) =>
        shouldHidePagination
          ? row.index + 1
          : pageIndex * PAGE_SIZE + row.index + 1,
    },
    {
      accessorKey: 'warehouseName',
      header: 'Warehouse Name',
      cell: ({ row }: any) =>
        row.original._isPlaceholder ? '' : row.original.warehouseName,
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

  // Paginate warehouses for table (only if pagination is not hidden)
  const paginatedWarehouses = shouldHidePagination ? filteredItems : filteredItems.slice(
    pageIndex * PAGE_SIZE,
    (pageIndex + 1) * PAGE_SIZE
  );

  // Table pagination handler
  const handlePaginationChange = ({ pageIndex: newPageIndex, pageSize: newPageSize }: { pageIndex: number; pageSize: number }) => {
    if (newPageSize !== PAGE_SIZE) {
      // Handle page size change if needed
      setPageIndex(0);
    } else {
      setPageIndex(newPageIndex);
    }
  };

  return (
    <div className="rounded-lg bg-white p-4">
      <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
        Map User Warehouses
      </div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {filteredItems.length > 0
            ? `Selected warehouses: ${filteredItems.length}`
            : 'No warehouses selected'}
        </div>
        <Button
          type="button"
          onClick={() => {
            setPendingSelectedWarehouseIds(selectedWarehouseIds);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2"
          disabled={
            disabled ||
            (requirePincode && !pincode) ||
            selectedWarehousesQuery.isLoading ||
            !hasRequiredSelections
          }
        >
          {selectedWarehousesQuery.isLoading
            ? 'Loading Warehouses...'
            : filteredItems.length > 0
              ? 'Update Warehouses'
              : 'Add Warehouses'}
        </Button>
      </div>

      {/* Show message when pincode is not entered */}
      {requirePincode && !pincode && (
        <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3">
          <p className="text-sm text-yellow-800">
            Please enter a pincode first to select warehouses for this outlet.
          </p>
        </div>
      )}

      {/* Show message when required selections are not made */}
      {requireUserMapping && !hasRequiredSelections && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-800">
            Please select Division, Channel, Zone, and Sub Zone first to enable warehouse selection.
          </p>
        </div>
      )}

      {/* Filters Section */}
      {!shouldHideFilters && (
        <div className="mb-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <MasterRecordCheckboxMultiSelect
                masterName="division"
                value={filterDivisionIds}
                onChange={setFilterDivisionIds}
                placeholder="Division"
                className="w-full"
                displayName="division"
                filterIds={selectedDivisionIds}
              />
            </div>
            <div>
              <MasterRecordCheckboxMultiSelect
                masterName="channel"
                value={filterChannelIds}
                onChange={setFilterChannelIds}
                placeholder="Channel"
                className="w-full"
                displayName="channel"
                filterIds={selectedChannelIds}
              />
            </div>
            <div>
              <MasterRecordCheckboxMultiSelect
                masterName="zone"
                value={filterZoneIds}
                onChange={setFilterZoneIds}
                placeholder="Zone"
                className="w-full"
                displayName="zone"
                filterIds={selectedZoneIds}
              />
            </div>
            <div>
              <MasterRecordCheckboxMultiSelect
                masterName="subZone"
                value={filterSubZoneIds}
                onChange={setFilterSubZoneIds}
                placeholder="Sub Zone"
                className="w-full"
                displayName="subzone"
                filterIds={selectedSubZoneIds}
              />
            </div>
            <div>
              <MasterRecordCheckboxMultiSelect
                masterName="warehouseType"
                value={filterWarehouseTypeIds}
                onChange={setFilterWarehouseTypeIds}
                placeholder="Warehouse Type"
                className="w-full"
                displayName="warehouse type"
              />
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loading text="Loading selected warehouses..." />
        </div>
      ) : error ? (
        <div className="flex h-32 items-center justify-center">
          <GenericError
            text={typeof error === 'string' ? error : error?.message || 'Error'}
          />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-gray-500">
          No warehouses found for selected filters.
        </div>
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={paginatedWarehouses}
            pageCount={Math.ceil(totalItems / PAGE_SIZE)}
            totalItems={totalItems}
            onPaginationChange={
              shouldHidePagination
                ? undefined
                : handlePaginationChange
            }
            manualPagination={!shouldHidePagination}
            initialPagination={
              shouldHidePagination
                ? undefined
                : { pageIndex, pageSize: PAGE_SIZE }
            }
            isLoading={isLoading}
            hidePagination={shouldHidePagination}
            tableId="warehouse-section-table"
          />
        </div>
      )}
      {/* Modal for warehouse selection */}
      <WarehouseMultiSelectModal
        open={isModalOpen}
        selectedWarehouseIds={pendingSelectedWarehouseIds}
        onChange={setPendingSelectedWarehouseIds}
        onCancel={() => setIsModalOpen(false)}
        onConfirm={() => {
          onChange(pendingSelectedWarehouseIds);
          setIsModalOpen(false);
        }}
        pincode={pincode}
        selectedDivisionIds={selectedDivisionIds}
        selectedChannelIds={selectedChannelIds}
        selectedZoneIds={selectedZoneIds}
        selectedSubZoneIds={selectedSubZoneIds}
      />
    </div>
  );
};
