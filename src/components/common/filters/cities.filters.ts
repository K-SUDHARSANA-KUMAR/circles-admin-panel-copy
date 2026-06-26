import { FilterField } from '../FilterDropdown';
import { COUNTRIES_OPTIONS, CITIES_OPTIONS } from './shared';

export const cityFilters: FilterField[] = [
  { key: 'city', label: 'City', type: 'multiselect', options: CITIES_OPTIONS },
  { key: 'country', label: 'Country', type: 'multiselect', options: COUNTRIES_OPTIONS },
  {
    key: 'status', label: 'Status', type: 'select', options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ]
  },
];


