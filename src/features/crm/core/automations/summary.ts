/**
 * The one-line plain-English summary at the top of every automation, e.g.
 *   "When someone is verified, wait 1 day, then send “Welcome” if they’ve agreed to marketing emails."
 * Generated from the settings (never by AI), so it is always exactly what will happen.
 */
import type { Automation, AutomationAction, AutomationStep, Trigger } from '../model/automation';
import { PURPOSE_LABELS, type Purpose } from '../model/consent';
import { isGroup, type Condition, type ConditionGroup } from '../model/segment';
import { describeGroup } from '../segments/evaluate';

export interface SummaryContext {
  templateName(id: string): string | undefined;
  templatePurpose?(id: string): { messageClass: string; purpose?: Purpose } | undefined;
  segmentName(id: string): string | undefined;
  pipelineName(id: string): string | undefined;
  stageName?(pipelineId: string, stageId: string): string | undefined;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

const DATE_FIELD_LABELS: Record<string, string> = {
  freePeriodEndsAt: 'their free months end',
  subscriptionExpiresAt: 'their membership renews',
  nextFollowUpAt: 'their follow-up date',
  lastActiveAt: 'they last used the app',
};

export function describeTrigger(t: Trigger, ctx: SummaryContext): string {
  switch (t.type) {
    case 'app_event':
      return {
        'signup.dropped_off': 'When someone stops part-way through signing up',
        'application.submitted': 'When someone applies',
        'application.waiting': 'When an application is still waiting',
        verified: 'When someone is verified',
        'friend.first_added': 'When someone adds their first friend',
        'plan.first_created': 'When someone makes their first plan',
        'plan.first_completed_with_friends': 'When someone completes their first plan with friends',
        'event.checked_in': 'When someone checks in at an event',
        inactive: `When someone hasn’t used the app for ${days(t.days ?? 21)}`,
      }[t.event];
    case 'subscription_event':
      return {
        'free_period.started': 'When someone’s free months start',
        subscribed: 'When someone becomes a paying Member',
        cancelled: 'When a Member cancels',
        billing_issue: 'When a payment fails',
        expired: 'When a membership expires',
      }[t.event];
    case 'date_field': {
      const what = DATE_FIELD_LABELS[t.field] ?? t.field;
      const when = t.offsetDays < 0 ? `${days(-t.offsetDays)} before ${what}` : t.offsetDays > 0 ? `${days(t.offsetDays)} after ${what}` : `On the day ${what}`;
      return `${when.charAt(0).toUpperCase()}${when.slice(1)}${t.atTime ? `, at ${t.atTime}` : ''}`;
    }
    case 'segment_joined':
      return `When someone joins “${ctx.segmentName(t.segmentId) ?? 'a segment'}”`;
    case 'pipeline_stage_changed':
      return `When a card in ${ctx.pipelineName(t.pipelineId) ?? 'a pipeline'} moves${t.stageId ? ` to ${ctx.stageName?.(t.pipelineId, t.stageId) ?? t.stageId}` : ''}`;
    case 'pipeline_no_reply':
      return `When someone in ${ctx.pipelineName(t.pipelineId) ?? 'a pipeline'} hasn’t replied for ${days(t.days)}`;
    case 'inbound_email_category':
      return `When an email comes in marked “${t.category.replace(/_/g, ' ')}”`;
    case 'schedule':
      if (t.every === 'week') return `Every ${WEEKDAYS[t.weekday ?? 1]} at ${t.time}${t.segmentId ? `, for “${ctx.segmentName(t.segmentId) ?? 'a segment'}”` : ''}`;
      return `On the ${ordinal(t.dayOfMonth ?? 1)} of each month at ${t.time}${t.segmentId ? `, for “${ctx.segmentName(t.segmentId) ?? 'a segment'}”` : ''}`;
  }
}

const STAGE_WORDS: Record<string, string> = {
  Prospect: 'a Prospect',
  Applicant: 'an Applicant',
  Verified: 'verified',
  Trial: 'on their free months',
  Member: 'a Member',
  Guest: 'a Guest',
  AtRisk: 'at risk',
  Lapsed: 'lapsed',
};

/** Friendly wording for one condition, or undefined to fall back to the generic description. */
function friendly(c: Condition, mode: 'still' | 'exit' | 'who'): string | undefined {
  const v = c.value;
  if (c.field.startsWith('consent.email.')) {
    const purpose = c.field.split('.')[2] as Purpose;
    const label = PURPOSE_LABELS[purpose]?.toLowerCase() ?? purpose;
    if (c.op === 'is' && v === 'granted') return `they’ve agreed to ${label}`;
    if (c.op === 'is_not' && v === 'granted') return `they haven’t agreed to ${label}`;
  }
  if (c.field === 'lifecycle.stage') {
    if (c.op === 'is') return mode === 'who' ? `are ${STAGE_WORDS[String(v)] ?? v}` : `they’re still ${STAGE_WORDS[String(v)] ?? v}`;
    if (c.op === 'is_not') return `they’re no longer ${STAGE_WORDS[String(v)] ?? v}`;
    if (c.op === 'is_any_of' && Array.isArray(v)) return `${mode === 'who' ? 'are' : 'they’re'} ${v.map((x) => STAGE_WORDS[x] ?? x).join(' or ')}`;
  }
  if (c.field === 'signals.friendsCount') {
    if (c.op === 'lt' && v === 1) return 'they still haven’t added a friend';
    if (c.op === 'gte' && v === 1) return 'they add a friend';
  }
  if (c.field === 'signals.plansCount') {
    if (c.op === 'lt' && v === 1) return 'they still haven’t made a plan';
    if (c.op === 'gte' && v === 1) return 'they make a plan';
  }
  if (c.field === 'signals.lastActiveAt') {
    if (c.op === 'more_than_days_ago') return 'they still haven’t opened the app';
    if (c.op === 'in_last_days') return 'they use the app again';
  }
  if (c.field === 'signals.subscription.status' && c.op === 'is_any_of' && Array.isArray(v) && v.includes('active')) return 'they become a paying Member';
  if (c.field === 'signals.invitedJoined' && c.op === 'gte') return 'someone they invited joins';
  return undefined;
}

function describeWith(group: ConditionGroup, mode: 'still' | 'exit' | 'who'): string {
  const parts = group.conditions.map((c) => (isGroup(c) ? undefined : friendly(c, mode)));
  if (parts.every((p) => p !== undefined)) return parts.join(group.match === 'all' ? ' and ' : ' or ');
  const generic = describeGroup(group);
  return mode === 'who' ? `match: ${generic}` : generic;
}

/** "if they still haven’t added a friend", "if they’ve agreed to marketing emails". */
export function describeOnlyIf(group: ConditionGroup): string {
  return describeWith(group, 'still');
}

function describeAction(a: AutomationAction, ctx: SummaryContext): string {
  const name = a.templateId ? `“${ctx.templateName(a.templateId) ?? a.templateId}”` : '';
  switch (a.type) {
    case 'send_email':
      return `send ${name}`;
    case 'send_push':
      return `send the ${name} notification`;
    case 'create_task':
      return 'create a task for you';
    case 'notify_owner':
      return 'notify you';
    case 'change_stage':
      return `move them to ${a.stageId && a.pipelineId ? (ctx.stageName?.(a.pipelineId, a.stageId) ?? a.stageId) : 'the next stage'}`;
    case 'add_tag':
      return `tag them “${a.tag ?? ''}”`;
    case 'create_draft':
      return `draft ${name} for you to edit (it never sends itself)`;
  }
}

function consentNote(a: AutomationAction, ctx: SummaryContext, onlyIf: ConditionGroup | undefined): string {
  if (a.type !== 'send_email' && a.type !== 'send_push') return '';
  if (onlyIf?.conditions.some((c) => !isGroup(c) && c.field.startsWith('consent.'))) return '';
  const t = a.templateId ? ctx.templatePurpose?.(a.templateId) : undefined;
  if (!t || t.messageClass !== 'marketing') return '';
  if (a.type === 'send_push') return ' if notifications are on';
  return ` if they’ve agreed to ${t.purpose ? PURPOSE_LABELS[t.purpose].toLowerCase() : 'marketing'}`;
}

function describeStep(s: AutomationStep, ctx: SummaryContext): string {
  if (s.kind === 'wait') {
    if (s.untilWeekday !== undefined) return `wait until ${WEEKDAYS[s.untilWeekday]}${s.untilTime ? ` at ${s.untilTime}` : ''}`;
    if (s.days && s.untilTime) return `wait until ${s.untilTime} ${s.days === 1 ? 'the next day' : `${days(s.days)} later`}`;
    if (s.days) return `wait ${days(s.days)}`;
    if (s.hours) return `wait ${s.hours} hour${s.hours === 1 ? '' : 's'}`;
    return 'wait';
  }
  const conditional = s.onlyIf && s.onlyIf.conditions.length > 0 ? ` if ${describeOnlyIf(s.onlyIf)}` : '';
  return `${describeAction(s.action, ctx)}${conditional || consentNote(s.action, ctx, s.onlyIf)}`;
}

export function summariseAutomation(a: Automation, ctx: SummaryContext): string {
  const trigger = describeTrigger(a.trigger, ctx);
  const who = a.conditions.conditions.length > 0 ? `, for people who ${describeWith(a.conditions, 'who')}` : '';
  let body = '';
  a.steps.forEach((step, i) => {
    const text = describeStep(step, ctx);
    if (i === 0) body = text;
    else if (step.kind === 'wait' || a.steps[i - 1]?.kind === 'wait') body += `, then ${text}`;
    else body += `, and ${text}`;
  });
  const exit = a.exitWhen.conditions.length > 0 ? ` Stops as soon as ${describeWith(a.exitWhen, 'exit')}.` : '';
  const draftOnly = a.draftOnly && !body.includes('never sends') ? ' It never sends anything itself.' : '';
  return `${trigger}${who}, ${body}.${exit}${draftOnly}`;
}
