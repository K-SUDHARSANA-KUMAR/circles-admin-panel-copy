import { FilterField } from '../FilterDropdown';
import { STATUS_OPTIONS } from './shared';

export const countryFilters: FilterField[] = [
  { key: 'name', label: 'Country Name', type: 'text', placeholder: 'Enter country name...' },
  { key: 'code', label: 'Country Code', type: 'text', placeholder: 'Enter country code...' },
  { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
];

