import { FilterField } from '../FilterDropdown';
import { CITIES_OPTIONS, COUNTRIES_OPTIONS } from './shared';

export const venueFilters: FilterField[] = [
  { key: 'city', label: 'City', type: 'multiselect', options: CITIES_OPTIONS },
  { key: 'country', label: 'Country', type: 'multiselect', options: COUNTRIES_OPTIONS },
  {
    key: 'isVisible', label: 'Visible', type: 'boolean', options: [
      { label: 'Visible', value: true },
      { label: 'Hidden', value: false },
    ]
  },
  // {
  //   key: 'isFeatured', label: 'Featured', type: 'boolean', options: [
  //     { label: 'Featured', value: true },
  //     { label: 'Not Featured', value: false },
  //   ]
  // },
  // {
  //   key: 'popularityScore', label: 'Popularity', type: 'sort', options: [
  //     { label: 'High to Low', value: 'desc' },
  //     { label: 'Low to High', value: 'asc' },
  //   ]
  // },
];

