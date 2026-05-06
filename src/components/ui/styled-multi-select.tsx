import Select, { StylesConfig, components } from "react-select";
import { useState } from 'react';

const customStyles: StylesConfig = {
  control: (baseStyles, state) => ({
    ...baseStyles,
    borderColor: state.isFocused
      ? 'var(--color-freshleaf)'
      : 'var(--color-input)',
    boxShadow: state.isFocused ? '0 0 0 1px var(--color-freshleaf)' : 'none',
    '&:hover': {
      borderColor: 'var(--color-freshleaf)',
    },
    fontSize: '0.900rem',
    fontWeight: '400',
    borderRadius: '0.6rem',
    minHeight: '40px',
    padding: '2px 8px',
  }),
  valueContainer: (baseStyles) => ({
    ...baseStyles,
    gap: '6px',
    padding: '2px 0',
    flexWrap: 'wrap',
  }),
  multiValue: (baseStyles) => ({
    ...baseStyles,
    backgroundColor: '#E8F5E8',
    border: '1px solid #D1E7DD',
    borderRadius: '16px',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#0F5132',
    margin: '2px',
    minHeight: '28px',
    display: 'flex',
    alignItems: 'center',
  }),
  multiValueLabel: (baseStyles) => ({
    ...baseStyles,
    padding: '4px 8px',
    color: '#0F5132',
    fontSize: '0.875rem',
    fontWeight: '500',
  }),
  multiValueRemove: (baseStyles) => ({
    ...baseStyles,
    color: '#6B7280',
    borderRadius: '0 16px 16px 0',
    padding: '4px 6px',
    '&:hover': {
      backgroundColor: '#DC2626',
      color: 'white',
    },
  }),
  option: (baseStyles, state) => ({
    ...baseStyles,
    backgroundColor: state.isSelected
      ? 'var(--color-freshleaf)'
      : state.isFocused
        ? 'oklch(91% 0 0)'
        : 'white',

    color: state.isSelected ? 'white' : 'black',
    borderRadius: '0.3rem',
    fontSize: '0.900rem',
    fontWeight: '400',
  }),
  menuList: (baseStyles) => ({
    ...baseStyles,
    fontSize: '0.900rem',
    '::-webkit-scrollbar': {
      width: '4px',
      height: '0px',
    },
    '::-webkit-scrollbar-track': {
      background: '#f1f1f1',
    },
    '::-webkit-scrollbar-thumb': {
      background: '#888',
    },
    '::-webkit-scrollbar-thumb:hover': {
      background: '#00a551',
    },
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--freshleaf) #f1f1f1',
    padding: '0.5rem',
    fontWeight: '400',
  }),
  placeholder: (baseStyles) => ({
    ...baseStyles,
    color: '#9CA3AF',
    fontSize: '0.900rem',
  }),
};

const MoreSelectedBadge = ({
  items,
  onClick,
}: {
  items: string[];
  onClick: () => void;
}) => {
  const style = {
    marginLeft: 'auto',
    background: '#F3F4F6',
    border: '1px solid #D1D5DB',
    borderRadius: '16px',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    padding: '4px 8px',
    order: 99,
    color: '#374151',
    fontWeight: '500',
    cursor: 'default' as const,
    minHeight: '28px',
    display: 'flex',
    alignItems: 'center',
    margin: '2px',
  };

  const title = items.join(', ');
  const length = items.length;
  const label = `+${length} more`;

  return (
    <div
      style={style}
      title={title}
      onClick={onClick}
    >
      {label}
    </div>
  );
};

const MultiValue = ({
  index,
  getValue,
  maxToShow = 3,
  showAllSelected,
  onBadgeClick,
  ...props
}: any) => {
  const overflow = getValue()
    .slice(maxToShow)
    .map((x: any) => x.label);

  if (showAllSelected) {
    // Show all items and add a "Show Less" button at the end
    if (index === getValue().length - 1 && getValue().length > maxToShow) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <components.MultiValue {...props} />
          <button
            onClick={onBadgeClick}
            style={{
              background: '#F3F4F6',
              border: '1px solid #D1D5DB',
              borderRadius: '16px',
              padding: '4px 8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#6B7280',
              cursor: 'pointer',
              marginLeft: '4px'
            }}
          >
            Show Less
          </button>
        </div>
      );
    }
    return <components.MultiValue {...props} />;
  }

  return index < maxToShow ? (
    <components.MultiValue {...props} />
  ) : index === maxToShow ? (
    <MoreSelectedBadge
      items={overflow}
      onClick={onBadgeClick}
    />
  ) : null;
};

const CustomOption = (props: any) => {
  const { data, selectProps } = props;
  
  if (data.value === '__select_all__') {
    const allOptions = selectProps.options.filter((opt: any) => opt.value !== '__select_all__');
    const selectedValues = selectProps.value || [];
    const isAllSelected = allOptions.length > 0 && selectedValues.length === allOptions.length;
    
    return (
      <components.Option {...props}>
        <div style={{ display: 'flex', alignItems: 'center', fontWeight: '600' }}>
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={() => {}}
            style={{ marginRight: '8px', accentColor: 'var(--color-freshleaf)' }}
          />
          Select All
        </div>
      </components.Option>
    );
  }
  
  return <components.Option {...props} />;
};

export const StyledMultiSelect = ({
  hideSelectedOptions = true,
  maxToShow = 3,
  isLoading,
  showSelectAll = true,
  options = [],
  onChange,
  value,
  ...props
}: any) => {
  const [showAllSelected, setShowAllSelected] = useState(false);

  // Add click handler for the badge
  const handleBadgeClick = () => {
    setShowAllSelected(!showAllSelected);
  };

  const enhancedOptions = showSelectAll 
    ? [{ value: '__select_all__', label: 'Select All' }, ...options]
    : options;

  const handleSelectChange = (selectedOptions: any) => {
    if (!selectedOptions) {
      onChange([]);
      return;
    }

    const selectedArray = Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions];
    const selectAllOption = selectedArray.find((opt: any) => opt.value === '__select_all__');
    
    if (selectAllOption) {
      const currentlySelected = value || [];
      const allRegularOptions = options.filter((opt: any) => opt.value !== '__select_all__');
      
      if (currentlySelected.length === allRegularOptions.length) {
        onChange([]);
      } else {
        onChange(allRegularOptions);
      }
    } else {
      const filteredOptions = selectedArray.filter((opt: any) => opt.value !== '__select_all__');
      onChange(filteredOptions);
    }
  };

  const customComponents = {
    MultiValue: (multiValueProps: any) => (
      <MultiValue
        {...multiValueProps}
        maxToShow={maxToShow}
        showAllSelected={showAllSelected}
        onBadgeClick={handleBadgeClick}
      />
    ),
    Option: CustomOption,
    ...props.components,
  };

  return (
    <div>
      <Select
        {...props}
        options={enhancedOptions}
        value={value}
        onChange={handleSelectChange}
        isLoading={isLoading}
        styles={customStyles}
        closeMenuOnSelect={false}
        hideSelectedOptions={hideSelectedOptions}
        className="basic-single text-base"
        classNamePrefix="select"
        components={customComponents}
        isMulti
      />
    </div>
  );
};
