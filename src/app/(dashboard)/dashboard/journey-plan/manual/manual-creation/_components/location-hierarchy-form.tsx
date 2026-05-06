import { Label } from '@/components/ui/label';
import { MasterRecordSelect } from '@/components/shared/master-record-select';
import { FormState } from '../_types';

interface LocationHierarchyFormProps {
  formState: FormState;
  onDivisionChange: (division: string) => void;
  onChannelChange: (channel: string) => void;
  onZoneChange: (zone: string) => void;
  onSubZoneChange: (subZone: string) => void;
}

export const LocationHierarchyForm = ({
  formState,
  onDivisionChange,
  onChannelChange,
  onZoneChange,
  onSubZoneChange,
}: LocationHierarchyFormProps) => {
  return (
    <>
      {/* Division Single-Select */}
      <div className="space-y-2">
        <Label htmlFor="division">Division</Label>
        <MasterRecordSelect
          masterName="division"
          value={formState.selectedDivision}
          onChange={onDivisionChange}
          placeholder="Select division"
          className="w-full"
          enabled={true}
        />
      </div>

      {/* Channel Single-Select */}
      <div className="space-y-2">
        <Label htmlFor="channel">Channel</Label>
        <MasterRecordSelect
          masterName="channel"
          value={formState.selectedChannel}
          onChange={onChannelChange}
          placeholder={formState.selectedDivision ? "Select channel" : "Select Division First"}
          className="w-full"
          disabled={!formState.selectedDivision}
          enabled={!!formState.selectedDivision}
          filters={
            formState.selectedDivision
              ? { divisionId: [formState.selectedDivision] }
              : undefined
          }
        />
      </div>

      {/* Zone Single-Select */}
      <div className="space-y-2">
        <Label htmlFor="zone">Zone</Label>
        <MasterRecordSelect
          masterName="zone"
          value={formState.selectedZone}
          onChange={onZoneChange}
          placeholder={formState.selectedChannel ? "Select zone" : "Select Channel First"}
          className="w-full"
          disabled={!formState.selectedChannel}
          enabled={!!formState.selectedChannel}
          filters={
            formState.selectedChannel
              ? { channelId: [formState.selectedChannel] }
              : undefined
          }
        />
      </div>

      {/* SubZone Single-Select */}
      <div className="space-y-2">
        <Label htmlFor="subzone">Sub Zone</Label>
        <MasterRecordSelect
          masterName="subZone"
          value={formState.selectedSubZone}
          onChange={onSubZoneChange}
          placeholder={formState.selectedZone ? "Select sub zone" : "Select Zone First"}
          className="w-full"
          disabled={!formState.selectedZone}
          enabled={!!formState.selectedZone}
          filters={
            formState.selectedZone ? { zoneId: [formState.selectedZone] } : undefined
          }
        />
      </div>
    </>
  );
};
