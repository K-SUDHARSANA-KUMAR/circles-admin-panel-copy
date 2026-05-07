'use client';

import { useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BeatSelectionModal } from '@/components/modals/beat-selection-modal';
import { MapPin, X } from 'lucide-react';

interface BeatOption {
  beatId: string;
  beatName: string;
  beatCode?: string;
  stateId?: string;
  districtId?: string;
}

type Props = {
  form: any;
  stateId?: string;
  districtId?: string;
  disabled?: boolean;
};

export const BeatDetailsSection = ({ form, stateId, districtId, disabled = false }: Props) => {
  const [isBeatModalOpen, setIsBeatModalOpen] = useState(false);
  const [selectedBeat, setSelectedBeat] = useState<BeatOption | null>(null);

  // Initialize selectedBeat from form data when component mounts or form data changes
  useEffect(() => {
    const beatId = form.watch('beatDetails.beatId');
    const beatName = form.watch('beatDetails.beatName');
    
    if (beatId && beatName && !selectedBeat) {
      setSelectedBeat({
        beatId: beatId,
        beatName: beatName,
      });
    } else if (!beatId && selectedBeat) {
      setSelectedBeat(null);
    }
  }, [form.watch('beatDetails.beatId'), form.watch('beatDetails.beatName'), selectedBeat, form]);

  const handleBeatSelect = (beatId: string | undefined, beatData?: BeatOption) => {
    if (beatId && beatData) {
      setSelectedBeat(beatData);
      form.setValue('beatDetails.beatId', beatId);
      form.setValue('beatDetails.beatName', beatData.beatName);
      // Reset priority when beat changes
      form.setValue('beatDetails.beatPriority', undefined);
    } else {
      setSelectedBeat(null);
      form.setValue('beatDetails.beatId', undefined);
      form.setValue('beatDetails.beatName', undefined);
      form.setValue('beatDetails.beatPriority', undefined);
    }
  };

  const handleBeatConfirm = () => {
    setIsBeatModalOpen(false);
  };

  const handleBeatCancel = () => {
    setIsBeatModalOpen(false);
  };

  const handleRemoveBeat = () => {
    setSelectedBeat(null);
    form.setValue('beatDetails.beatId', undefined);
    form.setValue('beatDetails.beatName', undefined);
    form.setValue('beatDetails.beatPriority', undefined);
  };

  const handlePriorityChange = (value: string) => {
    const numValue = value === '' ? undefined : Number(value);
    form.setValue('beatDetails.beatPriority', numValue);
  };

  const beatId = form.watch('beatDetails.beatId');
  const beatPriority = form.watch('beatDetails.beatPriority');

  return (
    <div className="rounded-lg bg-card p-4">
      <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
        Beat Details
      </div>
      
      <div className="space-y-4">
        {/* Beat Selection */}
        <FormField
          control={form.control}
          name="beatDetails.beatId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beat Selection</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsBeatModalOpen(true)}
                    className="flex items-center gap-2 flex-1 justify-start"
                    disabled={disabled}
                  >
                    <MapPin className="h-4 w-4" />
                    {selectedBeat ? selectedBeat.beatName : 'Select Beat'}
                  </Button>
                  {selectedBeat && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleRemoveBeat}
                      className="text-red-600 hover:text-red-700"
                      disabled={disabled}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Beat Priority - Only visible when beat is selected */}
        {selectedBeat && (
          <FormField
            control={form.control}
            name="beatDetails.beatPriority"
            render={({ field }) => (
              <FormItem>
                <FormLabel isRequired>
                  Beat Priority
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter priority number"
                    value={beatPriority || ''}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    className="w-full"
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Beat Selection Modal */}
      <BeatSelectionModal
        open={isBeatModalOpen}
        selectedBeatId={beatId}
        onChange={handleBeatSelect}
        onConfirm={handleBeatConfirm}
        onCancel={handleBeatCancel}
        stateId={stateId}
        districtId={districtId}
        initialSelectedOption={selectedBeat || undefined}
      />
    </div>
  );
};

export default BeatDetailsSection;
