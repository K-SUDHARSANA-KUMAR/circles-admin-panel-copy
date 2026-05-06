import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, XIcon, Search } from 'lucide-react';

const formatStatusLabel = (status: string): string => {
  // Convert camelCase or SNAKE_CASE to Title Case
  return status
    // Split by underscore or capital letters
    .split(/[_\s]|(?=[A-Z])/)
    // Capitalize first letter of each word
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    // Join words with spaces
    .join(' ');
};

export interface CheckboxMultiSelectOption {
  value: string;
  label: string;
}

interface CheckboxMultiSelectProps<TOption extends CheckboxMultiSelectOption = CheckboxMultiSelectOption> {
  options: TOption[];
  value?: string[];
  onChange?: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  displayName?: string;
  searchable?: boolean;
  showSelectAll?: boolean;
}

export const CheckboxMultiSelect = <TOption extends CheckboxMultiSelectOption = CheckboxMultiSelectOption>({
  options,
  value = [],
  onChange,
  placeholder = 'Select',
  className,
  disabled = false,
  displayName,
  searchable = true,
  showSelectAll = true,
}: CheckboxMultiSelectProps<TOption>) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm.trim()) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchable, searchTerm]);

  const getDisplayText = () => {
    if (value.length === 0) return placeholder;
    const unit = displayName || 'item';
    if (value.length === 1) {
      const selected = options.find((o) => o.value === value[0]);
      if (selected) return selected.label;
      return `1 ${unit}`;
    }
    return `${value.length} ${unit}${value.length > 1 ? 's' : ''}`;
  };
  const isPlaceholder = value.length === 0;

  const handleOptionToggle = useCallback(
    (optionValue: string, checked: boolean) => {
      let newValue: string[];
      if (checked) {
        newValue = [...value, optionValue];
      } else {
        newValue = value.filter((v) => v !== optionValue);
      }
      onChange?.(newValue);
    },
    [value, onChange]
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!showSelectAll) return;
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
      onChange?.(newValue);
    },
    [value, filteredOptions, onChange, showSelectAll]
  );

  const handleClearAll = useCallback(() => {
    onChange?.([]);
  }, [onChange]);

  const isAllSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every((option) => value.includes(option.value));

  const isSomeSelected = filteredOptions.some((option) =>
    value.includes(option.value)
  );

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
            <span className={cn('truncate', isPlaceholder && 'text-muted-foreground')}>{getDisplayText()}</span>
            <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" side="bottom" sideOffset={4}>
          {(searchable || showSelectAll) && (
            <div className="border-b p-3">
              {searchable && (
                <div className="mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${displayName || 'items'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              )}
              {showSelectAll && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      data-indeterminate={
                        isSomeSelected && !isAllSelected ? 'true' : undefined
                      }
                    />
                    <span className="text-sm font-medium">
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
                      <XIcon className="mr-1 h-3 w-3" />
                      Clear
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="max-h-60 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()}>
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                No {displayName || 'items'} found
              </div>
            ) : (
              <div className="p-1">
                {filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex cursor-pointer items-center space-x-2 rounded-sm p-2 hover:bg-accent"
                    onClick={() =>
                      handleOptionToggle(
                        option.value,
                        !value.includes(option.value)
                      )
                    }
                  >
                    <Checkbox
                      checked={value.includes(option.value)}
                      onCheckedChange={(checked) =>
                        handleOptionToggle(option.value, !!checked)
                      }
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


