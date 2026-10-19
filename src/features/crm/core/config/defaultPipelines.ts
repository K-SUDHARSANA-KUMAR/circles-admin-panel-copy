import type { Pipeline, PipelineStage } from '../model/pipeline';

const stages = (names: string[], won?: string, lost?: string): PipelineStage[] =>
  [...names, ...(won ? [won] : []), ...(lost ? [lost] : [])].map((name, order) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
    name,
    order,
    ...(name === won ? { outcome: 'won' as const } : {}),
    ...(name === lost ? { outcome: 'lost' as const } : {}),
  }));

const at = '2026-10-01T00:00:00.000Z';

/** Day-one pipelines. Every stage name can be renamed in the CRM. */
export const DEFAULT_PIPELINES: Pipeline[] = [
  {
    id: 'partnerships',
    name: 'Partnerships',
    description: 'Venues and brands: Thursday evenings, partner events and perks.',
    stages: stages(['Identified', 'Contacted', 'In conversation', 'Proposal sent'], 'Live', 'Not now'),
    followUp: { enabled: true, noReplyDays: 4, action: 'create_task', autoSendApproved: false, templateId: 'partner-follow-up', maxFollowUps: 2 },
    ownerOnly: false,
    createdAt: at,
    updatedAt: at,
  },
  {
    id: 'investors',
    name: 'Investors',
    description: 'Funds and angels. Only you can see this pipeline.',
    stages: stages(['Researching', 'Intro requested', 'First meeting', 'Follow-up', 'Due diligence'], 'Committed', 'Passed'),
    followUp: { enabled: true, noReplyDays: 7, action: 'create_task', autoSendApproved: false, maxFollowUps: 1 },
    ownerOnly: true,
    createdAt: at,
    updatedAt: at,
  },
  {
    id: 'press',
    name: 'Press',
    description: 'Journalists, editors and podcasts.',
    stages: stages(['Story idea', 'Pitched', 'Interested', 'Interview booked'], 'Published', 'Not now'),
    followUp: { enabled: true, noReplyDays: 5, action: 'create_task', autoSendApproved: false, maxFollowUps: 1 },
    ownerOnly: false,
    createdAt: at,
    updatedAt: at,
  },
  {
    id: 'creators',
    name: 'Creators',
    description: 'People who could bring their following with them.',
    stages: stages(['Spotted', 'Reached out', 'In talks'], 'Collaborating', 'Not a fit'),
    followUp: { enabled: true, noReplyDays: 5, action: 'create_task', autoSendApproved: false, maxFollowUps: 1 },
    ownerOnly: false,
    createdAt: at,
    updatedAt: at,
  },
];
