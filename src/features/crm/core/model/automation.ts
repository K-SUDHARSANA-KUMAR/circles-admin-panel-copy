import type { AutomationId, ContactId, IsoDateTime, TemplateId } from './common';
import type { ConditionGroup } from './segment';

/** App events the CRM can trigger on. See docs/events.md. */
export const APP_TRIGGER_EVENTS = [
  'signup.dropped_off',
  'application.submitted',
  'application.waiting',
  'verified',
  'friend.first_added',
  'plan.first_created',
  'plan.first_completed_with_friends',
  'event.checked_in',
  'inactive',
] as const;
export type AppTriggerEvent = (typeof APP_TRIGGER_EVENTS)[number];

/** RevenueCat-driven events (plus the app-granted free period). */
export const SUBSCRIPTION_TRIGGER_EVENTS = ['free_period.started', 'subscribed', 'cancelled', 'billing_issue', 'expired'] as const;
export type SubscriptionTriggerEvent = (typeof SUBSCRIPTION_TRIGGER_EVENTS)[number];

export const DATE_FIELDS = ['freePeriodEndsAt', 'subscriptionExpiresAt', 'nextFollowUpAt', 'lastActiveAt'] as const;
export type DateField = (typeof DATE_FIELDS)[number];

export type Trigger =
  | { type: 'app_event'; event: AppTriggerEvent; days?: number }
  | { type: 'subscription_event'; event: SubscriptionTriggerEvent }
  | { type: 'date_field'; field: DateField; offsetDays: number; atTime?: string }
  | { type: 'segment_joined'; segmentId: string }
  | { type: 'pipeline_stage_changed'; pipelineId: string; stageId?: string }
  | { type: 'pipeline_no_reply'; pipelineId: string; days: number }
  | { type: 'inbound_email_category'; category: string }
  /** A weekly or monthly schedule, sending to a segment. */
  | { type: 'schedule'; every: 'week' | 'month'; weekday?: number; dayOfMonth?: number; time: string; segmentId?: string };

export type ActionType = 'send_email' | 'send_push' | 'create_task' | 'notify_owner' | 'change_stage' | 'add_tag' | 'create_draft';

export interface AutomationAction {
  type: ActionType;
  templateId?: TemplateId;
  /** For create_task and notify_owner. */
  text?: string;
  tag?: string;
  pipelineId?: string;
  stageId?: string;
  /** Only send if a slot frees before this many hours have passed; otherwise skip. */
  expiresAfterHours?: number;
}

export type AutomationStep =
  | { id: string; kind: 'wait'; days?: number; hours?: number; untilWeekday?: number; untilTime?: string }
  | { id: string; kind: 'action'; action: AutomationAction; onlyIf?: ConditionGroup };

export interface AutomationGoal {
  /** Plain-English, e.g. "Becomes a Member". */
  label: string;
  condition: ConditionGroup;
  withinDays: number;
}

export type AutomationCategory = 'onboarding' | 'conversion' | 'events' | 'retention' | 'partners' | 'service' | 'investors';

export interface AutomationStats {
  entered: number;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  blocked: number;
}

export interface Automation {
  id: AutomationId;
  name: string;
  description: string;
  category: AutomationCategory;
  enabled: boolean;
  trigger: Trigger;
  /** The "If": who it applies to, checked on entry and again before every action. */
  conditions: ConditionGroup;
  steps: AutomationStep[];
  goal?: AutomationGoal;
  /** Always stops on unsubscribe. These are extra exit conditions. */
  exitWhen: ConditionGroup;
  reEntry: { mode: 'once' } | { mode: 'every'; days: number };
  /** The monthly investor update: drafts only, can never be switched to send. */
  draftOnly: boolean;
  /**
   * When it was last switched on. Date and schedule triggers only fire for moments after this, so
   * switching an automation on never sends for occasions that have already passed.
   */
  enabledAt?: IsoDateTime;
  version: number;
  stats: AutomationStats;
  updatedAt: IsoDateTime;
  updatedBy: string;
}

export interface AutomationVersion {
  automationId: AutomationId;
  version: number;
  savedAt: IsoDateTime;
  savedBy: string;
  /** Plain-English summary of what changed. */
  change: string;
  snapshot: Omit<Automation, 'stats'>;
}

export type RunStatus = 'active' | 'waiting' | 'completed' | 'exited' | 'failed';

/** Runs for schedules with no audience ("just me", e.g. the investor update) use this contact id. */
export const OWNER_RUN = 'owner';

export type ExitReason =
  | 'switched_off'
  | 'contact_gone'
  | 'unsubscribed'
  | 'exit_condition'
  | 'no_longer_applies'
  | 'left_segment'
  | 'step_removed';

export const EXIT_REASON_LABELS: Record<ExitReason, string> = {
  switched_off: 'Stopped: the automation was switched off',
  contact_gone: 'Stopped: contact closed, merged or erased',
  unsubscribed: 'Stopped: they’ve said no to marketing emails',
  exit_condition: 'Stopped: met the “stop early” condition',
  no_longer_applies: 'Stopped: no longer matches who it’s for',
  left_segment: 'Stopped: no longer in the segment',
  step_removed: 'Stopped: the step they were on was removed',
};

/** One person going through one automation. */
export interface AutomationRun {
  /** Deterministic from automation + contact + occasion, so a repeated trigger can't start a second run. */
  id: string;
  automationId: AutomationId;
  automationVersion: number;
  contactId: ContactId;
  /** What started it (event id, date, segment join), used in idempotency keys. */
  occasion: string;
  /** Investor contacts, the investor update and "just me" runs: hidden from Team by the security rules. */
  ownerOnly: boolean;
  /** The trigger type that started it. */
  triggeredBy: Trigger['type'];
  /** For schedule triggers with an audience: checked again before every action. */
  segmentId?: string;
  /** For pipeline triggers. */
  pipelineItemId?: string;
  /** The step to run next, by id, so edits to the automation don't shift people onto the wrong step. */
  stepId?: string;
  stepIndex: number;
  /** When the current step became due. Used for "too late to send" and to chain waits without drift. */
  stepDueAt: IsoDateTime;
  /** Provider retries on the current step. */
  attempts: number;
  status: RunStatus;
  nextAt?: IsoDateTime;
  exitReason?: ExitReason;
  /** Lease so two scheduler workers never process the same run. */
  leaseUntil?: IsoDateTime;
  firstMessageAt?: IsoDateTime;
  /** Goal tracking continues after the last step until this time. */
  goalUntil?: IsoDateTime;
  converted?: boolean;
  history: { at: IsoDateTime; stepId: string; outcome: string }[];
  enteredAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** An email written for Gus to review and send himself (e.g. the investor update). */
export interface Draft {
  id: string;
  source: 'automation' | 'inbox_agent';
  automationId?: AutomationId;
  templateId?: TemplateId;
  contactId?: ContactId;
  /** Empty for the investor update: Gus picks the recipients. */
  to?: string;
  subject: string;
  text: string;
  status: 'open' | 'sent' | 'discarded';
  /** Production: the id of the Gmail draft this was saved as. */
  gmailDraftId?: string;
  ownerOnly: boolean;
  createdAt: IsoDateTime;
}
