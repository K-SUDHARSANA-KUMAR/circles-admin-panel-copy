import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setMasterRecords } from '@/store/slices/masterRecordsSlice';
import { useEffect, useMemo, useCallback, useState } from 'react';
import {useRef} from 'react';
import { ChevronDownIcon, XIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { MasterRecord, MasterRecordFilters } from '@/features/master-managment/types/master.types';

interface MasterRecordCheckboxMultiSelectProps {
  masterName: string;
  value?: string[];
  // onChange?: (value: string[]) => void;
   onChange?: (values: string[], options: OptionType[]) => void; 
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  filters?: MasterRecordFilters;
  displayName?: string; // Custom display name for the count (e.g., "division", "channel")
  filterIds?: string[]; // New prop to filter options by specific IDs
  userId?: string; // Optional userId to fetch via users endpoint
  useCode?: boolean; // New prop to select by code instead of ID
  skipStoreUpdate?: boolean; // New prop to skip updating Redux store and use local query data
}

interface OptionType {
  value: string;
  label: string;
}

export const MasterRecordCheckboxMultiSelect = ({
  masterName,
  value = [],
  onChange,
  placeholder = 'Select',
  className,
  disabled = false,
  filters,
  displayName,
  filterIds,
  userId,
  useCode = false,
  skipStoreUpdate = false,
}: MasterRecordCheckboxMultiSelectProps) => {
  const dispatch = useAppDispatch();
  const { records } = useAppSelector((state) => state.masterRecords);
  const { records: recordsQuery } = useMasterRecords(
    masterName,
    undefined,
    1,
    10,
    true,
    filters,
    userId
  );
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const getDisplayField = (record: MasterRecord) => {
    const camelCaseField = `${masterName}Name`;
    const lowercaseField = `${masterName}name`;

    return (
      record[camelCaseField as keyof MasterRecord] ||
      record[lowercaseField as keyof MasterRecord] ||
      ''
    );
  };

  // Get the code field for display
  const getCodeField = (record: MasterRecord) => {
    if (masterName === 'menuRights') {
      return record['code' as keyof MasterRecord] as string || '';
    }
    if (masterName === 'division') {
      return record['shortCode' as keyof MasterRecord] as string || '';
    }
    
    const camelCaseCodeField = `${masterName}Code`;
    const lowercaseCodeField = `${masterName}code`;
    
    return (
      record[camelCaseCodeField as keyof MasterRecord] ||
      record[lowercaseCodeField as keyof MasterRecord] ||
      ''
    );
  };

  const getIdField = (record: MasterRecord) => {
    return record[`${masterName}Id` as keyof MasterRecord] as string;
  };

  // Get the value field (ID or Code) based on useCode prop
  const getValueField = (record: MasterRecord) => {
    if (useCode) {
      // For divisions, use shortCode field
      if (masterName === 'division') {
        return record['shortCode' as keyof MasterRecord] as string;
      }
      
      const camelCaseCodeField = `${masterName}Code`;
      const lowercaseCodeField = `${masterName}code`;
      
      return (
        record[camelCaseCodeField as keyof MasterRecord] ||
        record[lowercaseCodeField as keyof MasterRecord] ||
        ''
      );
    } else {
      return getIdField(record);
    }
  };

  const currentRecords = useMemo(
    () => {
      if (skipStoreUpdate) {
        return Array.isArray(recordsQuery?.data) ? recordsQuery.data : [];
      }
      return records[masterName] || [];
    },
    [records, masterName, skipStoreUpdate, recordsQuery?.data]
  );

  const options: OptionType[] = useMemo(() => {
    return currentRecords
      .filter((record: MasterRecord) => {
        const recordValue = getValueField(record);
        if (!recordValue) return false;
        
        // If filterIds is provided, only show records with matching values
        if (filterIds && filterIds.length > 0) {
          return filterIds.includes(String(recordValue));
        }
        
        return true;
      })
      .map((record: MasterRecord) => {
        const displayName = String(getDisplayField(record));
        const codeValue = String(getCodeField(record));
        const label = codeValue ? `${displayName} (${codeValue})` : displayName;
        
        return {
          value: String(getValueField(record)),
          label: label,
        };
      });
  }, [currentRecords, masterName, filterIds, useCode]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const selectedOptions = useMemo(() => {
    if (!value || value.length === 0) return [];

    return value
      .map((val) => options.find((option) => option.value === val))
      .filter((option): option is OptionType => option !== undefined);
  }, [value, options]);

  // Get display text for the button
  const getDisplayText = () => {
    if (value.length === 0) return placeholder;
    
    const displayText = displayName || masterName;
    const capitalizedDisplayText = displayText.charAt(0).toUpperCase() + displayText.slice(1);
    
    if (value.length === 1) {
      const selectedOption = selectedOptions[0];
      if (selectedOption) {
        // Extract just the name part (before the code in brackets)
        const nameOnly = selectedOption.label.split(' (')[0];
        return nameOnly;
      }
      return `1 ${capitalizedDisplayText}`;
    }
    return `${value.length} ${capitalizedDisplayText}s`;
  };

  useEffect(() => {
    if (skipStoreUpdate) return;
    if (recordsQuery?.data && Array.isArray(recordsQuery.data)) {
      const existingRecords = currentRecords;
      const newRecords = recordsQuery.data;

      if (existingRecords.length !== newRecords.length) {
        dispatch(
          setMasterRecords({
            masterName,
            records: newRecords,
          })
        );
      } else {
        const hasChanged = existingRecords.some((existing, index) => {
          const newRecord = newRecords[index];
          if (!newRecord) return true;

          const existingValue = getValueField(existing);
          const newValue = getValueField(newRecord);
          return existingValue !== newValue;
        });

        if (hasChanged) {
          dispatch(
            setMasterRecords({
              masterName,
              records: newRecords,
            })
          );
        }
      }
    }
  }, [recordsQuery?.data, masterName, dispatch]);

  const handleOptionToggle = useCallback(
  (optionValue: string, checked: boolean) => {
    let newValue: string[];
    if (checked) {
      newValue = [...value, optionValue];
    } else {
      newValue = value.filter((v) => v !== optionValue);
    }

    const newOptions = options.filter((opt) => newValue.includes(opt.value));
    onChange?.(newValue, newOptions);
  },
  [value, onChange, options]
);

const handleSelectAll = useCallback(
  (checked: boolean) => {
    let newValue: string[];
    if (checked) {
      newValue = [
        ...new Set([...value, ...filteredOptions.map((opt) => opt.value)]),
      ];
    } else {
      newValue = value.filter(
        (v) => !filteredOptions.some((opt) => opt.value === v)
      );
    }

    const newOptions = options.filter((opt) => newValue.includes(opt.value));
    onChange?.(newValue, newOptions);
  },
  [value, filteredOptions, options, onChange]
);

const handleClearAll = useCallback(() => {
  onChange?.([], []);
}, [onChange]);


  const isAllSelected = filteredOptions.length > 0 && 
    filteredOptions.every(option => value.includes(option.value));
  
  const isSomeSelected = filteredOptions.some(option => value.includes(option.value));

  return (
    <div className={cn('w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="white"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">{getDisplayText()}</span>
            <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" side="bottom" sideOffset={4}>
          <div className="p-3 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${displayName || masterName}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  data-indeterminate={isSomeSelected && !isAllSelected ? 'true' : undefined}
                />
                <span className="text-sm">
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </span>
              </div>
              {value.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-auto p-1 text-xs"
                >
                  <XIcon className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()}>
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                No {displayName || masterName} found
              </div>
            ) : (
              <div className="p-1">
                {filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                    onClick={() => handleOptionToggle(option.value, !value.includes(option.value))}
                  >
                    <Checkbox
                      checked={value.includes(option.value)}
                      onCheckedChange={(checked) => handleOptionToggle(option.value, !!checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm">{option.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
