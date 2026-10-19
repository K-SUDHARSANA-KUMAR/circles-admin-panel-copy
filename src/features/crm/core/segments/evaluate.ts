/**
 * Segment evaluation: does this contact match this filter right now?
 * Pure, so segments update live (re-evaluate one contact whenever its data changes) and
 * automations re-check their "If" before every action.
 */
import type { Contact } from '../model/contact';
import { isGroup, type Condition, type ConditionGroup } from '../model/segment';
import { FIELD_BY_ID, OPERATOR_LABELS } from './fields';

const DAY = 86_400_000;

const norm = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x).toLowerCase()) : v === undefined || v === null ? [] : [String(v).toLowerCase()]);
const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

export function evaluateCondition(contact: Contact, condition: Condition, now: Date): boolean {
  const field = FIELD_BY_ID.get(condition.field);
  if (!field) return false; // unknown field never matches (fail closed)
  const value = field.get(contact);
  const target = condition.value;
  switch (condition.op) {
    case 'is_set':
      return !isEmpty(value);
    case 'is_not_set':
      return isEmpty(value);
    case 'is_true':
      return value === true;
    case 'is_false':
      return value !== true;
    case 'is':
      return norm(value) === norm(target);
    case 'is_not':
      return norm(value) !== norm(target);
    case 'is_any_of':
      return asList(target).includes(String(norm(value)));
    case 'is_none_of':
      return !asList(target).includes(String(norm(value)));
    case 'contains':
      return typeof value === 'string' && typeof target === 'string' && value.toLowerCase().includes(target.toLowerCase());
    case 'not_contains':
      return !(typeof value === 'string' && typeof target === 'string' && value.toLowerCase().includes(target.toLowerCase()));
    case 'includes':
      return asList(value).includes(String(norm(target)));
    case 'excludes':
      return !asList(value).includes(String(norm(target)));
    case 'gt':
      return Number(value) > Number(target);
    case 'gte':
      return Number(value) >= Number(target);
    case 'lt':
      return Number(value) < Number(target);
    case 'lte':
      return Number(value) <= Number(target);
    case 'in_last_days': {
      if (typeof value !== 'string') return false;
      const t = Date.parse(value);
      return t <= now.getTime() && t >= now.getTime() - Number(target) * DAY;
    }
    case 'more_than_days_ago': {
      if (typeof value !== 'string') return false;
      return Date.parse(value) < now.getTime() - Number(target) * DAY;
    }
    case 'in_next_days': {
      if (typeof value !== 'string') return false;
      const t = Date.parse(value);
      return t >= now.getTime() && t <= now.getTime() + Number(target) * DAY;
    }
  }
}

export function evaluateGroup(contact: Contact, group: ConditionGroup, now: Date): boolean {
  if (group.conditions.length === 0) return true;
  const results = group.conditions.map((c) => (isGroup(c) ? evaluateGroup(contact, c, now) : evaluateCondition(contact, c, now)));
  return group.match === 'all' ? results.every(Boolean) : results.some(Boolean);
}

export function membersOf(contacts: readonly Contact[], filter: ConditionGroup, now: Date): Contact[] {
  return contacts.filter((c) => !c.mergedInto && evaluateGroup(c, filter, now));
}

function describeValue(condition: Condition): string {
  const field = FIELD_BY_ID.get(condition.field);
  const label = (v: unknown) => field?.options?.find((o) => o.value === v)?.label ?? String(v);
  const v = condition.value;
  if (Array.isArray(v)) return v.map(label).join(' or ');
  if (condition.op === 'in_last_days' || condition.op === 'in_next_days') return `${v} days`;
  if (condition.op === 'more_than_days_ago') return '';
  return v === undefined ? '' : label(v);
}

/** "Lifecycle stage is Guest", "Free months end in the next 7 days", "Interests includes tennis". */
export function describeCondition(condition: Condition): string {
  const field = FIELD_BY_ID.get(condition.field);
  const name = field?.label ?? condition.field;
  if (condition.op === 'more_than_days_ago') return `${name} more than ${condition.value} days ago`;
  const value = describeValue(condition);
  return [name, OPERATOR_LABELS[condition.op], value].filter(Boolean).join(' ');
}

export function describeGroup(group: ConditionGroup, depth = 0): string {
  if (group.conditions.length === 0) return 'everyone';
  const joiner = group.match === 'all' ? ' and ' : ' or ';
  const parts = group.conditions.map((c) => (isGroup(c) ? `(${describeGroup(c, depth + 1)})` : describeCondition(c)));
  const text = parts.join(joiner);
  return depth === 0 ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}
