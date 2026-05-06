import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import {
  MasterRecord,
  MasterRecordFilters,
} from '@/features/master-managment/types/master.types';
import { StyledMultiSelect } from '@/components/ui/styled-multi-select';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setMasterRecords,
  setSelectedValue,
} from '@/store/slices/masterRecordsSlice';
import { useEffect, useMemo, useCallback, useState } from 'react';

interface MasterRecordMultiSelectProps {
  masterName: string;
  value?: string[];
  //onChange?: (value: string[]) => void;
  onChange?: (value: string[], options: OptionType[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  filters?: MasterRecordFilters;
  maxToShow?: number;
  hideSelectedOptions?: boolean;
  filterIds?: string[]; // New prop to filter options by specific IDs
  enabled?: boolean;
  skipStoreUpdate?: boolean; // New prop to skip updating Redux store and use local query data
}

interface OptionType {
  value: string;
  label: string;
}

export const MasterRecordMultiSelect = ({
  masterName,
  value = [],
  onChange,
  placeholder = 'Select',
  className,
  disabled = false,
  filters,
  maxToShow = 3,
  hideSelectedOptions = true,
  filterIds,
  enabled = true,
  skipStoreUpdate = false,
}: MasterRecordMultiSelectProps) => {
  const dispatch = useAppDispatch();
  const { records } = useAppSelector((state) => state.masterRecords);
  const { records: recordsQuery } = useMasterRecords(
    enabled ? masterName : '',
    undefined,
    1,
    10,
    true,
    enabled ? filters : undefined
  );

  const getDisplayField = (record: MasterRecord) => {
    if (masterName === 'transportmode' || masterName === 'transportMode') {
      return (record['transportModeName' as keyof MasterRecord] as string) || '';
    }
    
    const camelCaseField = `${masterName}Name`;
    const lowercaseField = `${masterName}name`;

    return (
      record[camelCaseField as keyof MasterRecord] ||
      record[lowercaseField as keyof MasterRecord] ||
      ''
    );
  };

  const getIdField = (record: MasterRecord) => {
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
    return record[`${masterName}Id` as keyof MasterRecord] as string;
  };

  // Use filtered records from query when filters are provided, otherwise use cached records
  const currentRecords = useMemo(() => {
    // useMasterRecords hook already transforms to array, so just use it directly
    if (skipStoreUpdate) {
      return Array.isArray(recordsQuery?.data) ? recordsQuery.data : [];
    }
    if (filters && Object.keys(filters).length > 0) {
      // Use filtered data from query
      return Array.isArray(recordsQuery?.data) ? recordsQuery.data : [];
    }
    // Use cached records from Redux
    return records[masterName] || [];
  }, [records, masterName, recordsQuery?.data, filters, skipStoreUpdate]);

  const options: OptionType[] = useMemo(() => {
    return currentRecords
      .filter((record: MasterRecord) => {
        const recordId = getIdField(record);
        if (!recordId) return false;
        
        // If filterIds is provided, only show records with matching IDs
        if (filterIds && filterIds.length > 0) {
          return filterIds.includes(String(recordId));
        }
        
        return true;
      })
      .map((record: MasterRecord) => ({
        value: String(getIdField(record)),
        label: String(getDisplayField(record)),
      }));
  }, [currentRecords, masterName, filterIds]);

  const selectedOptions = useMemo(() => {
    if (!value || value.length === 0) return [];

    return value
      .map((val) => options.find((option) => option.value === val))
      .filter((option): option is OptionType => option !== undefined);
  }, [value, options]);

  useEffect(() => {
    if (skipStoreUpdate) return;
    
    // useMasterRecords hook already transforms to array
    const newRecords = Array.isArray(recordsQuery?.data) ? recordsQuery.data : [];
    if (newRecords.length > 0) {
      const existingRecords = currentRecords;

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

          const existingId = getIdField(existing);
          const newId = getIdField(newRecord);
          return existingId !== newId;
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
  }, [recordsQuery?.data, masterName, dispatch, currentRecords, skipStoreUpdate]);

  // const handleChange = useCallback(
  //   (selectedOptions: OptionType[] | null) => {
  //     const selectedValues = selectedOptions
  //       ? selectedOptions.map((option) => option.value)
  //       : [];
  //     onChange?.(selectedValues);
  //   },
  //   [onChange]
  // );

   const handleChange = useCallback(
    (selectedOptions: OptionType[] | null) => {
      const selectedValues = selectedOptions
        ? selectedOptions.map((option) => option.value)
        : [];
      onChange?.(selectedValues, selectedOptions ?? []); 
    },
    [onChange]
  );

  return (
    <div className={cn('w-full', className)}>
      <StyledMultiSelect
        isMulti
        options={options}
        value={selectedOptions}
        onChange={handleChange}
        placeholder={recordsQuery.isLoading ? `Loading ${masterName}...` : !enabled ? placeholder : placeholder}
        isDisabled={disabled || !enabled || recordsQuery.isLoading}
        maxToShow={maxToShow}
        hideSelectedOptions={hideSelectedOptions}
        isSearchable={enabled && options.length > 2}
        noOptionsMessage={() => (!enabled ? `Select dependency first` : `No ${masterName} found`)}
        loadingMessage={() => `Loading ${masterName}...`}
        isLoading={recordsQuery.isLoading}
      />
    </div>
  );
};
