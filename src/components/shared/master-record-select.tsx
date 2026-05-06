import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import {
  MasterRecord,
  MasterRecordFilters,
} from '@/features/master-managment/types/master.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useMemo, useCallback, useEffect } from 'react';

interface MasterRecordSelectProps {
  masterName: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  filters?: MasterRecordFilters;
  disabled?: boolean;
  enabled?: boolean;
  useCode?: boolean; // New prop to select by code instead of ID
}

export const MasterRecordSelect = ({
  disabled = false,
  enabled = true,
  masterName,
  value,
  onChange,
  placeholder = 'Select',
  className,
  filters,
  useCode = false,
}: MasterRecordSelectProps) => {
  const { records: recordsQuery } = useMasterRecords(
    enabled ? masterName : '',
    undefined, // Don't pass value to avoid unnecessary API call
    1,
    1000,
    true,
    enabled ? filters : undefined
  );

  const [searchTerm, setSearchTerm] = useState('');

  // Handle field name mapping for different master types
  const getDisplayField = (record: MasterRecord) => {
    // Special handling for transportmode - API returns 'transportModeName' (camelCase with capital M)
    if (masterName === 'transportmode' || masterName === 'transportMode') {
      return (record['transportModeName' as keyof MasterRecord] as string) || '';
    }
    
    const camelCaseField = `${masterName}Name`;
    const lowercaseField = `${masterName}name`;
    // Special casing for subcategory where API may return 'subCategoryName'
    const pascalMixField = masterName === 'subcategory' ? 'subCategoryName' : '';

    // Common fallbacks seen in some masters
    const genericName = (record['name' as keyof MasterRecord] as string) || '';
    const title = (record['title' as keyof MasterRecord] as string) || '';

    // Try camelCase first, then lowercase, then generic fallbacks
    return (
      record[camelCaseField as keyof MasterRecord] ||
      record[lowercaseField as keyof MasterRecord] ||
      (pascalMixField ? (record[pascalMixField as keyof MasterRecord] as string) : '') ||
      genericName ||
      title ||
      ''
    );
  };

  // Get the code field for display
  const getCodeField = (record: MasterRecord) => {
    if (masterName === 'menuRights') {
      return (record['code' as keyof MasterRecord] as string) || '';
    }
    if (masterName === 'division') {
      return (record['shortCode' as keyof MasterRecord] as string) || '';
    }
    
    const camelCaseCodeField = `${masterName}Code`;
    const lowercaseCodeField = `${masterName}code`;
    
    return (
      record[camelCaseCodeField as keyof MasterRecord] ||
      record[lowercaseCodeField as keyof MasterRecord] ||
      (record['code' as keyof MasterRecord] as string) ||
      ''
    );
  };

  // Get the value field (ID or Code) based on useCode prop
  const getValueField = (record: MasterRecord) => {
    if (useCode) {
      // Special handling for menuRights - it uses 'code' field directly
      if (masterName === 'menuRights') {
        return (record['code' as keyof MasterRecord] as string) || '';
      }
      
      const camelCaseCodeField = `${masterName}Code`;
      const lowercaseCodeField = `${masterName}code`;
      
      return (
        record[camelCaseCodeField as keyof MasterRecord] ||
        record[lowercaseCodeField as keyof MasterRecord] ||
        (record['code' as keyof MasterRecord] as string) ||
        (record['id' as keyof MasterRecord] as string) ||
        ''
      );
    } else {
      // Special handling for transportmode - API returns 'transportModeId' (camelCase with capital M)
      if (masterName === 'transportmode' || masterName === 'transportMode') {
        return (
          (record['transportModeId' as keyof MasterRecord] as string) ||
          (record['transportmodeId' as keyof MasterRecord] as string) ||
          (record['transportmodeid' as keyof MasterRecord] as string) ||
          (record['id' as keyof MasterRecord] as string) ||
          ''
        );
      }
      const camelCaseIdField = `${masterName}Id`;
      const lowercaseIdField = `${masterName}id`;
      // Special casing for subcategory where API may return 'subCategoryId'
      const pascalMixIdField = masterName === 'subcategory' ? 'subCategoryId' : '';
      
      return (
        record[camelCaseIdField as keyof MasterRecord] ||
        record[lowercaseIdField as keyof MasterRecord] ||
        (pascalMixIdField ? (record[pascalMixIdField as keyof MasterRecord] as string) : '') ||
        (record['id' as keyof MasterRecord] as string) ||
        ''
      );
    }
  };

  // Use records from query - useMasterRecords hook already transforms to array
  const masterRecords = useMemo(() => {
    if (!recordsQuery?.data) return [];
    return Array.isArray(recordsQuery.data) ? recordsQuery.data : [];
  }, [recordsQuery?.data]);

  // Filter records based on search term
  const filteredRecords = useMemo(() => {
    const term = (searchTerm ?? '').toString().trim().toLowerCase();
    if (!term) return masterRecords;
    
    return masterRecords.filter((record: MasterRecord) => {
      const displayField = getDisplayField(record);
      return (displayField ?? '').toString().toLowerCase().includes(term);
    });
  }, [masterRecords, searchTerm, masterName]);

  const handleValueChange = (newValue: string) => {
    if (newValue === 'select-master') {
      onChange?.('');
    } else {
      onChange?.(newValue);
    }
  };

  // Clear search when dropdown closes
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSearchTerm('');
    }
  }, []);

  // Get the selected record's display name
  const selectedDisplayName = useMemo(() => {
    if (!value) return '';

    // Find in the records list
    const recordInList = masterRecords.find((record: MasterRecord) => {
      const recordValue = getValueField(record);
      return String(recordValue) === String(value);
    });

    if (recordInList) {
      return String(getDisplayField(recordInList));
    }

    // If not found in list, return the value as fallback
    return value;
  }, [value, masterRecords]);

  // Handle value setting when records are loaded
  useEffect(() => {
    if (value && masterRecords.length > 0) {
      console.log(`MasterRecordSelect: Records loaded for ${masterName}, value: ${value}`);
      
      const recordInList = masterRecords.find((record: MasterRecord) => {
        const recordValue = getValueField(record);
        return String(recordValue) === String(value);
      });
      
      if (recordInList) {
        console.log(`MasterRecordSelect: Found matching record for ${masterName}:`, recordInList);
        // The SelectValue will automatically show the correct text based on the value
        // No need to force onChange as it causes infinite loops
      } else {
        console.log(`MasterRecordSelect: No matching record found for ${masterName} with value:`, value);
      }
    }
  }, [masterRecords.length, value, masterName, masterRecords]);

  return (
    <Select
      key={`${masterName}-${value}`}
      value={value || ''}
      onValueChange={handleValueChange}
      disabled={disabled || recordsQuery?.isLoading}
      onOpenChange={handleOpenChange}
    >
      <SelectTrigger className={cn('md:w-full', className)}>
        <SelectValue placeholder={recordsQuery?.isLoading ? `Loading ${masterName}...` : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {/* Show search input when there are more than 2 records */}
        {masterRecords.length > 2 && (
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder={`Search ${masterName}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="pl-9 w-full"
              />
            </div>
          </div>
        )}
        
        <SelectItem value="select-master">Select {masterName}</SelectItem>
        {filteredRecords.map((record: MasterRecord, index: number) => {
          const recordValue = getValueField(record);
          const key = recordValue ? String(recordValue) : `fallback-${index}`;
          const itemValue = recordValue ? String(recordValue) : `fallback-${index}`;

          // Skip records with empty or undefined values
          if (!recordValue) {
            return null;
          }

          const displayName = String(getDisplayField(record));
          const codeValue = String(getCodeField(record));
          
          return (
            <SelectItem key={key} value={itemValue}>
              <div className="flex items-center justify-between w-full">
                <span>{displayName}</span>
                {codeValue && (
                  <span className="text-gray-500 text-sm ml-2">({codeValue})</span>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
