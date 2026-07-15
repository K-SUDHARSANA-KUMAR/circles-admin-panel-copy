import { FilterField } from '../FilterDropdown';

export const cityFilters: FilterField[] = [
  { key: 'city', label: 'City', type: 'multiselect', options: [] },
  { key: 'country', label: 'Country', type: 'multiselect', options: [] },
  {
    key: 'status', label: 'Status', type: 'select', options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ]
  },
];
