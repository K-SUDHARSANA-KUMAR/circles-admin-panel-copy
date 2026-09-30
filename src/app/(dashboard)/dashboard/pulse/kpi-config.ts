import type { PulseEntry, PulseKpis } from '@/services/pulse.service';
import { fmtInt, fmtMoney, fmtPct } from '@/services/pulse.service';

/**
 * The ten cards, in the order the client's dashboard shows them. `goodDirection`
 * drives the colour of the trend chip — CAC is the one metric where a fall is
 * the good news.
 */
export interface KpiSpec {
  key: keyof PulseKpis;
  label: string;
  subtitle: string;
  format: (v: number | null) => string;
  goodDirection: 'up' | 'down';
}

export const KPI_SPECS: KpiSpec[] = [
  { key: 'totalUsers', label: 'Total users', subtitle: 'cumulative accounts', format: fmtInt, goodDirection: 'up' },
  { key: 'newUsers', label: 'New users', subtitle: 'this period', format: fmtInt, goodDirection: 'up' },
  { key: 'activationRate', label: 'Activation rate', subtitle: 'of new users', format: fmtPct, goodDirection: 'up' },
  { key: 'inviteShare', label: 'Invite share', subtitle: 'of new users', format: fmtPct, goodDirection: 'up' },
  { key: 'mauPct', label: 'MAU %', subtitle: 'of total users', format: fmtPct, goodDirection: 'up' },
  { key: 'fullMembers', label: 'Full members', subtitle: 'cumulative', format: fmtInt, goodDirection: 'up' },
  { key: 'membersPctUsers', label: 'Members % of users', subtitle: 'paid share of base', format: fmtPct, goodDirection: 'up' },
  { key: 'freeToMember', label: 'Free period → member', subtitle: 'trial conversion', format: fmtPct, goodDirection: 'up' },
  { key: 'cac', label: 'CAC', subtitle: 'per new customer', format: fmtMoney, goodDirection: 'down' },
  { key: 'ltv', label: 'LTV', subtitle: 'per member', format: fmtMoney, goodDirection: 'up' },
];

/** The 12 inputs, with the source hint the client's form shows under each one. */
export interface InputSpec {
  key: keyof Omit<PulseEntry, 'id' | 'month' | 'isExample' | 'locked' | 'createdBy' | 'updatedBy' | 'createdAt' | 'updatedAt' | 'kpis'>;
  label: string;
  hint: string;
  step?: string;
}

export const INPUT_SPECS: InputSpec[] = [
  { key: 'totalUsers', label: 'Total users (cumulative)', hint: 'Firebase users count, or App Store Connect + Play Console installs' },
  { key: 'newUsers', label: 'New users this month', hint: "Firebase: this month's total − last month's total" },
  { key: 'activatedUsers', label: 'Activated (of new users)', hint: 'Firebase `activated` event: 5+ friends and 1 plan within 14 days' },
  { key: 'invitedUsers', label: 'Invited (of new users)', hint: 'Sign-up source: invite link / ambassador code / event code' },
  { key: 'mau', label: 'Monthly active users', hint: 'Firebase Analytics, 30-day active users' },
  { key: 'fullMembers', label: 'Full members (cumulative)', hint: 'RevenueCat active subscriptions' },
  { key: 'freeEnded', label: 'Free periods ended', hint: 'RevenueCat cohort view, or Firebase `trial_end` events' },
  { key: 'freeConverted', label: 'Of those, converted', hint: 'RevenueCat cohort view + new subs this month' },
  { key: 'marketingSpend', label: 'Acquisition spend ($)', hint: 'Budget actuals: cash out this month', step: '0.01' },
  { key: 'newCustomers', label: 'New paying customers', hint: 'RevenueCat: new subscriptions started this month' },
  { key: 'arpm', label: 'Avg. revenue / member / month ($)', hint: 'RevenueCat: net revenue ÷ active members', step: '0.01' },
  { key: 'avgLifetimeMonths', label: 'Avg. member lifetime (months)', hint: 'RevenueCat: 1 ÷ monthly churn rate', step: '0.1' },
];

/** Cross-field rules, mirroring the backend so the editor sees them before saving. */
export const validateInputs = (v: Record<string, number>): string[] => {
  const out: string[] = [];
  if (v.activatedUsers > v.newUsers) out.push('Activated cannot exceed new users.');
  if (v.invitedUsers > v.newUsers) out.push('Invited cannot exceed new users.');
  if (v.freeConverted > v.freeEnded) out.push('Converted cannot exceed free periods ended.');
  if (v.mau > v.totalUsers) out.push('MAU cannot exceed total users.');
  if (v.fullMembers > v.totalUsers) out.push('Full members cannot exceed total users.');
  return out;
};
