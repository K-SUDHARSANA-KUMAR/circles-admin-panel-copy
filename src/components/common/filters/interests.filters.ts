import { FilterField } from '../FilterDropdown';
import { COUNTRIES_OPTIONS } from './shared';

export const interestFilters: FilterField[] = [
  { key: 'country', label: 'Country', type: 'select', options: COUNTRIES_OPTIONS },
  { key: 'group', label: 'Group', type: 'select', options: [
    { label: 'Sports & Outdoors', value: 'sports' },
    { label: 'Music & Beats', value: 'music' },
    { label: 'Tech & Coding', value: 'tech' },
    { label: 'Food & Cooking', value: 'food' },
    { label: 'Arts & Crafts', value: 'arts' },
  ] },
  { key: 'interest', label: 'Interest', type: 'select', options: [
    { label: 'Football', value: 'football' },
    { label: 'Jazz Music', value: 'jazz' },
    { label: 'Web Development', value: 'webdev' },
    { label: 'Sushi Making', value: 'sushi' },
    { label: 'Photography', value: 'photography' },
  ] },
];
