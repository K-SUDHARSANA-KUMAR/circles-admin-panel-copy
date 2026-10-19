import type { AdminId } from '../model/common';

/**
 * Two roles. Owner (Gus): everything. Team: contacts, pipelines, tasks and templates,
 * plus any extra access the Owner switches on for that person.
 *
 * TODO-SECURITY: in production the role and grants come from Firebase Auth custom claims
 * set by an Owner-only callable function, and the Firestore rules enforce the same matrix.
 * This module is the single source of truth both must match (see firebase/firestore.rules).
 */
export type Role = 'owner' | 'team';

/** Extra access the Owner can switch on for an individual team member. */
export const GRANTS = ['see_audience', 'see_automations', 'edit_automations', 'see_email_content'] as const;
export type Grant = (typeof GRANTS)[number];

export const GRANT_LABELS: Record<Grant, string> = {
  see_audience: 'See Audience (funnel, segments, Connectors, interest clusters)',
  see_automations: 'See automations',
  edit_automations: 'Edit automations and switch them on or off',
  see_email_content: 'See full email content on timelines',
};

export interface AdminUser {
  id: AdminId;
  name: string;
  email: string;
  role: Role;
  grants: Grant[];
}

export const CAPABILITIES = [
  'contacts.read',
  'contacts.write',
  'contacts.import',
  'organisations.read',
  'organisations.write',
  'pipelines.read',
  'pipelines.write',
  'pipelines.investors',
  'tasks.read',
  'tasks.write',
  'templates.read',
  'templates.write',
  'audience.read',
  'segments.write',
  'automations.read',
  'automations.write',
  'inbox.read',
  'inbox.rules.write',
  'email.content.read',
  'consent.record',
  'consent.declareImportEvidence',
  'settings.read',
  'settings.write',
  'killSwitch.write',
  'data.export',
  'data.erase',
  'audit.read',
  'team.manage',
  'sends.test',
] as const;
export type Capability = (typeof CAPABILITIES)[number];

/** What every team member gets by default. */
const TEAM_BASE: ReadonlySet<Capability> = new Set<Capability>([
  'contacts.read',
  'contacts.write',
  'contacts.import',
  'organisations.read',
  'organisations.write',
  'pipelines.read',
  'pipelines.write',
  'tasks.read',
  'tasks.write',
  'templates.read',
  'templates.write',
  'sends.test',
]);

/** What each Owner-granted switch adds. */
const GRANT_CAPABILITIES: Record<Grant, readonly Capability[]> = {
  see_audience: ['audience.read'],
  see_automations: ['automations.read'],
  edit_automations: ['automations.read', 'automations.write'],
  see_email_content: ['email.content.read'],
};

/**
 * Never available to Team, whatever is switched on. Gus's brief: no investor pipeline,
 * kill switches or data export for Team. The rest protect consent evidence, settings and
 * the audit trail.
 */
export const OWNER_ONLY: ReadonlySet<Capability> = new Set<Capability>([
  'pipelines.investors',
  'killSwitch.write',
  'data.export',
  'data.erase',
  'settings.write',
  'team.manage',
  'audit.read',
  'consent.declareImportEvidence',
  'inbox.rules.write',
]);

export function can(user: Pick<AdminUser, 'role' | 'grants'>, capability: Capability): boolean {
  if (user.role === 'owner') return true;
  if (OWNER_ONLY.has(capability)) return false;
  if (TEAM_BASE.has(capability)) return true;
  return user.grants.some((g) => GRANT_CAPABILITIES[g]?.includes(capability));
}

export class PermissionDeniedError extends Error {
  constructor(
    readonly capability: Capability,
    readonly userId: AdminId,
  ) {
    super(`Permission denied: ${capability}`);
    this.name = 'PermissionDeniedError';
  }
}

export function assertCan(user: Pick<AdminUser, 'id' | 'role' | 'grants'>, capability: Capability): void {
  if (!can(user, capability)) throw new PermissionDeniedError(capability, user.id);
}

/** Every capability a user has, e.g. for building the navigation. */
export function capabilitiesOf(user: Pick<AdminUser, 'role' | 'grants'>): Capability[] {
  return CAPABILITIES.filter((c) => can(user, c));
}
