import { FilterField } from '../FilterDropdown';
import { CITIES_OPTIONS, STATUS_OPTIONS, MEDIUM_OPTIONS, COUNTRIES_OPTIONS } from './shared';

export const userFilters: FilterField[] = [
  { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
  { key: 'country', label: 'Country', type: 'select', options: COUNTRIES_OPTIONS },
  { key: 'city', label: 'City', type: 'multiselect', options: CITIES_OPTIONS },
  { key: 'medium', label: 'Medium', type: 'select', options: MEDIUM_OPTIONS },
];
