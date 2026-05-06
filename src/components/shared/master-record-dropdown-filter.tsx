import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import { MasterRecord, MasterRecordFilters } from '@/features/master-managment/types/master.types';
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
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setMasterRecords, setSelectedValue } from '@/store/slices/masterRecordsSlice';
import { useEffect, useMemo, useCallback, useState, useRef } from 'react';

interface MasterRecordDropdownProps {
  masterName: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  filters?: MasterRecordFilters;
  instanceKey?: string; // Optional: For cache isolation (used only in Product Criteria)
  showAll?: boolean; // Optional: Add showAll=true to API request
}

export const MasterRecordDropdown = ({
  masterName,
  value,
  onChange,
  placeholder = 'Select',
  className,
  disabled = false,
  filters,
  instanceKey,
  showAll = false,
}: MasterRecordDropdownProps) => {
  const dispatch = useAppDispatch();
  const { records, selectedValues } = useAppSelector((state) => state.masterRecords);

  // Pass instanceKey to useMasterRecords for cache isolation (only when provided)
  const { records: recordsQuery } = useMasterRecords(
    masterName,
    undefined,
    1,
    10,
    true,
    filters,
    undefined,
    undefined,
    instanceKey,
    showAll
  );
  const [searchTerm, setSearchTerm] = useState('');
  const lastProcessedDataRef = useRef<string>('');

  // Create unique Redux key when instanceKey is provided
  const reduxKey = useMemo(() => {
    return instanceKey ? `${masterName}_${instanceKey}` : masterName;
  }, [masterName, instanceKey]);

  // Handle field name mapping for different master types
  const getDisplayField = (record: MasterRecord) => {
    const camelCaseField = `${masterName}Name`;
    const lowercaseField = `${masterName}name`;

    // Special handling for subZone - API returns 'subZoneName'
    if (masterName === 'subZone') {
      return (
        (record['subZoneName' as keyof MasterRecord] as string) ||
        (record['subzonename' as keyof MasterRecord] as string) ||
        (record['subzonename' as keyof MasterRecord] as string) ||
        ''
      );
    }

    // Try camelCase first, then lowercase
    return record[camelCaseField as keyof MasterRecord] || record[lowercaseField as keyof MasterRecord] || '';
  };

  // Get ID field with support for field name variations
  const getIdField = (record: MasterRecord): string => {
    const camelCaseIdField = `${masterName}Id`;
    const lowercaseIdField = `${masterName}id`;

    // Special handling for subZone - API returns 'subzoneId' (lowercase 'z')
    if (masterName === 'subZone') {
      return (
        (record['subZoneId' as keyof MasterRecord] as string) ||
        (record['subzoneId' as keyof MasterRecord] as string) ||
        (record['subzoneid' as keyof MasterRecord] as string) ||
        ''
      );
    }

    // Special casing for subcategory where API may return 'subCategoryId'
    const pascalMixIdField = masterName === 'subcategory' ? 'subCategoryId' : '';

    return (
      (record[camelCaseIdField as keyof MasterRecord] as string) ||
      (record[lowercaseIdField as keyof MasterRecord] as string) ||
      (pascalMixIdField ? (record[pascalMixIdField as keyof MasterRecord] as string) : '') ||
      (record['id' as keyof MasterRecord] as string) ||
      ''
    );
  };

  // Memoize the current records to prevent unnecessary updates
  // When instanceKey is provided, use query data directly for isolation
  const currentRecords = useMemo(() => {
    if (instanceKey && recordsQuery?.data) {
      // useMasterRecords already extracts items array, so data should be an array
      return Array.isArray(recordsQuery.data) ? recordsQuery.data : [];
    }
    // Fall back to Redux state when no instanceKey
    const reduxRecords = records[masterName] || [];
    // Also check if query data is available and use it if Redux is empty
    if (reduxRecords.length === 0 && recordsQuery?.data && Array.isArray(recordsQuery.data)) {
      return recordsQuery.data;
    }
    return reduxRecords;
  }, [instanceKey, recordsQuery?.data, records, masterName]);


  // Filter records based on search term
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return currentRecords;

    return currentRecords.filter((record: MasterRecord) => {
      const displayField = getDisplayField(record);
      return String(displayField).toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [currentRecords, searchTerm, masterName]);

  const currentSelectedValue = useMemo(() => {
    // Prioritize the prop value if it's provided, otherwise use Redux state with unique key
    const result = value !== undefined && value !== '' ? value : (selectedValues[reduxKey] || '');

    return result;
  }, [value, selectedValues, reduxKey]);

  // Store records in Redux when they are fetched - only when data actually changes
  useEffect(() => {
    if (recordsQuery?.data && Array.isArray(recordsQuery.data)) {
      // Create a stable string representation of the data to compare
      const dataSignature = JSON.stringify(
        recordsQuery.data.map(r => getIdField(r)).sort()
      );

      // Only update if the data signature has changed
      if (lastProcessedDataRef.current !== dataSignature) {
        lastProcessedDataRef.current = dataSignature;
        dispatch(setMasterRecords({
          masterName,
          records: recordsQuery.data
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordsQuery?.data, masterName, dispatch]);

  // Sync Redux state when value prop changes (use unique key when provided)
  useEffect(() => {
    if (value !== undefined && value !== selectedValues[reduxKey]) {
      dispatch(setSelectedValue({ masterName: reduxKey, value: value || '' }));
    }
  }, [value, reduxKey, selectedValues, dispatch]);

  const handleValueChange = useCallback((newValue: string) => {
    if (newValue === "select-master") {
      dispatch(setSelectedValue({ masterName: reduxKey, value: "" }));
      onChange?.("");
    } else {
      dispatch(setSelectedValue({ masterName: reduxKey, value: newValue }));
      onChange?.(newValue);
    }
  }, [dispatch, reduxKey, onChange]);

  // Clear search when dropdown closes
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSearchTerm('');
    }
  }, []);

  return (
    <Select value={currentSelectedValue} onValueChange={handleValueChange} disabled={disabled} onOpenChange={handleOpenChange}>
      <SelectTrigger className={cn('md:w-full', className)} disabled={disabled}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {/* Show search input when there are more than 2 records */}
        {currentRecords.length > 2 && (
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
          const recordId = getIdField(record);
          const key = recordId ? String(recordId) : `fallback-${index}`;
          const itemValue = recordId ? String(recordId) : `fallback-${index}`;

          // Skip records with empty or undefined IDs
          if (!recordId) {
            return null;
          }

          return (
            <SelectItem
              key={key}
              value={itemValue}
            >
              {String(getDisplayField(record))}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};