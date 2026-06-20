import { FilterField } from './FilterDropdown';

// Mock options
const CITIES_OPTIONS = [
  { label: 'Mumbai', value: 'Mumbai' },
  { label: 'Bangalore', value: 'Bangalore' },
  { label: 'Delhi', value: 'Delhi' },
  { label: 'Chennai', value: 'Chennai' },
  { label: 'Hyderabad', value: 'Hyderabad' },
];

const COUNTRIES_OPTIONS = [
  { label: 'India', value: 'India' },
  { label: 'United Arab Emirates', value: 'United Arab Emirates' },
  { label: 'Saudi Arabia', value: 'Saudi Arabia' },
  { label: 'Singapore', value: 'Singapore' },
];

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

const MEDIUM_OPTIONS = [
  { label: 'Email', value: 'Email' },
  { label: 'Phone', value: 'Phone' },
  { label: 'Google', value: 'Google' },
  { label: 'Apple', value: 'Apple' },
];

// Configuration for each page
export const userFilters: FilterField[] = [
  { key: 'name', label: 'Name', type: 'text', placeholder: 'Search name...' },
  { key: 'city', label: 'City', type: 'multiselect', options: CITIES_OPTIONS },
  { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
  { key: 'medium', label: 'Medium', type: 'select', options: MEDIUM_OPTIONS },
  { key: 'score', label: 'Score', type: 'number' },
];

export const waitlistFilters: FilterField[] = [
  { key: 'name', label: 'Name', type: 'text', placeholder: 'Search name...' },
  { key: 'city', label: 'City', type: 'multiselect', options: CITIES_OPTIONS },
  { key: 'status', label: 'Status', type: 'select', options: [
    { label: 'Pending', value: 'pending' },
    { label: 'Rejected', value: 'rejected' },
  ] },
  { key: 'medium', label: 'Medium', type: 'select', options: MEDIUM_OPTIONS },
  { key: 'score', label: 'Score', type: 'number' },
];

export const profileVerificationFilters: FilterField[] = [
  { key: 'name', label: 'Name', type: 'text', placeholder: 'Search name...' },
  { key: 'city', label: 'City', type: 'multiselect', options: CITIES_OPTIONS },
  { key: 'status', label: 'Status', type: 'select', options: [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ] },
  { key: 'medium', label: 'Medium', type: 'select', options: MEDIUM_OPTIONS },
  { key: 'score', label: 'Score', type: 'number' },
];

export const adminUserFilters: FilterField[] = [
  { key: 'name', label: 'Name', type: 'text', placeholder: 'Search name...' },
  { key: 'email', label: 'Email', type: 'text', placeholder: 'Search email...' },
  { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
  { key: 'role', label: 'Role', type: 'select', options: [
    { label: 'Super Admin', value: 'Super Admin' },
    { label: 'Admin', value: 'Admin' },
    { label: 'Manager', value: 'Manager' },
    { label: 'Editor', value: 'Editor' },
  ] },
];

export const cityFilters: FilterField[] = [
  { key: 'name', label: 'City Name', type: 'text', placeholder: 'Search city...' },
  { key: 'country', label: 'Country', type: 'select', options: COUNTRIES_OPTIONS },
  { key: 'status', label: 'Status', type: 'select', options: [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Waitlist', value: 'waitlist' },
  ] },
];

export const countryFilters: FilterField[] = [
  { key: 'name', label: 'Country Name', type: 'text', placeholder: 'Search country...' },
  { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
];

export const venueFilters: FilterField[] = [
  { key: 'name', label: 'Name', type: 'text', placeholder: 'Search venue name...' },
  { key: 'city', label: 'City', type: 'select', options: CITIES_OPTIONS },
  { key: 'country', label: 'Country', type: 'select', options: COUNTRIES_OPTIONS },
  { key: 'isVisible', label: 'isVisible', type: 'boolean', options: [
    { label: 'Visible', value: true },
    { label: 'Hidden', value: false },
  ] },
  { key: 'isFeatured', label: 'isFeatured', type: 'boolean', options: [
    { label: 'Featured', value: true },
    { label: 'Not Featured', value: false },
  ] },
  { key: 'popularityScore', label: 'popularityScore', type: 'sort', options: [
    { label: 'High to Low', value: 'desc' },
    { label: 'Low to High', value: 'asc' },
  ] },
];

export const interestFilters: FilterField[] = [
  { key: 'name', label: 'Group Name', type: 'text', placeholder: 'Search group name...' },
  { key: 'color', label: 'Color', type: 'select', options: [
    { label: 'Blue', value: 'blue' },
    { label: 'Emerald', value: 'emerald' },
    { label: 'Violet', value: 'violet' },
    { label: 'Warning', value: 'warning' },
    { label: 'Success', value: 'success' },
    { label: 'Destructive', value: 'destructive' },
  ] },
  { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
];
