import type { ContactId, IsoDateTime } from './common';

export const INBOX_CATEGORIES = ['urgent', 'needs_me', 'routine', 'fyi', 'noise'] as const;
export type InboxCategory = (typeof INBOX_CATEGORIES)[number];

export const INBOX_CATEGORY_LABELS: Record<InboxCategory, string> = {
  urgent: 'Urgent',
  needs_me: 'Needs me',
  routine: 'Routine',
  fyi: 'FYI',
  noise: 'Noise',
};

/** Routine sub-categories. Each can be set to "draft" (default) or "auto" by the Owner. */
export const ROUTINE_TOPICS = [
  { id: 'membership_question', label: 'Membership questions' },
  { id: 'how_to', label: 'How-tos' },
  { id: 'event_details', label: 'Event details' },
  { id: 'applicant_status', label: 'Application status' },
] as const;
export type RoutineTopic = (typeof ROUTINE_TOPICS)[number]['id'];

/** One inbound Gmail message the agent has seen. The body stays in Gmail. */
export interface InboxMessage {
  /** Gmail message id. */
  id: string;
  threadId: string;
  from: { name: string; email: string };
  contactId?: ContactId;
  subject: string;
  receivedAt: IsoDateTime;
  category: InboxCategory;
  routineTopic?: RoutineTopic;
  confidence: number;
  /** One line. */
  summary: string;
  suggestedNextStep?: string;
  deadline?: IsoDateTime;
  /** Which rule fired, and/or the classifier's reason. */
  reasons: string[];
  /** Instruction-like or manipulative content spotted. Never auto-replied to. */
  suspicious: boolean;
  suspiciousSignals: string[];
  /** queued: arrived while the agent was off; handled when it's switched back on. */
  status: 'queued' | 'handled' | 'waiting_for_you' | 'done';
  /** The CRM draft record (production: also a Gmail draft). */
  draftId?: string;
  /** An approved answer was sent automatically. */
  autoReplied?: boolean;
  /** Why it wasn't auto-replied, when the topic is set to auto. */
  autoReplyBlockedBecause?: string;
  /** The draft mentions someone other than the sender: flagged for Gus. */
  draftFlagged?: string[];
  taskId?: string;
  alertId?: string;
  labels: string[];
}

export const AGENT_ACTION_KINDS = [
  'classify',
  'label',
  'draft_reply',
  'send_template_reply',
  'create_task',
  'create_contact',
  'add_note',
  'set_follow_up',
  'notify_owner',
  'blocked',
] as const;
export type AgentActionKind = (typeof AGENT_ACTION_KINDS)[number];

/** Everything the agent did, with its reasoning, and undo where possible. */
export interface AgentAction {
  id: string;
  messageId: string;
  kind: AgentActionKind;
  /** Plain-English, e.g. 'Saved a draft reply in Gmail'. */
  description: string;
  reasoning: string;
  at: IsoDateTime;
  undoable: boolean;
  /** What it changed, so undo can reverse exactly that. */
  target?: { kind: 'label' | 'draft' | 'task' | 'timeline' | 'contact' | 'follow_up' | 'reply' | 'sms' | 'alert'; id: string; before?: string };
  undoneAt?: IsoDateTime;
  undoneBy?: string;
  /** For blocked: what was attempted and why it was refused. */
  refusedBecause?: string;
}

export type AlertKind = 'urgent_email' | 'billing_issue' | 'at_risk' | 'automation' | 'system';

export interface Alert {
  id: string;
  kind: AlertKind;
  title: string;
  body: string;
  contactId?: ContactId;
  messageId?: string;
  createdAt: IsoDateTime;
  smsSentAt?: IsoDateTime;
  acknowledgedAt?: IsoDateTime;
}

/** "Anything from @birley.com is urgent", stored after Gus confirms how it was understood. */
export interface InboxRule {
  id: string;
  /** What Gus typed. */
  text: string;
  /** How it was understood, shown back for confirmation. */
  understood: string;
  match:
    | { kind: 'from_domain'; domain: string }
    | { kind: 'from_email'; email: string }
    | { kind: 'organisation'; orgId: string }
    | { kind: 'pipeline'; pipelineId: string }
    | { kind: 'keywords'; any: string[] };
  category: 'urgent' | 'needs_me' | 'fyi' | 'noise';
  enabled: boolean;
  createdAt: IsoDateTime;
}

export interface InboxSettings {
  rules: InboxRule[];
  routineModes: Record<RoutineTopic, 'draft' | 'auto'>;
  /** Auto-send only above this confidence (0–1). */
  confidenceThreshold: number;
  /** Treat any deadline within this many hours as urgent. */
  deadlineHours: number;
  dailyDigestTime: string;
  alertPhone?: string;
  /** Optional quiet window for urgent texts to Gus. Off by default. */
  alertQuietHours?: { start: string; end: string };
}

/**
 * Everything that comes in from Gmail, before the agent touches it. All of it is untrusted: it's
 * whatever the sender chose to write.
 */
export interface InboundEmail {
  id: string;
  threadId: string;
  from: { name: string; email: string };
  replyTo?: string;
  to: string[];
  cc: string[];
  subject: string;
  receivedAt: IsoDateTime;
  /** Plain-text part (or text extracted from the HTML). */
  text: string;
  html?: string;
  headers: { messageId?: string; autoSubmitted?: string; precedence?: string; listUnsubscribe?: boolean };
}

/** What the classifier must return. Anything else is treated as "Needs me". */
export interface Classification {
  category: InboxCategory;
  routineTopic?: RoutineTopic;
  confidence: number;
  summary: string;
  suggestedNextStep?: string;
  /** YYYY-MM-DD or ISO date-time. */
  deadline?: string;
  /** A task for Gus, if the email asks for something concrete. */
  task?: string;
  /** A date to follow up with the sender, YYYY-MM-DD. */
  followUpDate?: string;
  reason: string;
  /** The model's own view that the email tries to instruct it. */
  instructionsDetected: boolean;
}

/** Models and prompts, editable by the Owner in Settings → AI. */
export interface AiSettings {
  /** Off = the agent still labels using rules only, and the brief uses the plain template. */
  enabled: boolean;
  classifyModel: string;
  draftModel: string;
  prompts: { classify: string; draft: string; brief: string; rule: string };
  /** Bumped on every prompt edit, recorded with each AI action. */
  promptVersion: number;
  /** Gus's voice, for drafts: a few lines on how he writes. */
  voice: string;
}
