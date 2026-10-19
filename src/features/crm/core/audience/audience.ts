/**
 * Audience: the conversion funnel, the Connectors ranking and interest clusters.
 */
import type { Contact } from '../model/contact';

const DAY = 86_400_000;

// ---------------------------------------------------------------------------------------
// Funnel: prospect → signed up → verified → active → trial → member

export const FUNNEL_STEPS = [
  { id: 'prospect', label: 'Prospect', note: 'Known to us: app, website, Luma or event' },
  { id: 'signed_up', label: 'Signed up', note: 'Created an account' },
  { id: 'verified', label: 'Verified', note: 'Approved by you' },
  { id: 'active', label: 'Active', note: 'Has friends on Circles and used it recently' },
  { id: 'trial', label: 'Free 3 months', note: 'Starts automatically on verification' },
  { id: 'member', label: 'Member', note: 'Paid at least once' },
] as const;
export type FunnelStepId = (typeof FUNNEL_STEPS)[number]['id'];

export interface FunnelOptions {
  /** "Active" = at least one friend and used the app in the last N days. Default 14. */
  activeDays: number;
  /** Only count people who first became known since this date (a cohort). */
  since?: Date;
}

export interface FunnelStepResult {
  id: FunnelStepId;
  label: string;
  note: string;
  count: number;
  /** % of the previous step who made it here. */
  fromPrevious: number | null;
  /** People who reached this step but not the next one: the segment to act on. */
  stuck: Contact[];
}

function reached(c: Contact, step: FunnelStepId, now: Date, o: FunnelOptions): boolean {
  const s = c.signals;
  const signedUp = !!s.joinedAt && c.lifecycle?.stage !== 'Prospect';
  const verified = signedUp && !!s.verifiedAt;
  const everPaid = !!s.subscription?.everPaid;
  const recentlyActive = !!s.lastActiveAt && Date.parse(s.lastActiveAt) >= now.getTime() - o.activeDays * DAY;
  const active = verified && (s.friendsCount ?? 0) >= 1 && (recentlyActive || everPaid);
  const trial = active && !!s.freePeriod;
  switch (step) {
    case 'prospect':
      return true;
    case 'signed_up':
      return signedUp;
    case 'verified':
      return verified;
    case 'active':
      return active;
    case 'trial':
      return trial;
    case 'member':
      return trial && everPaid;
  }
}

export function computeFunnel(contacts: readonly Contact[], now: Date, options: FunnelOptions): FunnelStepResult[] {
  const people = contacts.filter(
    (c) => !c.mergedInto && c.lifecycle !== null && (!options.since || Date.parse(c.createdAt) >= options.since.getTime()),
  );
  const at = FUNNEL_STEPS.map((step) => people.filter((c) => reached(c, step.id, now, options)));
  return FUNNEL_STEPS.map((step, i) => {
    const here = at[i]!;
    const next = at[i + 1];
    const prev = at[i - 1];
    const nextIds = new Set(next?.map((c) => c.id) ?? []);
    return {
      id: step.id,
      label: step.label,
      note: step.note,
      count: here.length,
      fromPrevious: prev ? (prev.length === 0 ? 0 : here.length / prev.length) : null,
      stuck: next ? here.filter((c) => !nextIds.has(c.id)) : [],
    };
  });
}

// ---------------------------------------------------------------------------------------
// Connectors: who brings people in, and keeps them active

export interface ConnectorWeights {
  /** Per person they brought in who's still active (last 30 days). */
  activeInvitee: number;
  /** Per person they brought in. */
  invitee: number;
  /** Per plan completed with friends. */
  planWithFriends: number;
}

export const DEFAULT_CONNECTOR_WEIGHTS: ConnectorWeights = { activeInvitee: 3, invitee: 1, planWithFriends: 0.5 };

export interface ConnectorRow {
  contact: Contact;
  invited: number;
  invitedActive: number;
  plansWithFriends: number;
  score: number;
  rank: number;
}

export function rankConnectors(contacts: readonly Contact[], weights: ConnectorWeights = DEFAULT_CONNECTOR_WEIGHTS): ConnectorRow[] {
  return contacts
    .filter((c) => !c.mergedInto && c.appUserId && ((c.signals.invitedJoined ?? 0) > 0 || (c.signals.plansWithFriendsCount ?? 0) > 0))
    .map((c) => {
      const invited = c.signals.invitedJoined ?? 0;
      const invitedActive = c.signals.invitedActive ?? 0;
      const plansWithFriends = c.signals.plansWithFriendsCount ?? 0;
      const score = invitedActive * weights.activeInvitee + invited * weights.invitee + plansWithFriends * weights.planWithFriends;
      return { contact: c, invited, invitedActive, plansWithFriends, score, rank: 0 };
    })
    .sort((a, b) => b.score - a.score || b.invited - a.invited || a.contact.id.localeCompare(b.contact.id))
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

// ---------------------------------------------------------------------------------------
// Interest clusters: which interest groups are big enough for an event

export interface InterestCluster {
  /** "tennis|London" */
  id: string;
  interest: string;
  city: string;
  people: Contact[];
  /** Used the app in the last 30 days. */
  active: number;
  members: number;
  eventReady: boolean;
}

export function interestClusters(
  contacts: readonly Contact[],
  now: Date,
  options: { eventReadyAt: number; activeDays?: number } = { eventReadyAt: 12 },
): InterestCluster[] {
  const activeDays = options.activeDays ?? 30;
  const onApp = contacts.filter((c) => !c.mergedInto && c.lifecycle && ['Trial', 'Member', 'Guest', 'AtRisk'].includes(c.lifecycle.stage));
  const map = new Map<string, InterestCluster>();
  for (const c of onApp) {
    const city = c.signals.city ?? 'Unknown';
    for (const interest of c.signals.interests ?? []) {
      const id = `${interest}|${city}`;
      const cluster = map.get(id) ?? { id, interest, city, people: [], active: 0, members: 0, eventReady: false };
      cluster.people.push(c);
      if (c.signals.lastActiveAt && Date.parse(c.signals.lastActiveAt) >= now.getTime() - activeDays * DAY) cluster.active += 1;
      if (c.lifecycle?.stage === 'Member') cluster.members += 1;
      map.set(id, cluster);
    }
  }
  return [...map.values()]
    .map((cl) => ({ ...cl, eventReady: cl.active >= options.eventReadyAt }))
    .sort((a, b) => b.active - a.active || b.people.length - a.people.length);
}
