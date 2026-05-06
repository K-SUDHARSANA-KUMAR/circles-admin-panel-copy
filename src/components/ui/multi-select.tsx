'use client';

import * as React from 'react';
import Select, { MultiValue, StylesConfig, components } from 'react-select';
import { ChevronDownIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  value?: Option[];
  onChange?: (value: Option[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const customStyles: StylesConfig<Option, true> = {
  control: (provided, state) => ({
    ...provided,
    minHeight: '36px',
    height: '36px',
    border: state.isFocused 
      ? '1px solid hsl(var(--freshleaf))' 
      : '1px solid hsl(var(--border))',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    boxShadow: state.isFocused 
      ? '0 0 0 3px hsl(var(--freshleaf) / 0.4)' 
      : 'none',
    '&:hover': {
      borderColor: state.isFocused 
        ? 'hsl(var(--freshleaf))' 
        : 'hsl(var(--input) / 0.5)',
      backgroundColor: 'hsl(var(--input) / 0.5)',
    },
    fontSize: '16px',
    fontWeight: '400',
    transition: 'all 0.2s ease-in-out',
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0 12px',
    gap: '4px',
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: 'hsl(var(--secondary))',
    borderRadius: '4px',
    fontSize: '14px',
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: 'hsl(var(--secondary-foreground))',
    padding: '2px 6px',
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: 'hsl(var(--secondary-foreground))',
    '&:hover': {
      backgroundColor: 'hsl(var(--destructive))',
      color: 'white',
    },
    borderRadius: '0 4px 4px 0',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'hsl(var(--muted-foreground))',
    fontSize: '16px',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '6px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    zIndex: 9999,
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
  menuList: (provided) => ({
    ...provided,
    padding: '4px',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused 
      ? 'hsl(var(--accent))' 
      : 'transparent',
    color: state.isFocused 
      ? 'hsl(var(--accent-foreground))' 
      : 'hsl(var(--popover-foreground))',
    padding: '6px 8px',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: 'hsl(var(--accent))',
    },
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (provided, state) => ({
    ...provided,
    color: 'hsl(var(--muted-foreground))',
    padding: '0 8px',
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s ease-in-out',
  }),
};

const DropdownIndicator = (props: any) => {
  return (
    <components.DropdownIndicator {...props}>
      <ChevronDownIcon className="h-4 w-4 opacity-50" />
    </components.DropdownIndicator>
  );
};

const MultiValueRemove = (props: any) => {
  return (
    <components.MultiValueRemove {...props}>
      <XIcon className="h-3 w-3" />
    </components.MultiValueRemove>
  );
};

export const MultiSelect = React.forwardRef<
  HTMLDivElement,
  MultiSelectProps
>(({ options, value, onChange, placeholder = 'Select...', className, disabled = false }, ref) => {
  const handleChange = (newValue: MultiValue<Option>) => {
    onChange?.(Array.from(newValue));
  };

  return (
    <div ref={ref} className={cn('w-full', className)}>
      <Select
        isMulti
        options={options}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        isDisabled={disabled}
        styles={customStyles}
        components={{
          DropdownIndicator,
          MultiValueRemove,
        }}
        classNamePrefix="react-select"
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="absolute"
        menuPlacement="auto"
      />
    </div>
  );
});

MultiSelect.displayName = 'MultiSelect'; 