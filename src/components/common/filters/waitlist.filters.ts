import { FilterField } from '../FilterDropdown';
import { CITIES_OPTIONS, MEDIUM_OPTIONS, COUNTRIES_OPTIONS } from './shared';

export const waitlistFilters: FilterField[] = [
  {
    key: 'status', label: 'Status', type: 'select', options: [
      { label: 'Pending', value: 'pending' },
      { label: 'Approved', value: 'approved' },
    ]
  },
  { key: 'country', label: 'Country', type: 'multiselect', options: COUNTRIES_OPTIONS },
  { key: 'city', label: 'City', type: 'multiselect', options: CITIES_OPTIONS },
  { key: 'medium', label: 'Medium', type: 'select', options: MEDIUM_OPTIONS },
];

