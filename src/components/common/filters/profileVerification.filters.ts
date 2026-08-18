import { FilterField } from '../FilterDropdown';
import { MEDIUM_OPTIONS } from './shared';

export const profileVerificationFilters: FilterField[] = [
  {
    key: 'status', label: 'Status', type: 'select', options: [
      { label: 'Pending', value: 'pending' },
      { label: 'Verified', value: 'verified' },
      { label: 'Rejected', value: 'rejected' },
    ]
  },
  { key: 'country', label: 'Country', type: 'multiselect', options: [] },
  { key: 'city', label: 'City', type: 'multiselect', options: [] },
  { key: 'medium', label: 'Medium', type: 'select', options: MEDIUM_OPTIONS },
];
