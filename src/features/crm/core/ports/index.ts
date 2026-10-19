/**
 * Ports: the only ways the core logic talks to the outside world.
 *
 * Firebase, Resend, FCM, Twilio, Gmail and Claude each get an adapter that implements these
 * (see firebase/functions/src/adapters). The prototype and tests use the in-memory versions
 * in core/mocks. Moving off Firebase means writing new adapters, not changing the rules.
 */
import type { AppUserId, ContactId, IsoDateTime } from '../model/common';
import type { AuditEntry, TimelineEntry } from '../model/audit';
import type { ConsentRecord } from '../model/consent';
import type { Contact } from '../model/contact';
import type { AppProfile, ImportRecord, LumaEvent, MatchQueueItem, Registration, SubscriptionInfo } from '../model/events';
import type { Pipeline, PipelineItem, Task } from '../model/pipeline';
import type { Segment } from '../model/segment';
import type { Template, TemplateVersion } from '../model/template';
import type { Automation, AutomationRun, AutomationStats, AutomationVersion, Draft } from '../model/automation';
import type { AgentAction, AiSettings, Alert, InboundEmail, InboxMessage, InboxSettings } from '../model/inbox';
import type { DailyDigest, WeeklyBrief } from '../model/brief';
import type { Problem } from '../model/problem';
import type { AnswerTemplate } from '../model/template';
import type { Channel, SendRecord } from '../model/message';
import type { Organisation } from '../model/organisation';
import type { KillSwitches, SendingSettings } from '../model/settings';
import type { SuppressionEntry } from '../model/suppression';

export interface Clock {
  now(): Date;
}

/** Keyed one-way hash (HMAC-SHA-256 with a server-side secret). Used for suppression entries. */
export interface Hasher {
  hash(value: string): Promise<string>;
}

/** HMAC signing for unsubscribe links and other tokens. */
export interface Signer {
  sign(payload: string): Promise<string>;
  verify(payload: string, signature: string): Promise<boolean>;
}

export interface IdGenerator {
  next(prefix: string): string;
}

export interface ContactStore {
  get(id: ContactId): Promise<Contact | undefined>;
  save(contact: Contact): Promise<void>;
  delete(id: ContactId): Promise<void>;
  findByEmail(normalisedEmail: string): Promise<Contact[]>;
  findByPhone(e164: string): Promise<Contact[]>;
  findByAppUserId(appUserId: AppUserId): Promise<Contact | undefined>;
  /** Every contact. Fine at the CRM's scale (thousands); used by import, de-dupe and the nightly sweep. */
  list(): Promise<Contact[]>;
}

export interface OrganisationStore {
  get(id: string): Promise<Organisation | undefined>;
  save(org: Organisation): Promise<void>;
  list(): Promise<Organisation[]>;
}

/** Records which incoming events (and scheduled runs) have been processed, so repeats are ignored. */
export interface ProcessedEventStore {
  /** Returns true the first time an id is claimed, false ever after. Must be atomic. */
  claim(id: string, at: IsoDateTime): Promise<boolean>;
}

export interface RegistrationStore {
  get(id: string): Promise<Registration | undefined>;
  findByGuestId(lumaGuestId: string): Promise<Registration | undefined>;
  save(r: Registration): Promise<void>;
  listForContact(contactId: ContactId): Promise<Registration[]>;
  listForEvent(lumaEventId: string): Promise<Registration[]>;
  deleteForContact(contactId: ContactId): Promise<void>;
}

export interface LumaEventStore {
  get(id: string): Promise<LumaEvent | undefined>;
  save(e: LumaEvent): Promise<void>;
  /** Events starting at or after `from`, soonest first. */
  upcoming(from: IsoDateTime, limit: number): Promise<LumaEvent[]>;
}

export interface AutomationStore {
  list(): Promise<Automation[]>;
  get(id: string): Promise<Automation | undefined>;
  save(a: Automation): Promise<void>;
  addVersion(v: AutomationVersion): Promise<void>;
  listVersions(automationId: string): Promise<AutomationVersion[]>;
  /** Adds to the counters atomically (Firestore: FieldValue.increment). */
  bumpStats(id: string, delta: Partial<AutomationStats>): Promise<void>;
}

export interface AutomationRunStore {
  get(id: string): Promise<AutomationRun | undefined>;
  /** Creates the run only if none has this id. False means it already exists (a repeated trigger). */
  create(run: AutomationRun): Promise<boolean>;
  save(run: AutomationRun): Promise<void>;
  /** Active or waiting runs with nextAt <= now and no live lease, oldest first. */
  listDue(now: IsoDateTime, limit: number): Promise<AutomationRun[]>;
  /**
   * Takes the lease if it's free (atomically: a Firestore transaction). False if another worker
   * holds it. Two overlapping ticks can never process the same run.
   */
  lease(id: string, until: IsoDateTime, now: IsoDateTime): Promise<boolean>;
  listForContact(contactId: ContactId): Promise<AutomationRun[]>;
  /** Most recent first. */
  listForAutomation(automationId: string, limit: number): Promise<AutomationRun[]>;
  /** Finished runs still inside their goal window and not yet converted. */
  listGoalPending(now: IsoDateTime, limit: number): Promise<AutomationRun[]>;
  deleteForContact(contactId: ContactId): Promise<void>;
}

/** Alerts for Gus (Today, push to his phone; stage 5 adds texts for urgent ones). Idempotent by id. */
export interface AlertStore {
  get(id: string): Promise<Alert | undefined>;
  save(alert: Alert): Promise<void>;
  listForContact(contactId: ContactId): Promise<Alert[]>;
  deleteForContact(contactId: ContactId): Promise<void>;
}

/** Emails left for Gus to review. Production: saved as Gmail drafts in his mailbox. Idempotent by id. */
export interface DraftStore {
  get(id: string): Promise<Draft | undefined>;
  save(draft: Draft): Promise<void>;
  listForContact(contactId: ContactId): Promise<Draft[]>;
  deleteForContact(contactId: ContactId): Promise<void>;
}

export interface MatchQueueStore {
  save(item: MatchQueueItem): Promise<void>;
  get(id: string): Promise<MatchQueueItem | undefined>;
  listOpen(): Promise<MatchQueueItem[]>;
}

export interface SegmentStore {
  list(): Promise<Segment[]>;
  save(s: Segment): Promise<void>;
}

export interface PipelineStore {
  list(): Promise<Pipeline[]>;
  get(id: string): Promise<Pipeline | undefined>;
  save(p: Pipeline): Promise<void>;
}

export interface PipelineItemStore {
  list(): Promise<PipelineItem[]>;
  get(id: string): Promise<PipelineItem | undefined>;
  save(i: PipelineItem): Promise<void>;
}

export interface TaskStore {
  get(id: string): Promise<Task | undefined>;
  save(t: Task): Promise<void>;
  listForContact(contactId: ContactId): Promise<Task[]>;
  deleteForContact(contactId: ContactId): Promise<void>;
}

export interface TemplateStore {
  get(id: string): Promise<Template | undefined>;
  list(): Promise<Template[]>;
  save(t: Template): Promise<void>;
  /** Every saved version, kept so a send can always be traced to the exact wording. */
  addVersion(v: TemplateVersion): Promise<void>;
  listVersions(id: string): Promise<TemplateVersion[]>;
}

export interface ImportLog {
  append(record: ImportRecord): Promise<void>;
}

/**
 * The app's own data, read live (never copied). Implemented over the app's Firestore collections
 * and RevenueCat's API in production.
 */
export interface AppDataSource {
  getProfile(appUserId: AppUserId): Promise<AppProfile | undefined>;
  getSubscription(revenueCatId: string): Promise<SubscriptionInfo | undefined>;
}

export interface ConsentLedger {
  append(record: ConsentRecord): Promise<void>;
  listForContact(contactId: ContactId): Promise<ConsentRecord[]>;
  deleteForContact(contactId: ContactId): Promise<void>;
}

export interface SuppressionStore {
  /** Returns whichever of these entry ids exist. */
  getMany(ids: readonly string[]): Promise<SuppressionEntry[]>;
  /**
   * Adds an entry. If one exists with a narrower scope ('marketing') and this one is 'all',
   * the scope is widened. Scope is never narrowed: nothing overrides suppression.
   */
  add(entry: SuppressionEntry): Promise<'added' | 'widened' | 'exists'>;
  /** Only the person re-opting in themselves may lift a marketing-scope entry. */
  removeMarketingScope(id: string): Promise<void>;
}

export type ClaimResult =
  | { result: 'claimed' }
  | { result: 'duplicate'; existing: SendRecord }
  | { result: 'cap_reached'; oldestInWindow: IsoDateTime };

export interface SendLog {
  get(id: string): Promise<SendRecord | undefined>;
  /**
   * Atomically reserve a send under its idempotency key (record.id). If `cap` is given, also
   * atomically check that fewer than `cap.max` counted sends exist for this contact and
   * channel since `cap.since` (not counting this record's own id). Two concurrent claims can
   * never both succeed past the cap.
   *
   * A record that is only 'blocked' or 'deferred' can be re-claimed; anything else is a duplicate.
   */
  claim(record: SendRecord, cap?: { max: number; since: IsoDateTime }): Promise<ClaimResult>;
  update(id: string, patch: Partial<SendRecord>): Promise<void>;
  /** Write a blocked/deferred outcome. Never overwrites a claimed, sent, unknown or failed record. */
  recordOutcome(record: SendRecord): Promise<void>;
  /** Marketing sends that count towards the cap: claimed, sent or unknown, since `since`. */
  listCounted(contactId: ContactId, channel: Channel, since: IsoDateTime): Promise<SendRecord[]>;
  listForContact(contactId: ContactId): Promise<SendRecord[]>;
  deleteForContact(contactId: ContactId): Promise<void>;
}

export interface KillSwitchStore {
  /** Must read fresh from storage on every call. Never cache. */
  read(): Promise<KillSwitches>;
  write(next: KillSwitches): Promise<void>;
}

export interface SettingsStore {
  getSending(): Promise<SendingSettings>;
  saveSending(next: SendingSettings): Promise<void>;
  getInbox(): Promise<InboxSettings>;
  saveInbox(next: InboxSettings): Promise<void>;
  getAi(): Promise<AiSettings>;
  saveAi(next: AiSettings): Promise<void>;
}

export interface AuditLog {
  append(entry: AuditEntry): Promise<void>;
}

export interface TimelineStore {
  append(entry: TimelineEntry): Promise<void>;
  listForContact(contactId: ContactId): Promise<TimelineEntry[]>;
  deleteForContact(contactId: ContactId): Promise<void>;
}

/** Where push tokens live (the app's own data). Read at send time, never copied. */
export interface PushTokenSource {
  getTokens(appUserId: AppUserId): Promise<string[]>;
}

export interface OutgoingEmail {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  headers: Record<string, string>;
  /** Passed to the provider so a retry can never produce a second email. */
  idempotencyKey: string;
  /** Non-personal metadata for webhooks (send id, template id, class). */
  tags: Record<string, string>;
}

export interface OutgoingPush {
  tokens: string[];
  title: string;
  body: string;
  link?: string;
  data: Record<string, string>;
}

/**
 * Thrown by providers. `retryable` = safe to try again later. `ambiguous` = we can't tell whether
 * it went out (e.g. a timeout after the request was sent).
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly ambiguous: boolean,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export interface EmailSender {
  /** Whether the provider de-duplicates on idempotencyKey (Resend does, for 24 hours). */
  readonly supportsIdempotencyKey: boolean;
  send(email: OutgoingEmail): Promise<{ providerMessageId: string }>;
}

export interface PushSender {
  send(push: OutgoingPush): Promise<{ providerMessageId: string }>;
}

// ---- Inbox agent ------------------------------------------------------------------------------

/**
 * Gus's mailbox (Gmail). This is everything the agent can do to email, and deliberately nothing
 * more: there is no delete, archive, trash, spam, move, forward or settings method, so no bug or
 * manipulated AI output can make the agent do those things.
 */
export interface MailboxPort {
  getMessage(id: string): Promise<InboundEmail | undefined>;
  /** Only labels under "CRM/". */
  addLabels(messageId: string, labels: string[]): Promise<void>;
  removeLabels(messageId: string, labels: string[]): Promise<void>;
  /** Saves a draft in the same thread. Returns the Gmail draft id. */
  createDraft(draft: { threadId: string; to: string; subject: string; text: string; inReplyTo?: string }): Promise<string>;
  deleteDraft(draftId: string): Promise<void>;
  /** Only ever called by the agent for an approved answer to the sender, after the policy check. */
  sendReply(reply: { threadId: string; to: string; subject: string; text: string; inReplyTo?: string; idempotencyKey: string }): Promise<string>;
}

/** Texts to Gus's phone (Twilio). */
export interface SmsSender {
  send(to: string, body: string): Promise<{ id: string }>;
}

export interface ClassifyInput {
  from: { name: string; email: string };
  subject: string;
  /** Visible text only, truncated. Hidden text is removed before the AI sees it. */
  body: string;
  receivedAt: string;
  /** Just enough about the sender to classify: never anyone else's data. */
  sender?: { firstName: string; types: string[]; stage?: string; organisation?: string; inPipelines: string[] };
  today: string;
}

export interface DraftInput {
  from: { name: string; email: string };
  subject: string;
  body: string;
  /** The sender's own record only. */
  sender?: { firstName: string; stage?: string; city?: string; freeMonthsEnd?: string };
  /** Approved answers for this topic, if any. */
  answers: { id: string; name: string; body: string }[];
  voice: string;
}

/**
 * The AI (Claude). Returns raw output; the core validates every field before using any of it, and
 * treats anything malformed as "Needs me" / no draft.
 */
export interface InboxAI {
  classify(input: ClassifyInput, settings: AiSettings): Promise<unknown>;
  draftReply(input: DraftInput, settings: AiSettings): Promise<unknown>;
  understandRule(text: string, context: { organisations: string[]; pipelines: string[] }, settings: AiSettings): Promise<unknown>;
  writeBrief(facts: string, settings: AiSettings): Promise<unknown>;
}

export interface InboxStore {
  get(id: string): Promise<InboxMessage | undefined>;
  save(m: InboxMessage): Promise<void>;
  /** Most recent first. */
  listSince(since: IsoDateTime): Promise<InboxMessage[]>;
  listQueued(): Promise<InboxMessage[]>;
  listForContact(contactId: ContactId): Promise<InboxMessage[]>;
  deleteForContact(contactId: ContactId): Promise<void>;
}

export interface AgentActionLog {
  append(a: AgentAction): Promise<void>;
  get(id: string): Promise<AgentAction | undefined>;
  save(a: AgentAction): Promise<void>;
  listForMessage(messageId: string): Promise<AgentAction[]>;
  deleteForMessage(messageId: string): Promise<void>;
}

export interface AnswerTemplateStore {
  list(): Promise<AnswerTemplate[]>;
  get(id: string): Promise<AnswerTemplate | undefined>;
  save(t: AnswerTemplate): Promise<void>;
}

/** The latest weekly brief and daily digest, for Today. */
export interface BriefStore {
  saveWeekly(b: WeeklyBrief): Promise<void>;
  latestWeekly(): Promise<WeeklyBrief | undefined>;
  saveDigest(d: DailyDigest): Promise<void>;
  latestDigest(): Promise<DailyDigest | undefined>;
}

/** Settings → Problems. report() is idempotent by id (a repeat updates the time, reopens it). */
export interface ProblemLog {
  report(p: Problem): Promise<void>;
  listOpen(limit: number): Promise<Problem[]>;
  resolve(id: string, by: string, at: IsoDateTime): Promise<void>;
}
