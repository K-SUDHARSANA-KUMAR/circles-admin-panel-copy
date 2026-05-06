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
import { Input } from '@/components/ui/input';
import { Search, MapPin } from 'lucide-react';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { formatWithLeadingZero } from '@/lib/utils';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import { useAppSelector } from '@/store/hooks';

export interface BeatOption {
  beatId: string;
  beatName: string;
  beatCode?: string;
  stateId?: string;
  districtId?: string;
}

interface BeatSelectionModalProps {
  open: boolean;
  selectedBeatId?: string;
  onChange: (beatId: string | undefined, beatData?: BeatOption) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  initialSelectedOption?: BeatOption;
  stateId?: string;
  districtId?: string;
  userId?: string;
}

export const BeatSelectionModal: React.FC<BeatSelectionModalProps> = ({
  open,
  selectedBeatId,
  onChange,
  onConfirm,
  onCancel,
  loading = false,
  initialSelectedOption,
  stateId,
  districtId,
  userId,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedStateId, setSelectedStateId] = useState<string>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');

  // Get master records for state and district name lookup
  const { recordMaps, records } = useAppSelector((state) => state.masterRecords);
  const storeUserId = useAppSelector((state) => state.auth.user?.userId) as string | undefined;
  const effectiveUserId = userId ?? storeUserId;

  // Debug logging when modal opens
  useEffect(() => {
    if (open) {
      setPageIndex(0);
      setSearch('');
      setSelectedStateId(stateId || '');
      setSelectedDistrictId(districtId || '');
    }
  }, [open, stateId, districtId]);

  // Reset page index when filters change
  const lastKeyRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentKey = JSON.stringify({
      selectedStateId,
      selectedDistrictId,
    });
    if (lastKeyRef.current !== currentKey) {
      lastKeyRef.current = currentKey;
      setPageIndex(0);
    }
  }, [selectedStateId, selectedDistrictId]);

  const initialPagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPageIndex(0); // Reset to first page
  };

  const handleStateChange = (stateId: string) => {
    setSelectedStateId(stateId);
    setSelectedDistrictId(''); // Reset district when state changes
    setPageIndex(0); // Reset to first page when state changes
  };

  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrictId(districtId);
    setPageIndex(0); // Reset to first page when district changes
  };

  const handleBeatSelect = (beatId: string) => {
    const selectedBeat = beats.find((beat: any) => 
      (beat.beatId || beat._id || beat.id) === beatId
    );
    
    if (selectedBeat) {
      const beatData: BeatOption = {
        beatId: beatId,
        beatName: selectedBeat.beatName,
        beatCode: selectedBeat.beatCode,
        stateId: selectedBeat.stateId,
        districtId: selectedBeat.districtId,
      };
      onChange(beatId, beatData);
    } else {
      onChange(beatId);
    }
  };

  const beatFilters = useMemo(() => {
    if (!open) {
      return undefined;
    }

    return {
      stateId: selectedStateId || undefined,
      districtId: selectedDistrictId || undefined,
      search: search || undefined,
    };
  }, [open, selectedStateId, selectedDistrictId, search]);

  const { records: beatsQuery, pagination: beatsPagination } = useMasterRecords(
    open ? 'beat' : '',
    undefined,
    open ? pageIndex * pageSize : 0,
    pageSize,
    false,
    beatFilters,
    effectiveUserId
  );

  const beats = Array.isArray(beatsQuery?.data) ? beatsQuery.data : [];
  const isLoading = beatsQuery?.isLoading || loading;
  const error = beatsQuery?.error;
  const totalItems = beatsPagination?.totalItems ?? beats.length;
  const pageCount = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 1;

  // Table columns with radio selection for single select
  const columns = [
    {
      id: 'select',
      header: 'Select',
      cell: ({ row }: any) => {
        const beatId = row.original.beatId || row.original._id || row.original.id;

        if (!beatId) {
          console.warn('Modal: No beat ID found for row:', row.original);
          return null;
        }

        const isSelected = selectedBeatId === beatId;

        return (
          <input
            type="radio"
            name="beat-selection"
            checked={isSelected}
            aria-label={`${isSelected ? 'Deselect' : 'Select'} beat ${row.original.beatName || ''}`}
            onChange={() => {
              if (isSelected) {
                // Deselect if already selected
                onChange(undefined);
              } else {
                // Select this beat
                handleBeatSelect(beatId);
              }
            }}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 accent-green-600"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }: any) =>
        formatWithLeadingZero(pageIndex * pageSize + row.index + 1),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'beatName',
      header: 'Beat Name',
      cell: ({ row }: any) => {
        const beatName = row.original.beatName || '-';
        return (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{beatName}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'stateName',
      header: 'State',
      cell: ({ row }: any) => {
        const stateId = row.original.stateId;
        if (!stateId) return '-';
        
        // First try to get from recordMaps
        const stateFromMaps = recordMaps.state?.[stateId]?.stateName;
        if (stateFromMaps) return stateFromMaps;
        
        // Fallback to records array
        const stateRecord = records.state?.find((record: any) => record.stateId === stateId);
        return stateRecord?.stateName || '-';
      },
    },
    {
      accessorKey: 'districtName',
      header: 'District',
      cell: ({ row }: any) => {
        const districtId = row.original.districtId;
        if (!districtId) return '-';
        
        // First try to get from recordMaps
        const districtFromMaps = recordMaps.district?.[districtId]?.districtName;
        if (districtFromMaps) return districtFromMaps;
        
        // Fallback to records array
        const districtRecord = records.district?.find((record: any) => record.districtId === districtId);
        return districtRecord?.districtName || '-';
      },
    },
  ];

  const selectedBeat = useMemo(() => {
    if (!selectedBeatId) return null;
    
    // First check if it's the initial selected option
    if (initialSelectedOption && initialSelectedOption.beatId === selectedBeatId) {
      return initialSelectedOption;
    }
    
    // Then check in the current page data
    return beats.find((beat: any) => 
      (beat.beatId || beat._id || beat.id) === selectedBeatId
    );
  }, [selectedBeatId, beats, initialSelectedOption]);

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] max-w-4xl flex-col p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Select Beat</DialogTitle>
        </DialogHeader>

        {/* Modal Content - Scrollable Area */}
        <div className="flex flex-1 flex-col overflow-hidden px-6 py-4">
          {/* Filters Section */}
          <div className="flex-shrink-0 space-y-4">
            {/* Filters Row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* State Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Filter by State
                </label>
                <MasterRecordDropdown
                  masterName="state"
                  value={selectedStateId}
                  onChange={handleStateChange}
                  placeholder="All states"
                  className="w-full"
                />
              </div>
              
              {/* District Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Filter by District
                </label>
                <MasterRecordDropdown
                  masterName="district"
                  value={selectedDistrictId}
                  onChange={handleDistrictChange}
                  placeholder="All districts"
                  className="w-full"
                  filters={selectedStateId ? { stateId: selectedStateId } : undefined}
                />
              </div>
              
              {/* Search Bar */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search beats..."
                    value={search}
                    onChange={handleSearchChange}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table Section - Flexible Height */}
          <div className="mt-4 min-h-0 flex-1">
            {isLoading || loading ? (
              <div className="flex h-full items-center justify-center">
                <Loading text="Loading beats..." />
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center">
                <GenericError
                  text={
                    typeof error === 'string'
                      ? error
                      : error?.message || 'Error loading beats'
                  }
                />
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <DataTable
                  columns={columns}
                  data={beats}
                  pageCount={pageCount}
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
                  tableId="beat-selection-table"
                  isDownload={false}
                  isColumnDisplay={false}
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions - Fixed at Bottom */}
        <div className="bg-background flex justify-between items-center border-t px-6 py-4">
          <div className="text-sm text-gray-600">
            {selectedBeat ? (
              <span>
                Selected: <span className="font-medium">{selectedBeat.beatName}</span>
              </span>
            ) : (
              <span>No beat selected</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                console.log(
                  'Modal: Confirming selection with beat ID:',
                  selectedBeatId
                );
                onConfirm();
              }}
              disabled={!selectedBeatId}
            >
              Confirm Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BeatSelectionModal;
