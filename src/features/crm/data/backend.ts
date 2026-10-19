/**
 * The CRM tab's data layer. Replaces the prototype's in-browser backend: the screens still read
 * `backend.state` synchronously, but it now holds the last snapshot from user-service
 * (GET admin/crm/snapshot, already filtered for the admin's role), and every change goes through
 * an admin action (POST admin/crm/actions/:name), after which the snapshot is reloaded.
 *
 * The server checks every permission and rule again. `can()` here only decides what to show.
 */
import customAxios from '@/lib/axios';
import { PULSE_URL } from '@/services/pulse.service';
import {
  can,
  type AdminUser,
  type AgentAction,
  type AiSettings,
  type Alert,
  type AnswerTemplate,
  type AppProfile,
  type AuditEntry,
  type Automation,
  type AutomationRun,
  type AutomationVersion,
  type Capability,
  type ConsentRecord,
  type Contact,
  type DailyDigest,
  type Draft,
  type Grant,
  type ImportField,
  type ImportOptions,
  type ImportRecord,
  type InboxMessage,
  type InboxSettings,
  type KillSwitches,
  type LumaEvent,
  type MatchQueueItem,
  type Organisation,
  type Pipeline,
  type PipelineItem,
  type Problem,
  type Registration,
  type Segment,
  type SendingSettings,
  type SendRecord,
  type SendRequest,
  type SendResult,
  type SubjectAccessExport,
  type SubscriptionInfo,
  type SuppressionEntry,
  type Task,
  type Template,
  type TimelineEntry,
  type UndoResult,
  type WeeklyBrief,
  type InboundEmail,
  type sendTest as coreSendTest,
} from '../core';

type SendTestResult = Awaited<ReturnType<typeof coreSendTest>>;

/** user-service's CRM routes, next to Pulse's. */
export const CRM_URL = PULSE_URL.replace(/\/admin\/pulse$/, '/admin/crm');

export interface CrmIntegrations {
  email: boolean;
  gmail: boolean;
  sms: boolean;
  push: boolean;
  claude: boolean;
  scheduler: boolean;
}

export interface CrmStatus {
  ready: boolean;
  reason: string | null;
  integrations: CrmIntegrations;
}

/** `linked`: their CRM access is locked to their own sign-in (set on their first visit). */
export type CrmAdminEntry = AdminUser & { linked: boolean };

export interface CrmWorld {
  now: string;
  /** Everyone with CRM access (Team sees only themselves). */
  admins: CrmAdminEntry[];
  /** Owner only: active admins without CRM access, who can be added in Settings → Team. */
  adminCandidates: CrmAdminEntry[];
  organisations: Organisation[];
  contacts: Contact[];
  /** Always empty: live app data is read per contact (useLiveData). */
  appProfiles: Record<string, AppProfile>;
  subscriptions: Record<string, SubscriptionInfo>;
  consentLedger: ConsentRecord[];
  timeline: TimelineEntry[];
  pipelines: Pipeline[];
  pipelineItems: PipelineItem[];
  tasks: Task[];
  segments: Segment[];
  lumaEvents: LumaEvent[];
  registrations: Registration[];
  inbox: InboxMessage[];
  alerts: Alert[];
}

/** The snapshot's shape: the prototype's State, minus its demo-only parts. */
export interface State {
  now: string;
  me: AdminUser;
  capabilities: Capability[];
  integrations: CrmIntegrations;
  lastSeenAt: Record<string, string>;
  world: CrmWorld;
  killSwitches: KillSwitches;
  sending: SendingSettings;
  inboxSettings: InboxSettings;
  templates: Template[];
  templateHistory: { templateId: string; version: number; savedAt: string; savedBy: string; note: string; snapshot: Template }[];
  automations: Automation[];
  automationHistory: AutomationVersion[];
  runs: AutomationRun[];
  drafts: Draft[];
  sends: SendRecord[];
  suppression: SuppressionEntry[];
  audit: AuditEntry[];
  agentActions: AgentAction[];
  settings: { activeDays: number; eventReadyAt: number; connectorWeights: { activeInvitee: number; invitee: number; planWithFriends: number } };
  aiSettings: AiSettings;
  answers: AnswerTemplate[];
  /** Gmail isn't connected: always empty. */
  mailbox: {
    messages: Record<string, InboundEmail>;
    sent: { id: string; threadId: string; to: string; subject: string; text: string; key: string; at: string }[];
  };
  briefs: { weekly: WeeklyBrief[]; digests: DailyDigest[] };
  problems: Problem[];
  matchQueue: MatchQueueItem[];
  imports: ImportRecord[];
}

/** A failed CRM request, with the server's plain-English message. */
export class CrmRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'CrmRequestError';
  }
}

/** user-service wraps every body as { statusCode, message, data }. */
function unwrap<T>(res: { data?: unknown }): T {
  const body = res.data as { statusCode?: number; data?: unknown } | undefined;
  return (body && typeof body === 'object' && 'statusCode' in body && 'data' in body ? body.data : body) as T;
}

function asCrmError(err: unknown, fallback: string): CrmRequestError {
  const e = err as { message?: string; response?: { status?: number; data?: { message?: string | string[]; result?: { message?: string } } } };
  const m = e?.response?.data?.message;
  const message = (Array.isArray(m) ? m.join('; ') : m) || e?.response?.data?.result?.message || e?.message || fallback;
  return new CrmRequestError(message, e?.response?.status);
}

export async function crmGet<T>(path: string): Promise<T> {
  try {
    return unwrap<T>(await customAxios.get(`${CRM_URL}/${path}`));
  } catch (err) {
    throw asCrmError(err, 'Could not load the CRM');
  }
}

async function crmAction<T>(name: string, body: object): Promise<T> {
  try {
    return unwrap<T>(await customAxios.post(`${CRM_URL}/actions/${name}`, body));
  } catch (err) {
    throw asCrmError(err, 'That didn’t work');
  }
}

type Listener = () => void;

export class Backend {
  state!: State;
  version = 0;
  ready = false;
  private listeners = new Set<Listener>();
  private seq = 0;

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };
  getVersion = () => this.version;

  /** Loads the snapshot. Throws CrmRequestError (401/403/503) for the page to explain. */
  async init(): Promise<void> {
    await this.reload();
    this.ready = true;
    this.commit();
  }

  async reload(): Promise<void> {
    this.state = await crmGet<State>('snapshot');
    this.commit();
  }

  commit() {
    this.version += 1;
    for (const l of this.listeners) l();
  }

  /** Runs an action, then refreshes what the screens show. */
  private async act<T = unknown>(name: string, body: object = {}): Promise<T> {
    const result = await crmAction<T>(name, body);
    await this.reload();
    return result;
  }

  /** For the screens that call without awaiting: the error still reaches the admin (see CrmApp). */
  private fire(name: string, body: object = {}): void {
    void this.act(name, body);
  }

  /** Client-side ids for drafts of new records (segment ids, occasions). The server checks them. */
  nextId(prefix: string) {
    this.seq += 1;
    return `${prefix}_${Date.now().toString(36)}${this.seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  // ---------------------------------------------------------------------------------------
  // Who's looking

  get admin(): AdminUser {
    return this.state.me;
  }
  can(capability: Capability) {
    return can(this.admin, capability);
  }
  /** The snapshot already leaves out what this admin may not see. */
  visibleContacts(): Contact[] {
    return this.state.world.contacts;
  }
  contact(id: string) {
    return this.state.world.contacts.find((c) => c.id === id);
  }
  visiblePipelines(): Pipeline[] {
    return this.state.world.pipelines.filter((p) => !p.ownerOnly || this.can('pipelines.investors'));
  }
  runsFor(automationId: string, limit = 50): AutomationRun[] {
    return this.state.runs
      .filter((r) => r.automationId === automationId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }
  markSeen() {
    this.fire('markSeen');
  }

  // ---------------------------------------------------------------------------------------
  // Contacts, notes, tasks

  addNote(contactId: string, text: string) {
    return this.act('addNote', { contactId, text });
  }
  setFollowUp(contactId: string, iso: string | undefined) {
    this.fire('updateContact', { contactId, patch: { nextFollowUpAt: iso ?? null } });
  }
  setTags(contactId: string, tags: string[]) {
    this.fire('updateContact', { contactId, patch: { tags } });
  }
  setOwner(contactId: string, ownerId: string) {
    this.fire('updateContact', { contactId, patch: { ownerId } });
  }
  recordReply(contactId: string) {
    return this.act('logActivity', { contactId, kind: 'reply' });
  }
  recordOutbound(contactId: string) {
    return this.act('logActivity', { contactId, kind: 'outbound' });
  }
  addTask(input: { title: string; dueAt?: string; contactId?: string; assigneeId?: string; pipelineItemId?: string }) {
    const { title, dueAt, contactId, assigneeId, pipelineItemId } = input;
    this.fire('addTask', { title, ...(dueAt ? { dueAt } : {}), ...(contactId ? { contactId } : {}), ...(assigneeId ? { assigneeId } : {}), ...(pipelineItemId ? { pipelineItemId } : {}) });
  }
  completeTask(id: string, done = true) {
    this.fire('completeTask', { taskId: id, done });
  }
  snoozeTask(id: string, days: number) {
    this.fire('snoozeTask', { taskId: id, days });
  }
  merge(keepId: string, mergeId: string): Promise<Contact> {
    return this.act<Contact>('mergeContacts', { keepId, mergeId });
  }
  resolveMatch(itemId: string, to: string | 'new') {
    return this.act('resolveLumaMatch', { itemId, to });
  }
  /** The preview is planned in the browser; the server plans again from the same file before importing. */
  async applyImport(csvText: string, mapping: ImportField[], options: ImportOptions): Promise<ImportRecord> {
    const r = await this.act<{ record: ImportRecord }>('importContacts', { csvText, mapping, options, apply: true });
    return r.record;
  }

  // ---------------------------------------------------------------------------------------
  // Sending, consent, kill switches

  setKillSwitches(patch: Partial<Pick<KillSwitches, 'pauseAllSending' | 'inboxAgentOff'>>): Promise<{ caughtUp?: { handled: number; urgent: number } }> {
    return this.act('setKillSwitches', patch);
  }
  updateSending(next: SendingSettings) {
    return this.act('updateSendingSettings', next);
  }
  /** Sends the template's saved version through the server's consent gate. */
  sendTemplate(request: SendRequest): Promise<SendResult> {
    return this.act<SendResult>('sendTemplateNow', { contactId: request.contactId, templateId: request.templateId });
  }
  /** Tests the template's saved version (to the signed-in admin's own address). */
  sendTest(template: Template, _email?: unknown): Promise<SendTestResult> {
    return this.act<SendTestResult>('sendTest', { templateId: template.id });
  }
  suppressContact(contactId: string, _reason: 'do_not_contact') {
    return this.act('suppressContact', { contactId });
  }
  exportContact(contactId: string): Promise<SubjectAccessExport> {
    return this.act<SubjectAccessExport>('exportContact', { contactId });
  }
  eraseContact(contactId: string) {
    return this.act('eraseContact', { contactId, confirm: 'ERASE' });
  }

  // ---------------------------------------------------------------------------------------
  // Pipelines

  moveItem(itemId: string, stageId: string) {
    return this.act('movePipelineItem', { itemId, stageId });
  }
  setItemFollowUp(itemId: string, iso: string | undefined) {
    this.fire('setPipelineItemFollowUp', { itemId, nextFollowUpAt: iso ?? null });
  }
  addItem(input: Pick<PipelineItem, 'pipelineId' | 'stageId' | 'title'> & Partial<PipelineItem>) {
    const { pipelineId, stageId, title, contactId, orgId, valueGbp } = input;
    this.fire('addPipelineItem', { pipelineId, stageId, title, ...(contactId ? { contactId } : {}), ...(orgId ? { orgId } : {}), ...(valueGbp !== undefined ? { valueGbp } : {}) });
  }
  savePipeline(next: Pipeline) {
    return this.act('savePipeline', { pipeline: next });
  }

  // ---------------------------------------------------------------------------------------
  // Segments

  saveSegment(segment: Segment) {
    const { id, name, description, filter, pinned } = segment;
    return this.act('saveSegment', { id, name, ...(description ? { description } : {}), filter, pinned: !!pinned });
  }
  deleteSegment(id: string) {
    this.fire('deleteSegment', { segmentId: id });
  }

  // ---------------------------------------------------------------------------------------
  // Templates and automations

  async saveTemplate(next: Template, note: string): Promise<Template> {
    await this.act('saveTemplate', { template: next, note });
    return this.state.templates.find((t) => t.id === next.id) ?? next;
  }
  async createTemplate(name: string, channel: 'email' | 'push', messageClass: Template['messageClass']): Promise<string> {
    const r = await this.act<{ id: string }>('createTemplate', { name, channel, messageClass });
    return r.id;
  }
  setAutomationEnabled(id: string, enabled: boolean) {
    return this.act('setAutomationEnabled', { automationId: id, enabled });
  }
  saveAutomation(next: Automation, change: string) {
    // Stats only ever change on the server.
    const { stats: _stats, ...automation } = next;
    return this.act('saveAutomation', { automation, change });
  }
  discardDraft(id: string) {
    return this.act('discardDraft', { draftId: id });
  }

  // ---------------------------------------------------------------------------------------
  // Inbox

  undoAgentAction(actionId: string): Promise<UndoResult> {
    return this.act<UndoResult>('undoAgentAction', { actionId });
  }
  async understandRule(text: string) {
    // Nothing is saved, so no reload.
    const r = await crmAction<{ rule: InboxSettings['rules'][number] | null }>('understandRule', { text });
    return r.rule ?? undefined;
  }
  saveInboxSettings(next: InboxSettings) {
    return this.act('saveInboxSettings', next);
  }
  saveAiSettings(next: AiSettings) {
    return this.act('saveAiSettings', next);
  }
  saveAnswer(answer: AnswerTemplate, approve: boolean) {
    const { id, category, name, answers, body } = answer;
    return this.act('saveAnswer', { answer: { id, category, name, answers, body }, approve });
  }
  setMessageStatus(id: string, status: 'waiting_for_you' | 'done') {
    return this.act('setMessageStatus', { messageId: id, status });
  }
  resolveProblem(id: string) {
    this.fire('resolveProblem', { problemId: id });
  }
  acknowledgeAlert(id: string) {
    this.fire('acknowledgeAlert', { alertId: id });
  }

  // ---------------------------------------------------------------------------------------
  // Team and settings

  setGrants(adminId: string, grants: Grant[]) {
    return this.act('setTeamAccess', { adminId, role: 'team', grants });
  }
  /** Owner: give an admin CRM access (Team, no extras). */
  addToTeam(adminId: string) {
    return this.act('setTeamAccess', { adminId, role: 'team', grants: [] });
  }
  /** Owner: remove an admin's CRM access (also clears the sign-in it was locked to). */
  removeFromTeam(adminId: string) {
    return this.act('setTeamAccess', { adminId, role: 'none' });
  }
  saveSettings(patch: Partial<State['settings']>) {
    return this.act('saveAudienceSettings', { ...this.state.settings, ...patch });
  }
}

export const backend = new Backend();

/** A contact's live app profile and subscription, read from the app's own records. */
export function fetchLiveData(contactId: string) {
  return crmGet<{ profile: AppProfile | null; subscription: SubscriptionInfo | null }>(`contacts/${encodeURIComponent(contactId)}/live`);
}
