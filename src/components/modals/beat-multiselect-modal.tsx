'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

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
import { Search } from 'lucide-react';
import { MasterRecordCheckboxMultiSelect } from '@/components/shared/master-record-checkbox-multiselect';
import { formatWithLeadingZero } from '@/lib/utils';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import { useAppSelector } from '@/store/hooks';
import { Checkbox } from '@/components/ui/checkbox';

import type { BeatOption } from '@/components/modals/beat-selection-modal';

interface BeatMultiSelectModalProps {
  open: boolean;
  selectedBeats: BeatOption[];
  onConfirm: (beats: BeatOption[]) => void;
  onCancel: () => void;
  loading?: boolean;
  stateId?: string;
  districtId?: string;
  userId?: string;
  disabled?: boolean;
  allowedStateIds?: string[];
  allowedDistrictIds?: string[];
  allowedCityIds?: string[];
  warehouseMappedStateIds?: string[];
  warehouseMappedDistrictIds?: string[];
  warehouseMappedCityIds?: string[];
}

export const BeatMultiSelectModal: React.FC<BeatMultiSelectModalProps> = ({
  open,
  selectedBeats,
  onConfirm,
  onCancel,
  loading = false,
  stateId,
  districtId,
  userId,
  disabled = false,
  allowedStateIds,
  allowedDistrictIds,
  allowedCityIds,
  warehouseMappedStateIds = [],
  warehouseMappedDistrictIds = [],
  warehouseMappedCityIds = [],
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStateIds, setSelectedStateIds] = useState<string[]>([]);
  const [selectedDistrictIds, setSelectedDistrictIds] = useState<string[]>([]);
  const [selectedDayIds, setSelectedDayIds] = useState<string[]>([]);

  const { recordMaps, records } = useAppSelector((state) => state.masterRecords);
  const effectiveUserId = userId;

  const [localSelection, setLocalSelection] = useState<Record<string, BeatOption>>({});


  // Preload reference data so state/district/day names render even when beats lack names
  const { records: stateRecordsQuery } = useMasterRecords(
    open ? 'state' : '',
    undefined,
    1,
    1000,
    true
  );
  const { records: districtRecordsQuery } = useMasterRecords(
    open ? 'district' : '',
    undefined,
    1,
    1000,
    true
  );
  const { records: pjpDayRecordsQuery } = useMasterRecords(
    open ? 'pjpDay' : '',
    undefined,
    1,
    1000,
    true
  );
  const stateLookup = useMemo(() => {
    const data = (stateRecordsQuery?.data as any[]) || [];
    return data.reduce<Record<string, any>>((acc, item) => {
      const id = item?.stateId || item?._id || item?.id;
      if (id) acc[id] = item;
      return acc;
    }, {});
  }, [stateRecordsQuery?.data]);

  const districtLookup = useMemo(() => {
    const data = (districtRecordsQuery?.data as any[]) || [];
    return data.reduce<Record<string, any>>((acc, item) => {
      const id = item?.districtId || item?._id || item?.id;
      if (id) acc[id] = item;
      return acc;
    }, {});
  }, [districtRecordsQuery?.data]);

  const dayLookup = useMemo(() => {
    const data = (pjpDayRecordsQuery?.data as any[]) || [];
    return data.reduce<Record<string, any>>((acc, item) => {
      const id = item?.pjpDayId || item?._id || item?.id;
      if (id) acc[id] = item;
      return acc;
    }, {});
  }, [pjpDayRecordsQuery?.data]);

  // Debounce search input (only fire when empty or >=3 chars)
  useEffect(() => {
    if (!open) {
      return;
    }
    const handler = setTimeout(() => {
      const next = searchInput.trim();
      if (next.length === 0 || next.length >= 3) {
        setDebouncedSearch(next);
        setPageIndex(0);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInput, open]);

  useEffect(() => {
    if (open) {
      setPageIndex(0);
      setSearchInput('');
      setDebouncedSearch('');
      // Initialize with user selections from parent form, or warehouse mappings as fallback
      // These will be used as initial filters, but user can change them in the modal
      const initialStateIds = allowedStateIds && allowedStateIds.length > 0
        ? allowedStateIds
        : warehouseMappedStateIds && warehouseMappedStateIds.length > 0
          ? warehouseMappedStateIds
          : stateId ? [stateId] : [];

      const initialDistrictIds = allowedDistrictIds && allowedDistrictIds.length > 0
        ? allowedDistrictIds
        : warehouseMappedDistrictIds && warehouseMappedDistrictIds.length > 0
          ? warehouseMappedDistrictIds
          : districtId ? [districtId] : [];

      setSelectedStateIds(initialStateIds);
      setSelectedDistrictIds(initialDistrictIds);
      setSelectedDayIds([]);

      const initialMap: Record<string, BeatOption> = {};
      selectedBeats.forEach((beat) => {
        if (beat?.beatId) {
          initialMap[beat.beatId] = beat;
        }
      });
      setLocalSelection(initialMap);
    }
  }, [open, selectedBeats, stateId, districtId, allowedStateIds, allowedDistrictIds, warehouseMappedStateIds, warehouseMappedDistrictIds]);

  const lastFilterKeyRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentKey = JSON.stringify({
      selectedStateIds,
      selectedDistrictIds,
      selectedDayIds,
    });
    if (lastFilterKeyRef.current !== currentKey) {
      lastFilterKeyRef.current = currentKey;
      setPageIndex(0);
    }
  }, [selectedStateIds, selectedDistrictIds, selectedDayIds]);

  const initialPagination = useMemo(
    () => ({ pageIndex, pageSize }),
    [pageIndex, pageSize]
  );

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value);
  };

  const handleStateChange = (values: string[]) => {
    setSelectedStateIds(values);
    setSelectedDistrictIds([]);
    setPageIndex(0);
  };

  const handleDistrictChange = (values: string[]) => {
    setSelectedDistrictIds(values);
    setPageIndex(0);
  };

  const handleDayChange = (values: string[]) => {
    setSelectedDayIds(values);
    setPageIndex(0);
  };

  const beatFilters = useMemo(() => {
    if (!open) {
      return undefined;
    }

    // Priority logic:
    // 1. Use user selections from parent form (allowedStateIds, allowedDistrictIds, allowedCityIds) if available
    // 2. If user hasn't selected, use warehouse mapped data
    // 3. Modal's selectedStateIds/selectedDistrictIds can further filter (user can change in modal)
    // Only send fields that have values (either selected or from warehouse)

    // For state: Use modal's selection (which is initialized from user selection or warehouse mapping)
    // Modal selection takes priority as user can change it within the modal
    const effectiveStateIds = selectedStateIds.length > 0
      ? selectedStateIds
      : (allowedStateIds && allowedStateIds.length > 0
        ? allowedStateIds
        : (warehouseMappedStateIds.length > 0 ? warehouseMappedStateIds : undefined));

    // For district: Use modal's selection (which is initialized from user selection or warehouse mapping)
    const effectiveDistrictIds = selectedDistrictIds.length > 0
      ? selectedDistrictIds
      : (allowedDistrictIds && allowedDistrictIds.length > 0
        ? allowedDistrictIds
        : (warehouseMappedDistrictIds.length > 0 ? warehouseMappedDistrictIds : undefined));

    // For city: Use user selected city IDs from parent form if available, otherwise use warehouse mapped city IDs
    // Note: City is not selectable in the modal dropdowns, so we use allowedCityIds directly
    const effectiveCityIds = allowedCityIds && allowedCityIds.length > 0
      ? allowedCityIds
      : (warehouseMappedCityIds.length > 0 ? warehouseMappedCityIds : undefined);

    // Build filters object - only include fields that have values
    const filters: any = {};

    if (effectiveStateIds) {
      filters.stateId = effectiveStateIds;
    }

    if (effectiveDistrictIds) {
      filters.districtId = effectiveDistrictIds;
    }

    if (effectiveCityIds) {
      filters.cityId = effectiveCityIds;
    }

    if (selectedDayIds.length > 0) {
      filters.pjpDayId = selectedDayIds;
    }

    if (debouncedSearch) {
      filters.search = debouncedSearch;
    }

    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [open, selectedStateIds, selectedDistrictIds, selectedDayIds, debouncedSearch, allowedStateIds, allowedDistrictIds, allowedCityIds, warehouseMappedStateIds, warehouseMappedDistrictIds, warehouseMappedCityIds]);

  const { records: beatsQuery, pagination: beatsPagination } = useMasterRecords(
    open ? 'beat' : '',
    undefined,
    open ? pageIndex * pageSize : 0,
    pageSize,
    false,
    beatFilters,
    effectiveUserId
  );

  const beats = useMemo(() => {
    if (!Array.isArray(beatsQuery?.data)) {
      return [];
    }
    return beatsQuery.data;
  }, [beatsQuery?.data]);

  const isLoading = beatsQuery?.isLoading || loading;
  const error = beatsQuery?.error;
  const totalItems = beatsPagination?.totalItems ?? beats.length;
  const pageCount = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 1;

  const normalizeBeat = (beat: any): BeatOption | null => {
    const beatId = beat?.beatId || beat?._id || beat?.id;
    if (!beatId) {
      return null;
    }

    return {
      beatId,
      beatName: beat?.beatName || beat?.name || '',
      beatCode: beat?.beatCode,
      stateId: beat?.stateId,
      districtId: beat?.districtId,
    };
  };

  const toggleBeatSelection = (beat: any, isSelected: boolean) => {
    const normalized = normalizeBeat(beat);
    if (!normalized) {
      return;
    }

    setLocalSelection((previous) => {
      const next = { ...previous };
      if (isSelected) {
        next[normalized.beatId] = normalized;
      } else {
        delete next[normalized.beatId];
      }
      return next;
    });
  };

  const columns = [
    {
      id: 'select',
      header: ({ table }: any) => {
        const currentPageBeatIds = table
          .getRowModel()
          .rows.map((row: any) => row.original?.beatId || row.original?._id || row.original?.id)
          .filter(Boolean);

        const hasBeats = currentPageBeatIds.length > 0;
        const allCurrentSelected =
          hasBeats &&
          currentPageBeatIds.every((beatId: string) => Boolean(localSelection[beatId]));

        return (
          <Checkbox
            checked={hasBeats ? allCurrentSelected : false}
            disabled={!hasBeats || disabled}
            onCheckedChange={(value) => {
              if (!hasBeats || disabled) {
                return;
              }

              setLocalSelection((previous) => {
                const next = { ...previous };
                if (value) {
                  table.getRowModel().rows.forEach((row: any) => {
                    const normalized = normalizeBeat(row.original);
                    if (normalized) {
                      next[normalized.beatId] = normalized;
                    }
                  });
                } else {
                  currentPageBeatIds.forEach((beatId: string) => {
                    delete next[beatId];
                  });
                }
                return next;
              });
            }}
            aria-label="Select all beats on page"
          />
        );
      },
      cell: ({ row }: any) => {
        const beatId = row.original?.beatId || row.original?._id || row.original?.id;

        if (!beatId) {
          console.warn('BeatMultiSelectModal: Missing beat identifier for row', row.original);
          return null;
        }

        const isSelected = Boolean(localSelection[beatId]);

        return (
          <Checkbox
            checked={isSelected}
            disabled={disabled}
            onCheckedChange={(value) => {
              if (disabled) return;
              toggleBeatSelection(row.original, Boolean(value));
            }}
            aria-label={`${isSelected ? 'Deselect' : 'Select'} beat ${row.original?.beatName || ''}`}
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
        const beatName = row.original?.beatName || '-';
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{beatName}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'stateName',
      header: 'State',
      cell: ({ row }: any) => {
        const stateIdentifier = row.original?.stateId;
        const stateFromRow =
          row.original?.stateName ||
          row.original?.state?.stateName ||
          row.original?.state?.name;
        if (!stateIdentifier && stateFromRow) {
          return stateFromRow;
        }
        if (!stateIdentifier) {
          return '-';
        }

        const fromMap = recordMaps.state?.[stateIdentifier]?.stateName || stateLookup[stateIdentifier]?.stateName;
        if (fromMap) {
          return fromMap;
        }

        const fromRecords = records.state?.find(
          (record: any) => record?.stateId === stateIdentifier
        );
        return fromRecords?.stateName || stateFromRow || '-';
      },
    },
    {
      accessorKey: 'districtName',
      header: 'District',
      cell: ({ row }: any) => {
        const districtIdentifier = row.original?.districtId;
        const districtFromRow =
          row.original?.districtName ||
          row.original?.district?.districtName ||
          row.original?.district?.name;
        if (!districtIdentifier && districtFromRow) {
          return districtFromRow;
        }
        if (!districtIdentifier) {
          return '-';
        }

        const fromMap = recordMaps.district?.[districtIdentifier]?.districtName || districtLookup[districtIdentifier]?.districtName;
        if (fromMap) {
          return fromMap;
        }

        const fromRecords = records.district?.find(
          (record: any) => record?.districtId === districtIdentifier
        );
        return fromRecords?.districtName || districtFromRow || '-';
      },
    },
    {
      accessorKey: 'dayName',
      header: 'Day',
      cell: ({ row }: any) => {
        const dayIdentifier = row.original?.pjpDayId;
        const dayFromRow =
          row.original?.pjpDayName ||
          row.original?.dayName ||
          row.original?.day?.pjpDayName ||
          row.original?.day?.name;
        if (!dayIdentifier && dayFromRow) {
          return dayFromRow;
        }
        if (!dayIdentifier) {
          return '-';
        }

        const fromMap = recordMaps.pjpDay?.[dayIdentifier]?.pjpDayName || dayLookup[dayIdentifier]?.pjpDayName || dayLookup[dayIdentifier]?.name;
        if (fromMap) {
          return fromMap;
        }

        const fromRecords = records.pjpDay?.find(
          (record: any) => (record.pjpDayId || record._id || record.id) === dayIdentifier
        );
        return fromRecords?.pjpDayName || fromRecords?.name || dayFromRow || '-';
      },
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] max-w-7xl flex-col p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Select Beats</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 flex-col overflow-hidden px-6 py-4">
          <div className="flex-shrink-0 space-y-4">
            {/* First row: Search */}
            <div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search beats..."
                  value={searchInput}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
            </div>
            {/* Second row: State, District, Day */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>

                <MasterRecordCheckboxMultiSelect
                  masterName="state"
                  value={selectedStateIds}
                  onChange={(values) => handleStateChange(values)}
                  placeholder="All states"
                  className="w-full"
                  displayName="state"
                  skipStoreUpdate={true}
                  filters={
                    allowedStateIds && allowedStateIds.length > 0
                      ? { stateId: allowedStateIds }
                      : undefined
                  }
                />
              </div>
              <div>

                <MasterRecordCheckboxMultiSelect
                  masterName="district"
                  value={selectedDistrictIds}
                  onChange={(values) => handleDistrictChange(values)}
                  placeholder="All districts"
                  className="w-full"
                  displayName="district"
                  skipStoreUpdate={true}
                  filters={
                    allowedDistrictIds && allowedDistrictIds.length > 0
                      ? { districtId: allowedDistrictIds }
                      : selectedStateIds.length > 0
                        ? { stateId: selectedStateIds }
                        : undefined
                  }
                />
              </div>
              <div>

                <MasterRecordCheckboxMultiSelect
                  masterName="pjpDay"
                  value={selectedDayIds}
                  onChange={(values) => handleDayChange(values)}
                  placeholder="All days"
                  className="w-full"
                  displayName="day"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 min-h-0 flex-1">
            {isLoading ? (
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
                  onPaginationChange={({ pageIndex: nextPageIndex, pageSize: nextPageSize }) => {
                    if (nextPageSize !== pageSize) {
                      setPageSize(nextPageSize);
                      setPageIndex(0);
                    } else {
                      setPageIndex(nextPageIndex);
                    }
                  }}
                  manualPagination={true}
                  initialPagination={initialPagination}
                  isLoading={isLoading}
                  tableId="beat-multiselect-table"
                  isDownload={false}
                  isColumnDisplay={false}
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-background flex items-center justify-between border-t px-6 py-4">
          <div className="text-sm text-gray-600">
            {Object.keys(localSelection).length > 0 ? (
              <span>
                Selected: <span className="font-medium">{Object.keys(localSelection).length}</span>
              </span>
            ) : (
              <span>No beats selected</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                onConfirm(Object.values(localSelection));
              }}
            >
              Confirm Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BeatMultiSelectModal;

