import { FilterField } from '../FilterDropdown';
import { CITIES_OPTIONS, MEDIUM_OPTIONS, COUNTRIES_OPTIONS } from './shared';

export const profileVerificationFilters: FilterField[] = [
  {
    key: 'status', label: 'Status', type: 'select', options: [
      { label: 'Pending', value: 'pending' },
      { label: 'Verified', value: 'verified' },
    ]
  },
  { key: 'country', label: 'Country', type: 'select', options: COUNTRIES_OPTIONS },
  { key: 'city', label: 'City', type: 'multiselect', options: CITIES_OPTIONS },
  { key: 'medium', label: 'Medium', type: 'select', options: MEDIUM_OPTIONS },
];



