/**
 * Gus's side of the inbox agent: undo, rules, approved answers, settings. Every change is audited.
 *
 * Undo works for labels, drafts, tasks, follow-up dates, alerts and new contacts. A text or a sent
 * reply can't be unsent, so undo offers a ready-made correction draft instead.
 */
import { assertCan, type AdminUser } from '../access/permissions';
import { recordAudit } from '../audit/audit';
import type { CoreDeps } from '../deps';
import type { AgentAction, AiSettings, InboxRule, InboxSettings } from '../model/inbox';
import { ROUTINE_TOPICS } from '../model/inbox';
import type { AnswerTemplate } from '../model/template';
import { parseRule } from './aiOutput';

export class InboxSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InboxSettingsError';
  }
}

export type UndoResult = { undone: true; description: string } | { undone: false; reason: string; correctionDraftId?: string };

export async function undoAgentAction(deps: CoreDeps, admin: AdminUser, actionId: string): Promise<UndoResult> {
  assertCan(admin, 'inbox.read');
  const action = await deps.agentLog.get(actionId);
  if (!action) return { undone: false, reason: 'Not found' };
  if (action.undoneAt) return { undone: false, reason: 'Already undone' };
  const now = deps.clock.now().toISOString();
  const t = action.target;
  let description: string;

  if (t?.kind === 'reply') {
    // Can't unsend. Offer a correction for Gus to edit and send himself.
    const message = await deps.inbox.get(action.messageId);
    if (!message) return { undone: false, reason: 'Message not found' };
    const draftId = `dr_fix_${action.id}`;
    if (!(await deps.drafts.get(draftId))) {
      const text = `Hi ${message.from.name.split(/\s+/)[0] || 'there'},\n\nSorry, please ignore my last email: it went out before I'd checked it. I'll come back to you properly shortly.\n\nGus`;
      const gmailDraftId = await deps.mailbox.createDraft({ threadId: message.threadId, to: message.from.email, subject: `Re: ${message.subject}`, text });
      await deps.drafts.save({ id: draftId, source: 'inbox_agent', ...(message.contactId ? { contactId: message.contactId } : {}), to: message.from.email, subject: `Re: ${message.subject}`, text, status: 'open', gmailDraftId, ownerOnly: true, createdAt: now });
    }
    return { undone: false, reason: 'A sent email can’t be unsent. A correction is waiting in your drafts.', correctionDraftId: draftId };
  }
  if (!action.undoable || !t) return { undone: false, reason: 'This one can’t be undone' };

  switch (t.kind) {
    case 'label':
      await deps.mailbox.removeLabels(t.id, (t.before ?? '').split('|').filter(Boolean));
      description = 'Removed the labels';
      break;
    case 'draft': {
      const draft = await deps.drafts.get(t.id);
      if (draft?.gmailDraftId && draft.status === 'open') await deps.mailbox.deleteDraft(draft.gmailDraftId);
      if (draft) await deps.drafts.save({ ...draft, status: 'discarded' });
      description = 'Deleted the draft';
      break;
    }
    case 'task': {
      const task = await deps.tasks.get(t.id);
      if (task && task.status === 'open') await deps.tasks.save({ ...task, status: 'done', completedAt: now, title: `${task.title} (undone)` });
      description = 'Removed the task';
      break;
    }
    case 'follow_up': {
      const c = await deps.contacts.get(t.id);
      if (c) {
        const { nextFollowUpAt: _n, ...rest } = c;
        await deps.contacts.save({ ...rest, ...(t.before ? { nextFollowUpAt: t.before } : {}), updatedAt: now });
      }
      description = 'Put the follow-up date back';
      break;
    }
    case 'alert': {
      const alert = await deps.alerts.get(t.id);
      if (alert && !alert.acknowledgedAt) await deps.alerts.save({ ...alert, acknowledgedAt: now });
      description = alert?.smsSentAt ? 'Cleared the alert (the text was already sent)' : 'Cleared the alert';
      break;
    }
    case 'contact': {
      const c = await deps.contacts.get(t.id);
      const hasHistory = c && ((await deps.sendLog.listForContact(c.id)).length > 0 || (await deps.tasks.listForContact(c.id)).some((x) => x.createdBy !== 'system:inbox-agent'));
      if (hasHistory) return { undone: false, reason: 'They’ve been used since, so the contact stays. Merge or delete them from Contacts.' };
      if (c) {
        await deps.timeline.deleteForContact(c.id);
        await deps.contacts.delete(c.id);
      }
      description = 'Removed the new contact';
      break;
    }
    default:
      return { undone: false, reason: 'This one can’t be undone' };
  }
  const updated: AgentAction = { ...action, undoneAt: now, undoneBy: admin.id };
  await deps.agentLog.save(updated);
  await recordAudit(deps, { actor: `admin:${admin.id}`, action: 'inbox.undo', target: `crmAgentActions/${action.id}`, before: { kind: action.kind }, after: { undone: true } });
  return { undone: true, description };
}

// ---- Rules -------------------------------------------------------------------------------------

/** Turn Gus's plain-English rule into a precise one, for him to confirm. Nothing is saved yet. */
export async function understandRule(deps: CoreDeps, text: string): Promise<Pick<InboxRule, 'match' | 'category' | 'understood'> | undefined> {
  const trimmed = text.trim().slice(0, 300);
  if (!trimmed) return undefined;
  const ai = await deps.settings.getAi();
  const organisations = await deps.organisations.list();
  const pipelines = await deps.pipelines.list();
  let raw: unknown;
  try {
    raw = await deps.ai.understandRule(trimmed, { organisations: organisations.map((o) => o.name), pipelines: pipelines.map((p) => p.name) }, ai);
  } catch {
    return undefined;
  }
  return parseRule(raw, {
    orgId: (name) => organisations.find((o) => o.name.toLowerCase() === name.trim().toLowerCase())?.id,
    pipelineId: (name) => pipelines.find((p) => p.name.toLowerCase() === name.trim().toLowerCase() || p.id === name.trim().toLowerCase())?.id,
  });
}

const PHONE = /^\+[1-9]\d{7,14}$/;

/** Inbox → Rules, routine modes, threshold, alert phone, digest time. Owner only. */
export async function saveInboxSettings(deps: CoreDeps, admin: AdminUser, next: InboxSettings): Promise<InboxSettings> {
  assertCan(admin, 'inbox.rules.write');
  if (!(next.confidenceThreshold >= 0.7 && next.confidenceThreshold <= 0.99)) throw new InboxSettingsError('Auto-reply confidence must be between 70% and 99%.');
  if (![24, 48, 72].includes(next.deadlineHours)) throw new InboxSettingsError('Deadline window must be 24, 48 or 72 hours.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(next.dailyDigestTime)) throw new InboxSettingsError('Digest time must look like 08:00.');
  if (next.alertPhone && !PHONE.test(next.alertPhone)) throw new InboxSettingsError('Use the full number with country code, e.g. +447700900123.');
  if (next.rules.length > 200) throw new InboxSettingsError('Too many rules.');
  for (const t of ROUTINE_TOPICS) if (next.routineModes[t.id] !== 'draft' && next.routineModes[t.id] !== 'auto') throw new InboxSettingsError('Unknown routine mode.');
  const before = await deps.settings.getInbox();
  await deps.settings.saveInbox(next);
  // The phone number is personal data: audit that it changed, not what it is.
  const redact = (s: InboxSettings) => ({ ...s, alertPhone: s.alertPhone ? 'set' : 'not set' });
  await recordAudit(deps, { actor: `admin:${admin.id}`, action: 'inbox.settings.update', target: 'crmSettings/inbox', before: redact(before), after: redact(next) });
  return next;
}

/** Settings → AI: on/off, models, prompts, voice. Owner only. Prompt edits bump the version. */
export async function saveAiSettings(deps: CoreDeps, admin: AdminUser, next: AiSettings): Promise<AiSettings> {
  assertCan(admin, 'settings.write');
  const before = await deps.settings.getAi();
  for (const [k, v] of Object.entries(next.prompts)) if (typeof v !== 'string' || v.length < 20 || v.length > 8000) throw new InboxSettingsError(`The ${k} prompt must be 20 to 8,000 characters.`);
  if (!/^claude-[a-z0-9-]+$/.test(next.classifyModel) || !/^claude-[a-z0-9-]+$/.test(next.draftModel)) throw new InboxSettingsError('Model names look like claude-haiku-4-5.');
  const promptsChanged = JSON.stringify(before.prompts) !== JSON.stringify(next.prompts) || before.voice !== next.voice;
  const saved = { ...next, promptVersion: before.promptVersion + (promptsChanged ? 1 : 0) };
  await deps.settings.saveAi(saved);
  await recordAudit(deps, { actor: `admin:${admin.id}`, action: 'ai.settings.update', target: 'crmSettings/ai', before, after: saved });
  return saved;
}

/** Approve (or edit) an answer the agent may send automatically. Owner only. */
export async function saveAnswerTemplate(deps: CoreDeps, admin: AdminUser, input: Pick<AnswerTemplate, 'id' | 'category' | 'name' | 'answers' | 'body'>, approve: boolean): Promise<AnswerTemplate> {
  assertCan(admin, 'inbox.rules.write');
  if (!ROUTINE_TOPICS.some((t) => t.id === input.category)) throw new InboxSettingsError('Unknown kind of question.');
  if (!input.body.trim() || input.body.length > 3000) throw new InboxSettingsError('The answer must be 1 to 3,000 characters.');
  if (/\{(?!first_name\})[a-z_]+\}/.test(input.body)) throw new InboxSettingsError('Approved answers can only use {first_name}.');
  const before = await deps.answers.get(input.id);
  const now = deps.clock.now().toISOString();
  const changed = !before || before.body !== input.body;
  const next: AnswerTemplate = {
    ...input,
    version: (before?.version ?? 0) + (changed ? 1 : 0),
    // Editing the wording withdraws approval until Gus approves the new version.
    approvedBy: approve ? admin.id : changed ? '' : (before?.approvedBy ?? ''),
    approvedAt: approve ? now : changed ? '' : (before?.approvedAt ?? ''),
  };
  await deps.answers.save(next);
  await recordAudit(deps, { actor: `admin:${admin.id}`, action: approve ? 'inbox.answer.approve' : 'inbox.answer.update', target: `crmAnswerTemplates/${next.id}`, ...(before ? { before } : {}), after: next });
  return next;
}

/** Mark an email dealt with (or not). */
export async function setMessageStatus(deps: CoreDeps, admin: AdminUser, messageId: string, status: 'done' | 'waiting_for_you'): Promise<void> {
  assertCan(admin, 'inbox.read');
  const m = await deps.inbox.get(messageId);
  if (m && m.status !== 'queued') await deps.inbox.save({ ...m, status });
}
