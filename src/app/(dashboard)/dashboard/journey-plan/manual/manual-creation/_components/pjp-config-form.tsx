import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { DateRange } from 'react-day-picker';
import { MasterRecordSelect } from '@/components/shared/master-record-select';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import { useMemo } from 'react';

interface PjpConfigFormProps {
  pjpType: string;
  dateRange: DateRange | undefined;
  selectedUser: string;
  editModeUserName: string;
  isEditMode: boolean;
  isApprovedRecord?: boolean;
  reason?: string;
  selectedUserName?: string;
  onPjpTypeChange: (type: string) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onReasonChange?: (reason: string) => void;
  onUserSelectClick?: () => void;
  getValidatedRange?: (startDate: Date) => DateRange | undefined;
  dateMode?: 'auto' | 'manual';
  showUserSelection?: boolean;
  isReadOnly?: boolean;
  isPlanTypeAutoSet?: boolean;
  isLoadingUserPlan?: boolean;
  canChangePlan?: boolean;
  minDaysFromToday?: number;
  customDisabledDates?: (date: Date) => boolean;
  daysBeforeNextCycle?: number;
}

export const PjpConfigForm = ({
  pjpType,
  dateRange,
  selectedUser,
  editModeUserName,
  isEditMode,
  isApprovedRecord = false,
  reason = '',
  selectedUserName = '',
  onPjpTypeChange,
  onDateRangeChange,
  onReasonChange,
  onUserSelectClick,
  getValidatedRange,
  dateMode = 'auto',
  showUserSelection = true,
  isReadOnly = false,
  isPlanTypeAutoSet = false,
  isLoadingUserPlan = false,
  canChangePlan = true,
  minDaysFromToday,
  customDisabledDates,
  daysBeforeNextCycle = 2,
}: PjpConfigFormProps) => {
  // Fetch master records to get PJP type code for maxDays calculation
  const { records: pjpTypeRecords } = useMasterRecords(
    'pjpPlanType',
    undefined,
    1,
    1000,
    true
  );

  // Get the code/name from selected PJP type ID
  const pjpTypeCode = useMemo(() => {
    if (!pjpType || !pjpTypeRecords?.data) return '';
    
    const masterRecords: any[] = Array.isArray(pjpTypeRecords.data) 
      ? (pjpTypeRecords.data as any[])
      : [];
    
    const selectedRecord = masterRecords.find((record: any) => {
      const recordId = record.pjpPlanTypeId || record._id || record.id;
      return String(recordId) === String(pjpType);
    });
    
    if (!selectedRecord) return '';
    
    // Try to get code field (pjpPlanTypeCode, code, or name)
    return (
      selectedRecord.pjpPlanTypeCode ||
      selectedRecord.code ||
      selectedRecord.pjpPlanTypeName ||
      selectedRecord.name ||
      ''
    ).toLowerCase();
  }, [pjpType, pjpTypeRecords?.data]);

  // Calculate max days based on PJP type code
  const maxDays = useMemo(() => {
    switch (pjpTypeCode) {
      case 'weekly':
        return 7;
      case 'bi-monthly':
        return 15;
      case 'monthly':
        return 31;
      default:
        return undefined;
    }
  }, [pjpTypeCode]);

  const getUserDisplayText = () => {
    if (isEditMode) {
      return editModeUserName || 'Loading...';
    }
    if (selectedUser && selectedUserName) {
      return selectedUserName;
    }
    return 'Select User';
  };

  return (
    <>
      {/* User Selection Button - Only in Create Mode */}
      {showUserSelection && !isEditMode && (
        <div className="space-y-2">
          <Label htmlFor="user">User</Label>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-left font-normal"
            onClick={onUserSelectClick}
          >
            {getUserDisplayText()}
          </Button>
        </div>
      )}

      {/* Sales Person Display for Edit Mode */}
      {isEditMode && (
        <div className="space-y-2">
          <Label htmlFor="sales-person">Sales Person</Label>
          <div
            id="sales-person"
            className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
            role="textbox"
            aria-label="Selected sales person"
            tabIndex={0}
          >
            {editModeUserName || 'Fetching sales person...'}
          </div>
        </div>
      )}

      {/* PJP Type Dropdown */}
      <div className="space-y-2">
        <Label htmlFor="pjptype">PJP Type</Label>
        {isLoadingUserPlan ? (
          <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
            Loading plan type...
          </div>
        ) : (
          <MasterRecordSelect
            masterName="pjpPlanType"
            value={pjpType}
            onChange={onPjpTypeChange}
            placeholder={
              (!selectedUser && !isEditMode) 
                ? "Select User First" 
                : isPlanTypeAutoSet
                ? "Plan type auto-selected"
                : "Select PJP type"
            }
            className="w-full"
            disabled={(!selectedUser && !isEditMode) || isReadOnly || isPlanTypeAutoSet}
          />
        )}
        {isPlanTypeAutoSet && pjpType && (
          <p className="text-xs text-muted-foreground">
            Plan type automatically set based on user configuration
          </p>
        )}
      </div>

      {/* Date Range Picker */}
      <div className="space-y-2">
        <Label htmlFor="daterange">
          Visit Period
          {maxDays && (
            <span className="ml-2 text-xs text-gray-500">
              (Max {maxDays} days)
            </span>
          )}
        </Label>
        {pjpType ? (
          <>
            <DateRangePicker
              dateRange={dateRange}
              onSelect={onDateRangeChange}
              disabled={isEditMode}
              className="w-full"
              placeholder="Pick a date range"
              disablePastDates={!customDisabledDates}
              maxDays={maxDays}
              getValidatedRange={getValidatedRange}
              mode={dateMode}
              minDaysFromToday={minDaysFromToday}
              customDisabledDates={customDisabledDates}
            />
            {!isEditMode && !customDisabledDates && minDaysFromToday && (
              <p className="text-xs text-muted-foreground mt-1">
                Plans must start at least {minDaysFromToday} days from today
              </p>
            )}
            {!isEditMode && customDisabledDates && (
              <p className="text-xs text-muted-foreground mt-1">
                You can select current cycle or next cycle if within {daysBeforeNextCycle} days of its start
              </p>
            )}
            {isEditMode && !canChangePlan && (
              <p className="text-xs text-amber-600 mt-1">
                Plan cannot be changed. Changes are only allowed more than {daysBeforeNextCycle} days before the plan start date.
              </p>
            )}
          </>
        ) : (
          <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
            Select PJP Type First
          </div>
        )}
      </div>

      {/* Reason Field for Approved Records in Edit Mode */}
      {isEditMode && isApprovedRecord && (
        <div className="space-y-2">
          <Label htmlFor="reason">Reason for Edit <span className="text-red-500">*</span></Label>
          <Input
            id="reason"
            placeholder="Reason for Edit"
            value={reason}
            onChange={(e) => onReasonChange?.(e.target.value)}
            required
          />
        </div>
      )}
    </>
  );
};
