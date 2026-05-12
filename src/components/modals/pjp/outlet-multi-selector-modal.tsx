'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { WarehouseDropdown } from '@/components/shared/warehouse-dropdown';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { useOutlets } from '@/features/dashboard/outlets/hooks/useOutlets';
import type { Outlet } from '@/features/dashboard/outlets/types/outlet.types';
import { Store } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import EmptyState from '@/components/ui/empty-state';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';
import { CheckboxMultiSelect, CheckboxMultiSelectOption } from '@/components/shared/checkbox-multiselect';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import { cn, formatWithLeadingZero } from '@/lib/utils';

interface OutletMultiSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOutletsSelect: (
    outlets: {
      outletId: string;
      outletName: string;
      location?: {
        type: string;
        coordinates: [number, number];
      };
      warehouseId?: string;
    }[]
  ) => void;
  selectedOutletIds?: string[];
  warehouseId?: string;
  excludedOutletIds?: string[];
  userId?: string;
  viewOnly?: boolean;
  preloadedOutlets?: Outlet[];
  totalItems?: number;
  totalPages?: number;
  isLoadingOutlets?: boolean;
  onPaginationChange?: (pagination: PaginationState) => void;
  initialPagination?: PaginationState;
}

type OutletWithDisableState = Outlet & {
  isDisabled?: boolean;
  isExternallyChecked?: boolean;
};

export const OutletMultiSelectorModal = ({
  open,
  onOpenChange,
  onOutletsSelect,
  selectedOutletIds = [],
  warehouseId: initialWarehouseId,
  excludedOutletIds = [],
  userId,
  viewOnly = false,
  preloadedOutlets = [],
  totalItems,
  totalPages,
  isLoadingOutlets = false,
  onPaginationChange,
  initialPagination: externalPagination,
}: OutletMultiSelectorModalProps) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<
    string | undefined
  >(initialWarehouseId);
  const [selectedStateId, setSelectedStateId] = useState<string>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [selectedBeatId, setSelectedBeatId] = useState<string>('');
  const [selectedOutlets, setSelectedOutlets] = useState<Map<string, Outlet>>(
    new Map()
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['active']);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Ref to track if preloaded outlets have been set for current modal open
  const preloadedOutletsSetRef = useRef(false);

  const statusOptions: CheckboxMultiSelectOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'suspended', label: 'Suspended' },
  ];

  const { outlets } = useOutlets({
    search: searchTerm,
    warehouseId: selectedWarehouse,
    beatId: selectedBeatId || undefined,
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
    enabled: open && !!selectedWarehouse, // Always enable when modal is open, even in viewOnly mode
    ...(selectedStatuses.length > 0 && {
      outletStatus: JSON.stringify(selectedStatuses),
    }),
    ...(userId && { userId }),
  });

  // Get outlets data directly from the query
  const outletsData = useMemo(() => outlets.data?.data?.items || [], [outlets.data?.data?.items]);
  
  // Handle preloaded outlets for view-only mode
  useEffect(() => {
    if (open && viewOnly && preloadedOutlets.length > 0 && !preloadedOutletsSetRef.current && !onPaginationChange) {
      // Only set if not using external pagination (backward compatibility)
      const newSelected = new Map<string, Outlet>();
      preloadedOutlets.forEach((outlet: Outlet) => {
        newSelected.set(outlet.outletId, outlet);
      });
      setSelectedOutlets(newSelected);
      preloadedOutletsSetRef.current = true;
    }
  }, [open, viewOnly, preloadedOutlets, onPaginationChange]);
  
  // Handle preloaded outlets - always load them, even in viewOnly mode
  useEffect(() => {
    if (open && preloadedOutlets.length > 0 && !preloadedOutletsSetRef.current) {
      const newSelected = new Map<string, Outlet>();
      preloadedOutlets.forEach((outlet: Outlet) => {
        newSelected.set(outlet.outletId, outlet);
      });
      setSelectedOutlets(newSelected);
      preloadedOutletsSetRef.current = true;
    } else if (open && preloadedOutlets.length === 0 && selectedOutletIds.length > 0 && outletsData.length > 0 && !outlets.isLoading && !preloadedOutletsSetRef.current) {
      // Fallback: if no preloaded outlets, try to find them in current page data
      const newSelected = new Map<string, Outlet>();
      outletsData.forEach((outlet: Outlet) => {
        if (selectedOutletIds.includes(outlet.outletId)) {
          newSelected.set(outlet.outletId, outlet);
        }
      });
      setSelectedOutlets(newSelected);
      preloadedOutletsSetRef.current = true;
    }
  }, [open, selectedOutletIds, outletsData, outlets.isLoading, preloadedOutlets]);

  // Initialize warehouse when modal opens with a warehouseId
  useEffect(() => {
    if (open && initialWarehouseId) {
      setSelectedWarehouse(initialWarehouseId);
    }
  }, [open, initialWarehouseId]);

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setSelectedStateId('');
      setSelectedDistrictId('');
      setSelectedBeatId('');
      setSelectedOutlets(new Map());
      setActiveTab('all');
      setPagination({ pageIndex: 0, pageSize: 10 });
      // Reset warehouse to initial value when closing
      setSelectedWarehouse(initialWarehouseId);
      // Reset preloaded outlets ref
      preloadedOutletsSetRef.current = false;
    }
  }, [open, viewOnly, initialWarehouseId]);

  // Reset selections when warehouse changes, but preserve preselected outlets
  useEffect(() => {
    if (selectedWarehouse !== undefined) {
      // Only reset if we're not in a preselection scenario
      if (selectedOutletIds.length === 0) {
        setSelectedOutlets(new Map());
      }
      setSearchTerm('');
      setSelectedStateId('');
      setSelectedDistrictId('');
      setSelectedBeatId('');
      setPagination({ pageIndex: 0, pageSize: 10 });
    }
  }, [selectedWarehouse, excludedOutletIds, selectedOutletIds.length]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm, selectedBeatId, selectedStatuses]);

  // Keep excluded outlets visible but mark them disabled unless already selected
  // Also disable all outlets when viewOnly is true
  const outletsWithDisableState: OutletWithDisableState[] = outletsData.map(
    (outlet: Outlet) => {
      const alreadyPicked = selectedOutlets.has(outlet.outletId);
      const isExcluded = excludedOutletIds.includes(outlet.outletId);

      return {
        ...outlet,
        isDisabled: viewOnly || (isExcluded && !alreadyPicked),
        isExternallyChecked: isExcluded && !alreadyPicked,
      };
    }
  );

  const handleOutletToggle = (outlet: OutletWithDisableState) => {
    if (outlet.isDisabled || viewOnly) {
      return;
    }

    setSelectedOutlets((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(outlet.outletId)) {
        newMap.delete(outlet.outletId);
      } else {
        newMap.set(outlet.outletId, outlet);
      }
      return newMap;
    });
  };

  const handleConfirmSelection = () => {
    const selectedOutletsList = Array.from(selectedOutlets.values()).map(
      (outlet) => ({
        outletId: outlet.outletId,
        outletName: outlet.outletName,
        location: outlet.outletAddress?.location || {
          type: 'Point' as const,
          coordinates: [0, 0] as [number, number],
        },
        warehouseId: selectedWarehouse,
      })
    );
    onOutletsSelect(selectedOutletsList);
    onOpenChange(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleWarehouseChange = (warehouseId: string | undefined) => {
    setSelectedWarehouse(warehouseId);
  };
  
  const handleStateChange = (stateId: string) => {
    setSelectedStateId(stateId);
    setSelectedDistrictId(''); // Reset district when state changes
    setSelectedBeatId(''); // Reset beat when state changes
  };
  
  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrictId(districtId);
    setSelectedBeatId(''); // Reset beat when district changes
  };
  
  const handleBeatChange = (beatId: string) => {
    setSelectedBeatId(beatId);
  };
  
  const handleStatusChange = (values: string[]) => {
    setSelectedStatuses(values);
  };

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  // Column definitions for view-only mode
  const viewOnlyColumns: ColumnDef<Outlet>[] = [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row, table }) => {
        const pageIndex = table.getState().pagination.pageIndex;
        const pageSize = table.getState().pagination.pageSize;
        return formatWithLeadingZero(pageIndex * pageSize + row.index + 1);
      },
      enableSorting: false,
    },
    {
      accessorKey: 'outletName',
      id: 'outletName',
      header: 'Outlet Name',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.outletName}</div>
      ),
    },
    {
      accessorKey: 'outletStatus',
      id: 'outletStatus',
      header: 'Status',
      cell: ({ row }) =>
        renderStatusBadge(
          row.original.outletStatus || 'Not Set',
          StatusType.OUTLET
        ),
    },
    {
      accessorKey: 'phoneNumber',
      id: 'phoneNumber',
      header: 'Phone Number',
      cell: ({ row }) => row.original.phoneNumber || '-',
    },
    {
      id: 'address',
      header: 'Address',
      cell: ({ row }) => (
        <div className="max-w-[300px]">
          {row.original.outletAddress?.streetAddress || 'No address available'}
        </div>
      ),
    },
    {
      id: 'visitOrderStatus',
      header: 'Visit Status',
      cell: ({ row }) => {
        const outlet = row.original as Outlet & { visitOrderStatus?: string };
        return outlet.visitOrderStatus
          ? renderStatusBadge(outlet.visitOrderStatus, StatusType.VISIT_ORDER)
          : '-';
      },
    },
  ];

  // Column definitions for edit mode (All Outlets tab)
  const editColumns: ColumnDef<OutletWithDisableState>[] = [
    {
      id: 'select',
      header: () => {
        // Check if all visible outlets on current page are selected
        const currentPageOutlets = outletsWithDisableState
          .slice(
            pagination.pageIndex * pagination.pageSize,
            (pagination.pageIndex + 1) * pagination.pageSize
          )
          .filter((outlet) => !outlet.isDisabled);
        const allSelected = currentPageOutlets.length > 0 && 
          currentPageOutlets.every(outlet => selectedOutlets.has(outlet.outletId));
        const someSelected = currentPageOutlets.some(outlet => selectedOutlets.has(outlet.outletId));
        
        return (
          <Checkbox
            checked={allSelected}
            data-indeterminate={someSelected && !allSelected ? 'true' : undefined}
            onCheckedChange={(value) => {
              if (viewOnly) return;
              // Toggle selection for all outlets on current page
              currentPageOutlets.forEach((outlet) => {
                if (value && !selectedOutlets.has(outlet.outletId)) {
                  handleOutletToggle(outlet);
                } else if (!value && selectedOutlets.has(outlet.outletId)) {
                  handleOutletToggle(outlet);
                }
              });
            }}
            disabled={viewOnly}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        );
      },
      cell: ({ row }) => (
        <Checkbox
          checked={
            row.original.isExternallyChecked
              ? true
              : selectedOutlets.has(row.original.outletId)
          }
          disabled={row.original.isDisabled}
          aria-disabled={row.original.isDisabled}
          tabIndex={row.original.isDisabled ? -1 : 0}
          aria-label={
            row.original.isDisabled
              ? `Outlet ${row.original.outletName} already assigned`
              : `Select outlet ${row.original.outletName}`
          }
          onCheckedChange={() => handleOutletToggle(row.original)}
          className={cn(
            'translate-y-[2px]',
            row.original.isDisabled && 'cursor-not-allowed opacity-60'
          )}
          onClick={(event) => {
            if (row.original.isDisabled) {
              event.preventDefault();
            }
          }}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) =>
        formatWithLeadingZero(pagination.pageIndex * pagination.pageSize + row.index + 1),
      enableSorting: false,
    },
    {
      accessorKey: 'outletName',
      id: 'outletName',
      header: 'Outlet Name',
      cell: ({ row }) => (
        <div
          className={cn(
            'font-medium',
            row.original.isDisabled && 'text-muted-foreground'
          )}
        >
          {row.original.outletName}
        </div>
      ),
    },
    {
      accessorKey: 'outletStatus',
      id: 'outletStatus',
      header: 'Status',
      cell: ({ row }) =>
        renderStatusBadge(
          row.original.outletStatus || 'Not Set',
          StatusType.OUTLET
        ),
    },
    {
      accessorKey: 'phoneNumber',
      id: 'phoneNumber',
      header: 'Phone Number',
      cell: ({ row }) => row.original.phoneNumber || '-',
    },
    {
      id: 'address',
      header: 'Address',
      cell: ({ row }) => (
        <div className="max-w-[300px]">
          {row.original.outletAddress?.streetAddress || 'No address available'}
        </div>
      ),
    },
  ];

  // Column definitions for selected outlets tab
  const selectedEditColumns: ColumnDef<Outlet>[] = [
    {
      id: 'select',
      header: () => {
        // Check if all outlets in selected tab are selected
        const allSelected = selectedOutletsArray.length > 0 && 
          selectedOutletsArray.every(outlet => selectedOutlets.has(outlet.outletId));
        const someSelected = selectedOutletsArray.some(outlet => selectedOutlets.has(outlet.outletId));
        
        return (
          <Checkbox
            checked={allSelected}
            data-indeterminate={someSelected && !allSelected ? 'true' : undefined}
            onCheckedChange={(value) => {
              if (viewOnly) return;
              // Toggle selection for all selected outlets
              selectedOutletsArray.forEach((outlet) => {
                if (value && !selectedOutlets.has(outlet.outletId)) {
                  handleOutletToggle(outlet);
                } else if (!value && selectedOutlets.has(outlet.outletId)) {
                  handleOutletToggle(outlet);
                }
              });
            }}
            disabled={viewOnly}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        );
      },
      cell: ({ row }) => (
        <Checkbox
          checked={selectedOutlets.has(row.original.outletId)}
          onCheckedChange={() => handleOutletToggle(row.original)}
          disabled={viewOnly}
          aria-label="Select row"
          className="translate-y-[2px]"
          onClick={(e) => {
            e.stopPropagation();
            if (viewOnly) {
              e.preventDefault();
            }
          }}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row, table }) => {
        const pageIndex = table.getState().pagination.pageIndex;
        const pageSize = table.getState().pagination.pageSize;
        return formatWithLeadingZero(pageIndex * pageSize + row.index + 1);
      },
      enableSorting: false,
    },
    {
      accessorKey: 'outletName',
      id: 'outletName',
      header: 'Outlet Name',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.outletName}</div>
      ),
    },
    {
      accessorKey: 'outletStatus',
      id: 'outletStatus',
      header: 'Status',
      cell: ({ row }) =>
        renderStatusBadge(
          row.original.outletStatus || 'Not Set',
          StatusType.OUTLET
        ),
    },
    {
      accessorKey: 'phoneNumber',
      id: 'phoneNumber',
      header: 'Phone Number',
      cell: ({ row }) => row.original.phoneNumber || '-',
    },
    {
      id: 'address',
      header: 'Address',
      cell: ({ row }) => (
        <div className="max-w-[300px]">
          {row.original.outletAddress?.streetAddress || 'No address available'}
        </div>
      ),
    },
  ];

  // For selected outlets tab in edit mode
  const selectedOutletsArray = Array.from(selectedOutlets.values());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[98vh] max-w-5xl overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            <div className="flex flex-col gap-1">
              <div className="bg-primary/10 w-fit rounded-full p-2">
                <Store className="text-primary h-5 w-5" />
              </div>
              <div className="text-lg font-medium">
                Select Outlets
              </div>
              <div className="text-sm font-normal text-zinc-500">
                Choose a warehouse and select multiple outlets for this visit
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Always show tabs interface - same for creators and approvers */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 min-h-0 overflow-hidden flex flex-col" defaultValue="all">
            <div className="flex-shrink-0 mb-4 flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="selected">
                  Selected Outlets {selectedOutlets.size > 0 && `(${selectedOutlets.size})`}
                </TabsTrigger>
                <TabsTrigger value="all">All Outlets</TabsTrigger>
              </TabsList>
            </div>

            {/* Selected Outlets Tab */}
            <TabsContent value="selected" className="flex flex-col flex-1 min-h-0 overflow-hidden mt-0">
              <div className="flex-1 min-h-0 overflow-auto mt-4"> 
                <DataTable
                  columns={selectedEditColumns}
                  data={selectedOutletsArray}
                  manualPagination={false}
                  isLoading={false}
                  tableId="outlet-selected-table"
                  hidePagination={selectedOutletsArray.length === 0}
                  isColumnDisplay={false}
                  isDownload={false}
                />
              </div> 
            </TabsContent>

            {/* All Outlets Tab */}
            <TabsContent value="all" className="flex-1 min-h-0 overflow-hidden flex flex-col mt-0">
              <div className="flex-shrink-0 space-y-4">
              {/* Warehouse and Search Controls */}
                {/* First Row - Warehouse and Status */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <WarehouseDropdown
                    value={selectedWarehouse}
                    onChange={handleWarehouseChange}
                    placeholder="Select Warehouse"
                    className="w-full"
                    userId={userId}
                  />
                  <CheckboxMultiSelect
                    options={statusOptions}
                    value={selectedStatuses}
                    onChange={(vals) => handleStatusChange(vals)}
                    placeholder="Filter by Status"
                    displayName="status"
                    className="w-full"
                  />
                  <SearchInput
                    placeholder="Search Outlets"
                    staticPrefix="Search Outlets by"
                    rotatingWords={['Name', 'Phone', 'Address']}
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full"
                  />
                </div>

                {/* Second Row - Location Filters */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <MasterRecordDropdown
                    masterName="state"
                    value={selectedStateId}
                    onChange={handleStateChange}
                    placeholder="Select State"
                    className="w-full"
                  />
                  <MasterRecordDropdown
                    masterName="district"
                    value={selectedDistrictId}
                    onChange={handleDistrictChange}
                    placeholder="Select District"
                    className="w-full"
                    filters={selectedStateId ? { stateId: selectedStateId } : undefined}
                  />
                  <MasterRecordDropdown
                    masterName="beat"
                    value={selectedBeatId}
                    onChange={handleBeatChange}
                    placeholder="Select Beat"
                    className="w-full"
                    filters={selectedDistrictId ? { districtId: selectedDistrictId } : undefined}
                  />
                </div>

              {/* Selection controls */}
              {selectedWarehouse && (
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground text-sm">
                    {selectedOutlets.size} outlet(s) selected
                  </div>
                </div>
              )}
              </div>

              {/* Outlets List */}
              <div className="flex-1 min-h-0 overflow-auto mt-4">
                {!selectedWarehouse ? (
                  <div className="flex h-40 items-center justify-center">
                    <EmptyState text="Select a warehouse first" />
                  </div>
                ) : (
                  <DataTable
                    columns={editColumns}
                    data={outletsWithDisableState}
                    pageCount={outlets.data?.data?.totalPages || Math.ceil((outlets.data?.data?.totalItems || 0) / pagination.pageSize)}
                    totalItems={outlets.data?.data?.totalItems || 0}
                    onPaginationChange={handlePaginationChange}
                    manualPagination={true}
                    initialPagination={pagination}
                    isLoading={outlets.isLoading}
                    loadingText="Loading outlets..."
                    tableId="outlet-selector-table"
                    isColumnDisplay={false}
                    isDownload={false}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>

        <DialogFooter className="flex-shrink-0 flex items-center justify-between mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          <Button
            onClick={handleConfirmSelection}
            disabled={selectedOutlets.size === 0 || viewOnly}
          >
            Select {selectedOutlets.size > 0 ? `${selectedOutlets.size} ` : ''}
            Outlet{selectedOutlets.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
