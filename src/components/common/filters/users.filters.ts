import { FilterField } from '../FilterDropdown';
import { STATUS_OPTIONS, MEDIUM_OPTIONS } from './shared';

export const userFilters: FilterField[] = [
  { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
  { key: 'country', label: 'Country', type: 'multiselect', options: [] },
  { key: 'city', label: 'City', type: 'multiselect', options: [] },
  { key: 'medium', label: 'Medium', type: 'select', options: MEDIUM_OPTIONS },
];
