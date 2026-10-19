import type { Logger } from './audit/logger';
import type { CoreConfig } from './config/defaults';
import type { LifecycleSettings } from './lifecycle/derive';
import type {
  ProblemLog,
  BriefStore,
  AgentActionLog,
  AnswerTemplateStore,
  InboxAI,
  InboxStore,
  MailboxPort,
  SmsSender,
  AlertStore,
  AutomationRunStore,
  AutomationStore,
  DraftStore,
  AppDataSource,
  AuditLog,
  Clock,
  ConsentLedger,
  ContactStore,
  EmailSender,
  Hasher,
  IdGenerator,
  ImportLog,
  KillSwitchStore,
  LumaEventStore,
  MatchQueueStore,
  OrganisationStore,
  PipelineItemStore,
  PipelineStore,
  ProcessedEventStore,
  RegistrationStore,
  SegmentStore,
  TaskStore,
  TemplateStore,
  PushSender,
  PushTokenSource,
  SendLog,
  SettingsStore,
  Signer,
  SuppressionStore,
  TimelineStore,
} from './ports';

/**
 * Everything the core needs from the outside world. Functions take a `Pick` of this so each
 * one declares exactly what it touches, and tests can supply only that.
 */
export interface CoreDeps {
  clock: Clock;
  ids: IdGenerator;
  hasher: Hasher;
  signer: Signer;
  logger: Logger;
  config: CoreConfig;
  contacts: ContactStore;
  organisations: OrganisationStore;
  consentLedger: ConsentLedger;
  suppression: SuppressionStore;
  sendLog: SendLog;
  killSwitches: KillSwitchStore;
  settings: SettingsStore;
  audit: AuditLog;
  timeline: TimelineStore;
  email: EmailSender;
  push: PushSender;
  pushTokens: PushTokenSource;
  processedEvents: ProcessedEventStore;
  registrations: RegistrationStore;
  lumaEvents: LumaEventStore;
  matchQueue: MatchQueueStore;
  segments: SegmentStore;
  pipelines: PipelineStore;
  pipelineItems: PipelineItemStore;
  tasks: TaskStore;
  templates: TemplateStore;
  imports: ImportLog;
  appData: AppDataSource;
  automations: AutomationStore;
  automationRuns: AutomationRunStore;
  alerts: AlertStore;
  drafts: DraftStore;
  mailbox: MailboxPort;
  sms: SmsSender;
  ai: InboxAI;
  inbox: InboxStore;
  agentLog: AgentActionLog;
  answers: AnswerTemplateStore;
  briefs: BriefStore;
  problems: ProblemLog;
  lifecycle: LifecycleSettings;
}
