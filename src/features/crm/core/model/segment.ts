import type { AdminId, IsoDateTime } from './common';

/** Operators, named the way they read in the builder ("trial ends" "in the next" "7" "days"). */
export const OPERATORS = [
  'is',
  'is_not',
  'is_any_of',
  'is_none_of',
  'contains',
  'not_contains',
  'includes', // list fields: interests includes "tennis"
  'excludes',
  'gt',
  'gte',
  'lt',
  'lte',
  'is_set',
  'is_not_set',
  'is_true',
  'is_false',
  'in_last_days',
  'more_than_days_ago',
  'in_next_days',
] as const;
export type Operator = (typeof OPERATORS)[number];

export interface Condition {
  /** A field id from the field catalogue, e.g. "lifecycle.stage", "signals.city". */
  field: string;
  op: Operator;
  value?: string | number | boolean | string[];
}

export interface ConditionGroup {
  match: 'all' | 'any';
  conditions: (Condition | ConditionGroup)[];
}

export function isGroup(x: Condition | ConditionGroup): x is ConditionGroup {
  return (x as ConditionGroup).match !== undefined;
}

export const EMPTY_FILTER: ConditionGroup = { match: 'all', conditions: [] };

export interface Segment {
  id: string;
  name: string;
  description?: string;
  filter: ConditionGroup;
  /** Shown on the Audience page and in the weekly brief. */
  pinned: boolean;
  /** Daily member counts, for "growing or slipping". */
  countHistory: { date: string; count: number }[];
  createdBy: AdminId | 'system';
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
