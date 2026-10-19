// Model
export * from './model/common';
export * from './model/consent';
export * from './model/contact';
export * from './model/organisation';
export * from './model/message';
export * from './model/sendStatus';
export * from './model/suppression';
export * from './model/settings';
export * from './model/audit';
export * from './model/pipeline';
export * from './model/segment';
export * from './model/template';
export * from './model/automation';
export * from './model/inbox';
export * from './model/events';
export * from './model/brief';
export * from './model/problem';
export * from './audit/problems';

// Ports and dependencies
export * from './ports';
export type { CoreDeps } from './deps';
export * from './config/defaults';
export * from './crypto';

// Access
export * from './access/permissions';

// Audit and logging
export * from './audit/logger';
export * from './audit/audit';

// Contacts
export * from './contacts/addressKind';

// Consent and sending
export * from './consent/gate';
export * from './consent/marketingContent';
export * from './consent/suppression';
export * from './consent/consentService';
export * from './consent/unsubscribe';
export * from './consent/controls';
export * from './sending/timezone';
export * from './sending/quietHours';
export * from './sending/frequencyCap';
export * from './sending/compose';
export * from './sending/sendService';

// Privacy
export * from './privacy/dataSubject';

// Templates and day-one configuration
export * from './templates/markdown';
export * from './config/defaultPipelines';
export * from './config/presetSegments';
export * from './config/defaultInbox';
export * from './config/prompts';
export * from './config/answers';
export * from './config/prebuiltAutomations';

// Segments and audience
export * from './segments/fields';
export * from './segments/evaluate';
export * from './audience/audience';
export * from './templates/render';

// Automations
export * from './automations/summary';
export * from './automations/engine';
export * from './automations/manage';
export * from './automations/schema';
export * from './templates/manage';
export * from './inbox/untrusted';
export * from './inbox/rules';
export * from './inbox/aiOutput';
export * from './inbox/policy';
export * from './inbox/alerts';
export * from './inbox/agent';
export * from './inbox/manage';
export * from './inbox/briefs';
export * from './sending/engagement';

// Contacts, lifecycle, events, pipelines, scheduling (stage 3)
export * from './contacts/phone';
export * from './contacts/matching';
export * from './contacts/csv';
export * from './contacts/import';
export * from './contacts/merge';
export * from './lifecycle/derive';
export * from './events/contract';
export * from './events/ingest';
export * from './events/luma';
export * from './events/webhooks';
export * from './segments/membership';
export * from './pipelines/followUps';
export * from './pipelines/move';
export * from './scheduling/sweep';
export * from './scheduling/nightly';
