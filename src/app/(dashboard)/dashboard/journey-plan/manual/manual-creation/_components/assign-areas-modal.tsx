'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';
import { ApplicableToData } from '../_types';
import { WarehouseMultiSelectModal } from '@/components/modals/warehouse-multiselect-modal';
import { BeatMultiSelectModal } from '@/components/modals/beat-multiselect-modal';
import type { BeatOption } from '@/components/modals/beat-selection-modal';
import { SalesPersonMultiSelectModal } from '@/components/modals/sales-person-multiselect-modal';

interface AssignAreasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: ApplicableToData) => void;
  initialData?: ApplicableToData;
  userId?: string;
  isReadOnly?: boolean;
}

export const AssignAreasModal = ({
  open,
  onOpenChange,
  onConfirm,
  initialData,
  userId,
  isReadOnly = false,
}: AssignAreasModalProps) => {
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>(
    initialData?.warehouseIds?.map(String) || []
  );
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [warehouseIdsSnapshot, setWarehouseIdsSnapshot] = useState<string[]>([]);

  const [selectedSalesPersonIds, setSelectedSalesPersonIds] = useState<string[]>(
    initialData?.userIds?.map(String) || []
  );
  const [isSalesPersonModalOpen, setIsSalesPersonModalOpen] = useState(false);
  const [salesPersonIdsSnapshot, setSalesPersonIdsSnapshot] = useState<string[]>([]);

  const [selectedBeatOptions, setSelectedBeatOptions] = useState<BeatOption[]>(
    initialData?.beatIds?.map((beatId) => ({ beatId, beatName: '' })) || []
  );
  const [isBeatModalOpen, setIsBeatModalOpen] = useState(false);
  const [beatSnapshot, setBeatSnapshot] = useState<BeatOption[]>([]);

  const selectedBeatIds = useMemo(
    () => Array.from(new Set(selectedBeatOptions.map((beat) => beat.beatId).filter(Boolean))),
    [selectedBeatOptions]
  );

  const beatSummary = useMemo(() => {
    if (selectedBeatOptions.length === 0) {
      return 'Select beats';
    }

    const namedBeats = selectedBeatOptions
      .map((beat) => beat.beatName)
      .filter((name): name is string => Boolean(name));

    if (selectedBeatOptions.length === 1 && namedBeats.length === 1) {
      return namedBeats[0];
    }

    if (selectedBeatOptions.length === 2 && namedBeats.length === 2) {
      return namedBeats.join(', ');
    }

    return `${selectedBeatOptions.length} beats selected`;
  }, [selectedBeatOptions]);


  const salesPersonSummary = useMemo(() => {
    if (selectedWarehouseIds.length === 0) {
      return 'Select warehouses first';
    }

    if (selectedSalesPersonIds.length === 0) {
      return 'Select sales persons';
    }

    if (selectedSalesPersonIds.length === 1) {
      return '1 sales person selected';
    }

    return `${selectedSalesPersonIds.length} sales persons selected`;
  }, [selectedSalesPersonIds, selectedWarehouseIds.length]);

  // Reset form when initial data changes or modal opens
  useEffect(() => {
    if (open) {
      setSelectedWarehouseIds(initialData?.warehouseIds?.map(String) || []);
      setSelectedSalesPersonIds(initialData?.userIds?.map(String) || []);
      setSelectedBeatOptions(
        initialData?.beatIds?.map((beatId) => ({ beatId, beatName: '' })) || []
      );
    }
  }, [open, initialData]);

  // Fetch warehouses
  const warehouseFilters = useMemo(() => {
    return {
      nonPaginated: true,
    };
  }, []);

  const { warehouses } = useWarehouse(undefined, warehouseFilters);

  interface WarehouseItem {
    warehouseId?: string;
    _id?: string;
    warehouseName: string;
  }

  const warehouseOptions = useMemo(() => {
    if (!warehouses?.data?.data?.items) return [];
    const warehouseData = warehouses.data.data.items as WarehouseItem[];
    return warehouseData.map((warehouse) => ({
      value: warehouse.warehouseId || warehouse._id || '',
      label: warehouse.warehouseName,
    }));
  }, [warehouses?.data?.data?.items]);

  const warehouseSummary = useMemo(() => {
    if (selectedWarehouseIds.length === 0) {
      return 'Select warehouses';
    }

    const displayNames = selectedWarehouseIds.map((id) => {
      const label = warehouseOptions.find((option) => option.value === id)?.label;
      return label || id;
    });

    return displayNames.join(', ');
  }, [selectedWarehouseIds, warehouseOptions]);

  const handleWarehouseModalOpen = () => {
    setWarehouseIdsSnapshot([...selectedWarehouseIds]);
    setIsWarehouseModalOpen(true);
  };

  const handleWarehouseModalCancel = () => {
    setSelectedWarehouseIds(warehouseIdsSnapshot);
    setIsWarehouseModalOpen(false);
  };

  const handleWarehouseModalConfirm = () => {
    if (isReadOnly) {
      // Don't update state if read-only, just close modal
      setIsWarehouseModalOpen(false);
      return;
    }
    setIsWarehouseModalOpen(false);
  };

  const handleSalesPersonModalOpen = () => {
    setSalesPersonIdsSnapshot([...selectedSalesPersonIds]);
    setIsSalesPersonModalOpen(true);
  };

  const handleSalesPersonModalCancel = () => {
    setSelectedSalesPersonIds(salesPersonIdsSnapshot);
    setIsSalesPersonModalOpen(false);
  };

  const handleSalesPersonModalConfirm = (salesPersonIds: string[]) => {
    if (isReadOnly) {
      setIsSalesPersonModalOpen(false);
      return;
    }
    const uniqueSalesPersonIds = Array.from(new Set(salesPersonIds.filter(Boolean)));
    setSelectedSalesPersonIds(uniqueSalesPersonIds);
    setIsSalesPersonModalOpen(false);
  };

  const handleBeatModalOpen = () => {
    setBeatSnapshot([...selectedBeatOptions]);
    setIsBeatModalOpen(true);
  };

  const handleBeatModalCancel = () => {
    setSelectedBeatOptions(beatSnapshot);
    setIsBeatModalOpen(false);
  };

  const handleBeatModalConfirm = (beats: BeatOption[]) => {
    if (isReadOnly) {
      setIsBeatModalOpen(false);
      return;
    }
    const uniqueBeats = Array.from(
      new Map(
        beats
          .filter((beat) => Boolean(beat?.beatId))
          .map((beat) => [beat.beatId, beat])
      ).values()
    );

    setSelectedBeatOptions(uniqueBeats);
    setIsBeatModalOpen(false);
  };

  const handleConfirm = () => {
    const data: ApplicableToData = {
      warehouseIds: selectedWarehouseIds,
      beatIds: selectedBeatIds,
      userIds: selectedSalesPersonIds,
    };
    onConfirm(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Assign Areas</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="warehouses">Warehouses</Label>
            <Button
              type="button"
              variant="outline"
              onClick={handleWarehouseModalOpen}
              className="w-full justify-start text-left font-normal"
            >
              <span className="truncate">{warehouseSummary}</span>
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sales-persons">Sales Persons</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start text-left font-normal"
              onClick={handleSalesPersonModalOpen}
              disabled={selectedWarehouseIds.length === 0}
            >
              <span className="truncate">{salesPersonSummary}</span>
            </Button>
          </div>

          <div className="space-y-2 w-full">
            <Label htmlFor="beats">Beats</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start text-left font-normal"
              onClick={handleBeatModalOpen}
            >
              <span className="truncate">{beatSummary}</span>
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isReadOnly}>Confirm</Button>
        </DialogFooter>
        <WarehouseMultiSelectModal
          open={isWarehouseModalOpen}
          selectedWarehouseIds={selectedWarehouseIds}
          onChange={isReadOnly ? () => {} : setSelectedWarehouseIds}
          onConfirm={handleWarehouseModalConfirm}
          onCancel={handleWarehouseModalCancel}
          disabled={isReadOnly}
        />
        <BeatMultiSelectModal
          open={isBeatModalOpen}
          selectedBeats={selectedBeatOptions}
          onConfirm={handleBeatModalConfirm}
          onCancel={handleBeatModalCancel}
          disabled={isReadOnly}
        />
        <SalesPersonMultiSelectModal
          open={isSalesPersonModalOpen}
          selectedUserIds={selectedSalesPersonIds}
          onConfirm={handleSalesPersonModalConfirm}
          onCancel={handleSalesPersonModalCancel}
          warehouseIds={selectedWarehouseIds}
          disabled={isReadOnly}
        />
      </DialogContent>
    </Dialog>
  );
};

