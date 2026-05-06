'use client';

import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { FieldTypes } from '@/constants/master-schema';
import { camelCaseToReadable } from '@/utils/string-utils';
import { PlusIcon } from 'lucide-react';

interface FiltersBarProps {
  schemaName: string | null;
  fields: any[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedMasterValues: Record<string, string>;
  onMasterChange: (masterType: string, value: string) => void;
  onAddNew: () => void;
  isBusy?: boolean;
}

export const FiltersBar = ({
  schemaName,
  fields,
  search,
  onSearchChange,
  selectedMasterValues,
  onMasterChange,
  onAddNew,
  isBusy,
}: FiltersBarProps) => {
  return (
    <div className="flex flex-col gap-2 pb-4">
      <div className="flex w-full items-center justify-between">
        <div className='w-full md:w-1/2'>
          <SearchInput
            placeholder={`Search ${camelCaseToReadable(schemaName || '')} records`}
            value={search}
            onChange={onSearchChange}
          />
        </div>

        <Button disabled={isBusy} onClick={onAddNew} aria-label="Add New Record">
          <PlusIcon className="h-4 w-4" />
          Add New Record
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-5">
        {fields?.map((field: any, index: number) => {
          if (field.type === FieldTypes.Master) {
            return (
              <MasterRecordDropdown
                key={field.masterType || index}
                masterName={field.masterType}
                value={selectedMasterValues[field.masterType] || ''}
                onChange={(value) => onMasterChange(field.masterType, value)}
                placeholder={'Select ' + camelCaseToReadable(field.masterType)}
                className="w-full"
                showAll={true}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default FiltersBar;


