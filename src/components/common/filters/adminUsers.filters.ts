import { FilterField } from '../FilterDropdown';
import { STATUS_OPTIONS } from './shared';

export const adminUserFilters: FilterField[] = [
  { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
];


