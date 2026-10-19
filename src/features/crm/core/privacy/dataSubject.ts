/**
 * Subject access (export) and erasure: everything the CRM holds on one person.
 *
 * Each kind of personal data is a "part" with an export and an erase function. Later modules
 * (tasks, notes, inbox messages, Luma registrations, agent actions) register their own parts,
 * so nothing can be added to the CRM without also being covered here.
 *
 * Erasure keeps exactly one thing: one-way hashes on the suppression list, so the person is
 * never re-added to marketing by mistake. It does not touch the app account or Gmail.
 */
import { assertCan, type AdminUser } from '../access/permissions';
import { recordAudit } from '../audit/audit';
import { identifiersFor, suppress } from '../consent/suppression';
import type { CoreDeps } from '../deps';
import type { ContactId } from '../model/common';

export interface DataSubjectPart {
  /** File name in the export, e.g. "consent-history". */
  name: string;
  export(contactId: ContactId): Promise<unknown>;
  erase(contactId: ContactId): Promise<void>;
}

type PrivacyDeps = Pick<CoreDeps, 'clock' | 'ids' | 'hasher' | 'audit' | 'contacts' | 'consentLedger' | 'timeline' | 'sendLog' | 'suppression' | 'logger' | 'automationRuns' | 'inbox' | 'agentLog' | 'drafts' | 'alerts'>;

/** The parts this module knows about. Callers append parts from other modules. */
export function coreDataSubjectParts(deps: PrivacyDeps): DataSubjectPart[] {
  return [
    {
      name: 'consent-history',
      export: (id) => deps.consentLedger.listForContact(id),
      erase: (id) => deps.consentLedger.deleteForContact(id),
    },
    {
      name: 'timeline',
      export: (id) => deps.timeline.listForContact(id),
      erase: (id) => deps.timeline.deleteForContact(id),
    },
    {
      name: 'messages-sent',
      export: (id) => deps.sendLog.listForContact(id),
      erase: (id) => deps.sendLog.deleteForContact(id),
    },
    {
      name: 'automations',
      export: (id) => deps.automationRuns.listForContact(id),
      erase: (id) => deps.automationRuns.deleteForContact(id),
    },
    {
      // What the inbox agent recorded about their emails (summaries and actions, not the emails,
      // which stay in Gmail: deleting those is a separate step in Gmail itself).
      name: 'emails-received',
      export: async (id) => {
        const messages = await deps.inbox.listForContact(id);
        return Promise.all(messages.map(async (m) => ({ ...m, agentActions: await deps.agentLog.listForMessage(m.id) })));
      },
      erase: async (id) => {
        for (const m of await deps.inbox.listForContact(id)) await deps.agentLog.deleteForMessage(m.id);
        await deps.inbox.deleteForContact(id);
      },
    },
    {
      name: 'draft-replies',
      export: (id) => deps.drafts.listForContact(id),
      erase: (id) => deps.drafts.deleteForContact(id),
    },
    {
      name: 'alerts',
      export: (id) => deps.alerts.listForContact(id),
      erase: (id) => deps.alerts.deleteForContact(id),
    },
  ];
}

export interface SubjectAccessExport {
  generatedAt: string;
  contactId: ContactId;
  /** File name → contents. Written to a zip with a 7-day download link by the Firebase layer. */
  files: Record<string, unknown>;
  notes: string[];
}

export async function exportContactData(
  deps: PrivacyDeps,
  admin: AdminUser,
  contactId: ContactId,
  extraParts: DataSubjectPart[] = [],
): Promise<SubjectAccessExport> {
  assertCan(admin, 'data.export');
  const contact = await deps.contacts.get(contactId);
  if (!contact) throw new Error('Contact not found');
  const files: Record<string, unknown> = { contact };
  for (const part of [...coreDataSubjectParts(deps), ...extraParts]) files[part.name] = await part.export(contactId);
  await recordAudit(deps, { actor: `admin:${admin.id}`, action: 'data.export', target: `crmContacts/${contactId}` });
  deps.logger.info('privacy.exported', { contactId, adminId: admin.id });
  return {
    generatedAt: deps.clock.now().toISOString(),
    contactId,
    files,
    notes: [
      'This is everything the CRM holds. App profile data (friends, plans, subscription) is held by the app itself and is exported from the app.',
      'Email contents are not stored in the CRM; they stay in the Gmail inbox they were sent to.',
    ],
  };
}

export async function eraseContact(
  deps: PrivacyDeps,
  admin: AdminUser,
  contactId: ContactId,
  extraParts: DataSubjectPart[] = [],
): Promise<{ erased: true; suppressionEntries: number }> {
  assertCan(admin, 'data.erase');
  const contact = await deps.contacts.get(contactId);
  if (!contact) throw new Error('Contact not found');
  // Suppress first, so nothing can be sent to them while the rest is being deleted.
  const entries = await suppress(identifiersFor(contact), 'erasure', `admin:${admin.id}`, deps);
  for (const part of [...extraParts, ...coreDataSubjectParts(deps)]) await part.erase(contactId);
  await deps.contacts.delete(contactId);
  // The audit entry records that an erasure happened, by whom and when — not who the person was.
  await recordAudit(deps, { actor: `admin:${admin.id}`, action: 'data.erase', target: `crmContacts/${contactId}` });
  deps.logger.warn('privacy.erased', { contactId, adminId: admin.id });
  return { erased: true, suppressionEntries: entries.length };
}
