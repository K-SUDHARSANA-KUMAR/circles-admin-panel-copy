/**
 * Shared primitives for the CRM data model.
 *
 * Dates are ISO-8601 strings in UTC throughout the core. Adapters convert to and from
 * their storage format (e.g. Firestore Timestamps) at the boundary, so the rules here
 * never depend on a particular database.
 */

/** ISO-8601 timestamp in UTC, e.g. "2026-10-06T08:00:00.000Z". */
export type IsoDateTime = string;

export type ContactId = string;
export type OrganisationId = string;
export type AdminId = string;
export type AppUserId = string;
export type TemplateId = string;
export type AutomationId = string;

/** Who performed an action: an admin, or the system itself (automation, webhook, agent). */
export type Actor =
  | { kind: 'admin'; id: AdminId }
  | { kind: 'system'; component: string }
  | { kind: 'contact'; id: ContactId };

export const systemActor = (component: string): Actor => ({ kind: 'system', component });

export function actorLabel(actor: Actor): string {
  switch (actor.kind) {
    case 'admin':
      return `admin:${actor.id}`;
    case 'system':
      return `system:${actor.component}`;
    case 'contact':
      return `contact:${actor.id}`;
  }
}

export function toIso(date: Date): IsoDateTime {
  return date.toISOString();
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}
