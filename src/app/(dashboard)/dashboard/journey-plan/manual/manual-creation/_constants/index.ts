export const PJP_TYPE_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-monthly', label: 'Bi-Monthly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

export const FORM_VALIDATION_MESSAGES = {
  USER_REQUIRED: 'Please select a user',
  PJP_TYPE_REQUIRED: 'Please select PJP Type',
  DATE_RANGE_REQUIRED: 'Please select start and end dates',
  OUTLETS_REQUIRED: 'Please select at least one outlet for the journey plan',
  INCOMPLETE_ROWS: 'Please assign outlets to all dates or delete the dates without outlets',
} as const;

export const SUCCESS_MESSAGES = {
  CREATED: 'Manual route plan created successfully',
  UPDATED: 'Manual route plan updated successfully',
} as const;
