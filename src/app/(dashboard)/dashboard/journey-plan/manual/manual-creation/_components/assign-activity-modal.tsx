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
import { MasterRecordSelect } from '@/components/shared/master-record-select';
import { BeatMultiSelectModal } from '@/components/modals/beat-multiselect-modal';
import type { BeatOption } from '@/components/modals/beat-selection-modal';

interface AssignActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { beatIds: string[]; pjpVisitTypeId: string }) => void;
  initialData?: {
    beatIds?: string[];
    pjpVisitTypeId?: string;
  };
  isReadOnly?: boolean;
}

export const AssignActivityModal = ({
  open,
  onOpenChange,
  onConfirm,
  initialData,
  isReadOnly = false,
}: AssignActivityModalProps) => {
  const [selectedBeatOptions, setSelectedBeatOptions] = useState<BeatOption[]>(
    initialData?.beatIds?.map((beatId) => ({ beatId, beatName: '' })) || []
  );
  const [isBeatModalOpen, setIsBeatModalOpen] = useState(false);
  const [beatSnapshot, setBeatSnapshot] = useState<BeatOption[]>([]);
  const [selectedPjpVisitTypeId, setSelectedPjpVisitTypeId] = useState<string>(
    initialData?.pjpVisitTypeId || ''
  );

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

  // Reset form when initial data changes or modal opens
  useEffect(() => {
    if (open) {
      setSelectedBeatOptions(
        initialData?.beatIds?.map((beatId) => ({ beatId, beatName: '' })) || []
      );
      setSelectedPjpVisitTypeId(initialData?.pjpVisitTypeId || '');
    }
  }, [open, initialData]);

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
    if (!selectedPjpVisitTypeId) {
      return;
    }
    const data = {
      beatIds: selectedBeatIds,
      pjpVisitTypeId: selectedPjpVisitTypeId,
    };
    onConfirm(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Activity</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="beats">Beats</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal"
                onClick={handleBeatModalOpen}
                disabled={isReadOnly}
              >
                <span className="truncate">{beatSummary}</span>
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pjp-visit-type">PJP Visit Type</Label>
              <MasterRecordSelect
                masterName="pjpVisitType"
                value={selectedPjpVisitTypeId}
                onChange={setSelectedPjpVisitTypeId}
                placeholder="Select PJP visit type"
                className="w-full"
                disabled={isReadOnly}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isReadOnly || !selectedPjpVisitTypeId || selectedBeatIds.length === 0}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BeatMultiSelectModal
        open={isBeatModalOpen}
        selectedBeats={selectedBeatOptions}
        onConfirm={handleBeatModalConfirm}
        onCancel={handleBeatModalCancel}
        disabled={isReadOnly}
      />
    </>
  );
};
