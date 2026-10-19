import type { InboxSettings } from '../model/inbox';

const at = '2026-10-01T00:00:00.000Z';

/**
 * Urgent by default: the partners Gus named, investors, press, legal, payments, complaints or
 * safety concerns about a member, and anything with a deadline in the next 48 hours.
 * Partner domains are placeholders until the real ones are filled in (Inbox → Rules).
 */
export const DEFAULT_INBOX_SETTINGS: InboxSettings = {
  rules: [
    { id: 'r_birley', text: 'Anything from Birley is urgent', understood: 'From anyone at Birley → Urgent', match: { kind: 'organisation', orgId: 'org_birley' }, category: 'urgent', enabled: true, createdAt: at },
    { id: 'r_lowicks', text: 'Anything from Lowicks is urgent', understood: 'From anyone at Lowicks → Urgent', match: { kind: 'organisation', orgId: 'org_lowicks' }, category: 'urgent', enabled: true, createdAt: at },
    { id: 'r_noam', text: 'Anything from NOAM is urgent', understood: 'From anyone at NOAM → Urgent', match: { kind: 'organisation', orgId: 'org_noam' }, category: 'urgent', enabled: true, createdAt: at },
    { id: 'r_evolv', text: 'Anything from Evolv is urgent', understood: 'From anyone at Evolv → Urgent', match: { kind: 'organisation', orgId: 'org_evolv' }, category: 'urgent', enabled: true, createdAt: at },
    { id: 'r_jockey', text: 'Anything from The Jockey Club is urgent', understood: 'From anyone at The Jockey Club → Urgent', match: { kind: 'organisation', orgId: 'org_the-jockey-club' }, category: 'urgent', enabled: true, createdAt: at },
    { id: 'r_investors', text: 'Anyone in my Investors pipeline is urgent', understood: 'From anyone in the Investors pipeline → Urgent', match: { kind: 'pipeline', pipelineId: 'investors' }, category: 'urgent', enabled: true, createdAt: at },
    { id: 'r_press', text: 'Anyone in my Press pipeline is urgent', understood: 'From anyone in the Press pipeline → Urgent', match: { kind: 'pipeline', pipelineId: 'press' }, category: 'urgent', enabled: true, createdAt: at },
    {
      id: 'r_legal',
      text: 'Legal letters are urgent',
      understood: 'Mentions solicitor, legal action, cease and desist, lawsuit, tribunal or court → Urgent',
      match: { kind: 'keywords', any: ['solicitor', 'legal action', 'cease and desist', 'lawsuit', 'tribunal', 'court proceedings', 'letter before action'] },
      category: 'urgent',
      enabled: true,
      createdAt: at,
    },
    {
      id: 'r_payments',
      text: 'Payment problems are urgent',
      understood: 'Mentions invoice overdue, chargeback, refund request, payment failed or bank details → Urgent',
      match: { kind: 'keywords', any: ['invoice overdue', 'overdue invoice', 'chargeback', 'refund', 'payment failed', 'bank details', 'final notice'] },
      category: 'urgent',
      enabled: true,
      createdAt: at,
    },
    {
      id: 'r_safety',
      text: 'Complaints or safety concerns about a member are urgent',
      understood: 'Mentions harassment, unsafe, assault, threatening, inappropriate, complaint about a member → Urgent',
      match: { kind: 'keywords', any: ['harass', 'unsafe', 'assault', 'threaten', 'inappropriate', 'made me uncomfortable', 'complaint about', 'report a member', 'safeguarding'] },
      category: 'urgent',
      enabled: true,
      createdAt: at,
    },
  ],
  routineModes: { membership_question: 'draft', how_to: 'draft', event_details: 'draft', applicant_status: 'draft' },
  confidenceThreshold: 0.9,
  deadlineHours: 48,
  dailyDigestTime: '08:00',
};
