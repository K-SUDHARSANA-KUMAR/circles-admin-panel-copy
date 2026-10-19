/**
 * Follow-up rules and the Overdue list.
 *
 * Per pipeline: if there's no reply N days after the last email, create a task for the owner
 * (default) or — only where Gus has switched auto-send on — send a follow-up from a template, up to
 * a maximum. It stops as soon as they reply. Each "no reply" cycle produces at most one action,
 * keyed on the item and the time of the last email, so running it twice never doubles up.
 */
import type { CoreDeps } from '../deps';
import type { Contact } from '../model/contact';
import type { Pipeline, PipelineItem, Task } from '../model/pipeline';
import { send } from '../sending/sendService';
import { renderTemplate, variablesFor } from '../templates/render';

const DAY = 86_400_000;

export interface FollowUpDue {
  item: PipelineItem;
  pipeline: Pipeline;
  action: 'create_task' | 'send_template';
  daysWaiting: number;
  /** Stable per no-reply cycle: the item plus the time of the last email. */
  occasion: string;
}

/** Shared with the automation engine, so a "no reply" automation and this rule never create two tasks. */
export const followUpTaskId = (occasion: string) => `fu_${occasion.replace(/[^A-Za-z0-9]/g, '')}`;
export const followUpOccasion = (item: Pick<PipelineItem, 'id' | 'lastOutboundAt'>) => `${item.id}@${item.lastOutboundAt}`;

export function hasReplied(item: Pick<PipelineItem, 'lastOutboundAt' | 'lastReplyAt'>): boolean {
  return !!item.lastReplyAt && (!item.lastOutboundAt || item.lastReplyAt >= item.lastOutboundAt);
}

export function dueFollowUps(items: readonly PipelineItem[], pipelines: readonly Pipeline[], now: Date): FollowUpDue[] {
  const out: FollowUpDue[] = [];
  for (const item of items) {
    const pipeline = pipelines.find((p) => p.id === item.pipelineId);
    if (!pipeline?.followUp.enabled || !item.lastOutboundAt) continue;
    if (pipeline.stages.find((s) => s.id === item.stageId)?.outcome) continue;
    if (hasReplied(item)) continue;
    const waited = (now.getTime() - Date.parse(item.lastOutboundAt)) / DAY;
    if (waited < pipeline.followUp.noReplyDays) continue;
    const f = pipeline.followUp;
    const autoSend = f.action === 'send_template' && f.autoSendApproved && !!f.templateId && item.followUpsSent < f.maxFollowUps;
    out.push({ item, pipeline, action: autoSend ? 'send_template' : 'create_task', daysWaiting: Math.floor(waited), occasion: followUpOccasion(item) });
  }
  return out;
}

type FollowUpDeps = Pick<
  CoreDeps,
  | 'clock'
  | 'ids'
  | 'hasher'
  | 'signer'
  | 'logger'
  | 'config'
  | 'contacts'
  | 'organisations'
  | 'suppression'
  | 'sendLog'
  | 'killSwitches'
  | 'settings'
  | 'timeline'
  | 'email'
  | 'push'
  | 'pushTokens'
  | 'pipelines'
  | 'pipelineItems'
  | 'tasks'
  | 'templates'
>;

export interface FollowUpRun {
  tasksCreated: number;
  emailsSent: number;
  notes: string[];
}

export async function runFollowUps(deps: FollowUpDeps): Promise<FollowUpRun> {
  const now = deps.clock.now();
  const run: FollowUpRun = { tasksCreated: 0, emailsSent: 0, notes: [] };
  const due = dueFollowUps(await deps.pipelineItems.list(), await deps.pipelines.list(), now);
  for (const d of due) {
    const contact = d.item.contactId ? await deps.contacts.get(d.item.contactId) : undefined;
    const org = d.item.orgId ? await deps.organisations.get(d.item.orgId) : contact?.orgIds[0] ? await deps.organisations.get(contact.orgIds[0]) : undefined;
    const who = org?.name ?? (contact ? `${contact.name.first} ${contact.name.last ?? ''}`.trim() : d.item.title);

    if (d.action === 'send_template' && contact) {
      const template = await deps.templates.get(d.pipeline.followUp.templateId!);
      const rendered = template ? renderTemplate(template, variablesFor(contact, { ...(org ? { orgName: org.name } : {}), campaign: `followup-${d.pipeline.id}` })) : undefined;
      if (template && rendered?.email && rendered.missing.length === 0) {
        const result = await send(deps, {
          contactId: contact.id,
          channel: 'email',
          messageClass: template.messageClass,
          templateId: template.id,
          templateVersion: template.version,
          automationId: `followup-${d.pipeline.id}`,
          stepId: 'follow-up',
          occasion: d.occasion,
          email: rendered.email,
        });
        if (result.status === 'sent' || result.status === 'duplicate') {
          if (result.status === 'sent') {
            run.emailsSent += 1;
            await deps.pipelineItems.save({ ...d.item, lastOutboundAt: now.toISOString(), followUpsSent: d.item.followUpsSent + 1, updatedAt: now.toISOString() });
          }
          continue;
        }
        run.notes.push(`Follow-up to ${who} not sent (${result.status === 'blocked' ? result.explanation : result.status}); created a task instead`);
      }
    }

    // Default: a task for the owner. Deterministic id, so a second run doesn't duplicate it.
    const taskId = followUpTaskId(d.occasion);
    if (await deps.tasks.get(taskId)) continue;
    const task: Task = {
      id: taskId,
      title: `Follow up with ${who}: no reply in ${d.daysWaiting} days`,
      dueAt: now.toISOString(),
      ...(d.item.ownerId ? { assigneeId: d.item.ownerId } : {}),
      ...(contact ? { contactId: contact.id } : {}),
      ...(d.item.orgId ? { orgId: d.item.orgId } : {}),
      pipelineItemId: d.item.id,
      source: 'follow_up_rule',
      status: 'open',
      createdBy: 'system:follow-ups',
      createdAt: now.toISOString(),
      ownerOnly: d.item.ownerOnly,
    };
    await deps.tasks.save(task);
    run.tasksCreated += 1;
    if (!d.item.nextFollowUpAt || d.item.nextFollowUpAt > now.toISOString()) await deps.pipelineItems.save({ ...d.item, nextFollowUpAt: now.toISOString(), updatedAt: now.toISOString() });
    if (contact) await deps.timeline.append({ id: deps.ids.next('tl'), contactId: contact.id, kind: 'task', summary: `Follow-up task created: no reply in ${d.daysWaiting} days (${d.pipeline.name})`, at: now.toISOString(), actor: 'system:follow-ups', ownerOnly: contact.ownerOnly });
  }
  deps.logger.info('followups.run', { due: due.length, tasksCreated: run.tasksCreated, emailsSent: run.emailsSent });
  return run;
}

type ContactActivityDeps = Pick<CoreDeps, 'clock' | 'ids' | 'contacts' | 'pipelineItems' | 'timeline'>;

/** They replied: stop follow-ups on every relationship with them, and reset the count. */
export async function recordReply(deps: ContactActivityDeps, contactId: string, at: string): Promise<void> {
  const c = await deps.contacts.get(contactId);
  if (!c) return;
  if (!c.lastReplyAt || at > c.lastReplyAt) await deps.contacts.save({ ...c, lastReplyAt: at, updatedAt: deps.clock.now().toISOString() });
  for (const item of (await deps.pipelineItems.list()).filter((i) => i.contactId === contactId)) {
    if (!item.lastReplyAt || at > item.lastReplyAt) await deps.pipelineItems.save({ ...item, lastReplyAt: at, followUpsSent: 0, updatedAt: deps.clock.now().toISOString() });
  }
}

/** You emailed them (from Gmail or the CRM): starts a new no-reply clock. */
export async function recordOutbound(deps: ContactActivityDeps, contactId: string, at: string): Promise<void> {
  const c = await deps.contacts.get(contactId);
  if (!c) return;
  if (!c.lastContactedAt || at > c.lastContactedAt) await deps.contacts.save({ ...c, lastContactedAt: at, updatedAt: deps.clock.now().toISOString() });
  for (const item of (await deps.pipelineItems.list()).filter((i) => i.contactId === contactId)) {
    if (!item.lastOutboundAt || at > item.lastOutboundAt) await deps.pipelineItems.save({ ...item, lastOutboundAt: at, updatedAt: deps.clock.now().toISOString() });
  }
}

// ---------------------------------------------------------------------------------------
// Overdue

export interface OverdueRow {
  key: string;
  kind: 'contact' | 'item';
  title: string;
  sub: string;
  dueAt: string;
  daysOverdue: number;
  contact?: Contact;
  item?: PipelineItem;
  pipeline?: Pipeline;
}

/**
 * Every relationship whose follow-up date has passed: pipeline cards (not in a closed stage) and
 * contacts with a follow-up date who aren't already represented by a card. Oldest first.
 */
export function overdueRelationships(contacts: readonly Contact[], items: readonly PipelineItem[], pipelines: readonly Pipeline[], now: Date): OverdueRow[] {
  const rows: OverdueRow[] = [];
  const byId = new Map(contacts.map((c) => [c.id, c]));
  const covered = new Set<string>();
  for (const item of items) {
    const pipeline = pipelines.find((p) => p.id === item.pipelineId);
    if (!pipeline || !item.nextFollowUpAt) continue;
    const stage = pipeline.stages.find((s) => s.id === item.stageId);
    if (stage?.outcome) continue;
    const due = Date.parse(item.nextFollowUpAt);
    if (due > now.getTime()) continue;
    const contact = item.contactId ? byId.get(item.contactId) : undefined;
    if (item.contactId) covered.add(item.contactId);
    rows.push({ key: item.id, kind: 'item', title: item.title, sub: `${pipeline.name} · ${stage?.name ?? ''}`, dueAt: item.nextFollowUpAt, daysOverdue: Math.floor((now.getTime() - due) / DAY), item, pipeline, ...(contact ? { contact } : {}) });
  }
  for (const c of contacts) {
    if (c.mergedInto || !c.nextFollowUpAt || covered.has(c.id)) continue;
    const due = Date.parse(c.nextFollowUpAt);
    if (due > now.getTime()) continue;
    rows.push({ key: c.id, kind: 'contact', title: `${c.name.first} ${c.name.last ?? ''}`.trim(), sub: c.jobTitle ?? '', dueAt: c.nextFollowUpAt, daysOverdue: Math.floor((now.getTime() - due) / DAY), contact: c });
  }
  return rows.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}
