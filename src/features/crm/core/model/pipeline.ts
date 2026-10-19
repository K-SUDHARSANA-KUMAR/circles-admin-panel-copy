import type { AdminId, ContactId, IsoDateTime, OrganisationId, TemplateId } from './common';

export interface PipelineStage {
  id: string;
  /** Renamable in the UI. */
  name: string;
  order: number;
  /** Closing stages: items here drop off the Overdue list and stop follow-ups. */
  outcome?: 'won' | 'lost';
}

/**
 * Per-pipeline follow-up rule: if there's no reply after N days, create a task (default) or send a
 * follow-up from a template (only if Gus has switched that on). Stops as soon as they reply.
 */
export interface FollowUpRule {
  enabled: boolean;
  noReplyDays: number;
  action: 'create_task' | 'send_template';
  /** Must be explicitly switched on by the Owner before any follow-up is sent automatically. */
  autoSendApproved: boolean;
  templateId?: TemplateId;
  /** Stop after this many automatic follow-ups. */
  maxFollowUps: number;
}

export const DEFAULT_PIPELINE_IDS = ['partnerships', 'investors', 'press', 'creators'] as const;

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  stages: PipelineStage[];
  followUp: FollowUpRule;
  /** The investor pipeline: Owner only. */
  ownerOnly: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PipelineItem {
  id: string;
  pipelineId: string;
  stageId: string;
  title: string;
  contactId?: ContactId;
  orgId?: OrganisationId;
  ownerId?: AdminId;
  /** Optional value in pounds (e.g. a sponsorship, an investment). */
  valueGbp?: number;
  nextFollowUpAt?: IsoDateTime;
  lastOutboundAt?: IsoDateTime;
  lastReplyAt?: IsoDateTime;
  /** Automatic follow-ups sent since the last reply. */
  followUpsSent: number;
  ownerOnly: boolean;
  stageChangedAt: IsoDateTime;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type TaskSource = 'manual' | 'automation' | 'follow_up_rule' | 'inbox_agent' | 'brief';

export interface Task {
  id: string;
  title: string;
  dueAt?: IsoDateTime;
  assigneeId?: AdminId;
  contactId?: ContactId;
  orgId?: OrganisationId;
  pipelineItemId?: string;
  source: TaskSource;
  status: 'open' | 'done';
  snoozedUntil?: IsoDateTime;
  completedAt?: IsoDateTime;
  /** e.g. a Gmail draft waiting for review. */
  link?: { kind: 'gmail_draft' | 'gmail_message' | 'send'; id: string };
  createdBy: string;
  createdAt: IsoDateTime;
  ownerOnly: boolean;
}
