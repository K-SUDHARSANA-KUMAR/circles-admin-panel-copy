/**
 * Saving, switching on and off, and checking automations. Every change is versioned (with Gus's
 * plain-English note) and audited. An automation that wouldn't work can't be switched on.
 */
import { assertCan, type AdminUser } from '../access/permissions';
import { recordAudit } from '../audit/audit';
import type { CoreDeps } from '../deps';
import type { Automation, AutomationStep } from '../model/automation';
import type { Pipeline } from '../model/pipeline';
import type { Segment } from '../model/segment';
import type { Template } from '../model/template';
import { OWNER_ACTIONS, planTimedEntries } from './engine';
import { parseEditableAutomation } from './schema';

export class AutomationValidationError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join(' '));
    this.name = 'AutomationValidationError';
  }
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Every reason this automation wouldn't work, in plain English. Empty = fine. */
export function automationProblems(a: Automation, ctx: { templates: readonly Template[]; segments: readonly Segment[]; pipelines: readonly Pipeline[] }): string[] {
  const p: string[] = [];
  const t = a.trigger;
  if (!a.name.trim() || a.name.length > 80) p.push('Give it a name (up to 80 characters).');
  if (a.steps.length === 0) p.push('Add at least one step.');
  if (a.steps.length > 20) p.push('At most 20 steps.');
  if (new Set(a.steps.map((s) => s.id)).size !== a.steps.length) p.push('Two steps have the same id.');
  if (!a.steps.some((s) => s.kind === 'action')) p.push('Add at least one action (“Do”).');

  const segment = (id: string) => ctx.segments.some((s) => s.id === id);
  const pipeline = (id: string) => ctx.pipelines.find((x) => x.id === id);
  if (t.type === 'segment_joined' && !segment(t.segmentId)) p.push('The segment in “When” no longer exists.');
  if ((t.type === 'pipeline_stage_changed' || t.type === 'pipeline_no_reply') && !pipeline(t.pipelineId)) p.push('The pipeline in “When” no longer exists.');
  if (t.type === 'pipeline_stage_changed' && t.stageId && !pipeline(t.pipelineId)?.stages.some((s) => s.id === t.stageId)) p.push('The stage in “When” no longer exists.');
  if (t.type === 'pipeline_no_reply' && !(t.days >= 1 && t.days <= 90)) p.push('“No reply” must be between 1 and 90 days.');
  if (t.type === 'app_event' && t.event === 'inactive' && !((t.days ?? 21) >= 1 && (t.days ?? 21) <= 365)) p.push('Days without the app must be between 1 and 365.');
  if (t.type === 'date_field') {
    if (!(Math.abs(t.offsetDays) <= 365)) p.push('The date offset must be within a year.');
    if (t.atTime && !HHMM.test(t.atTime)) p.push('The time must look like 10:00.');
  }
  if (t.type === 'schedule') {
    if (!HHMM.test(t.time)) p.push('The time must look like 10:00.');
    if (t.every === 'week' && !(Number.isInteger(t.weekday ?? 2) && (t.weekday ?? 2) >= 0 && (t.weekday ?? 2) <= 6)) p.push('Pick a day of the week.');
    if (t.every === 'month' && !((t.dayOfMonth ?? 1) >= 1 && (t.dayOfMonth ?? 1) <= 28)) p.push('Day of the month must be 1 to 28.');
    if (t.segmentId && !segment(t.segmentId)) p.push('The audience segment no longer exists.');
  }
  const ownerOnlyRun = t.type === 'schedule' && !t.segmentId;

  a.steps.forEach((s: AutomationStep, i) => {
    const n = `Step ${i + 1}:`;
    if (s.kind === 'wait') {
      if (!(Number.isInteger(s.days ?? 0) && (s.days ?? 0) >= 0 && (s.days ?? 0) <= 365)) p.push(`${n} wait between 0 and 365 days.`);
      if (!(Number.isInteger(s.hours ?? 0) && (s.hours ?? 0) >= 0 && (s.hours ?? 0) <= 23)) p.push(`${n} hours must be 0 to 23.`);
      if (s.untilTime && !HHMM.test(s.untilTime)) p.push(`${n} the time must look like 10:00.`);
      return;
    }
    const act = s.action;
    if (a.draftOnly && !OWNER_ACTIONS.has(act.type)) p.push(`${n} this automation can only draft, create tasks or notify you. It can never send.`);
    if (ownerOnlyRun && !OWNER_ACTIONS.has(act.type)) p.push(`${n} a schedule with no audience can only draft, create tasks or notify you. Choose an audience to send to people.`);
    if (act.type === 'send_email' || act.type === 'send_push' || act.type === 'create_draft') {
      const tpl = ctx.templates.find((x) => x.id === act.templateId);
      const channel = act.type === 'send_push' ? 'push' : 'email';
      if (!tpl) p.push(`${n} choose a template.`);
      else if (tpl.channel !== channel) p.push(`${n} “${tpl.name}” is a ${tpl.channel === 'push' ? 'push notification' : 'email'} template.`);
      if (act.expiresAfterHours !== undefined && !(act.expiresAfterHours >= 1 && act.expiresAfterHours <= 24 * 30)) p.push(`${n} “skip if late” must be 1 hour to 30 days.`);
    }
    if ((act.type === 'create_task' || act.type === 'notify_owner') && (act.text ?? '').length > 200) p.push(`${n} keep the text under 200 characters.`);
    if (act.type === 'add_tag' && !(act.tag ?? '').trim()) p.push(`${n} type the tag to add.`);
    if (act.type === 'change_stage') {
      const pl = act.pipelineId ? pipeline(act.pipelineId) : undefined;
      if (!pl || !pl.stages.some((x) => x.id === act.stageId)) p.push(`${n} choose a pipeline and stage.`);
    }
  });

  if (a.reEntry.mode === 'every' && !(a.reEntry.days >= 1 && a.reEntry.days <= 365)) p.push('Repeat gap must be 1 to 365 days.');
  if (a.goal && !(a.goal.withinDays >= 1 && a.goal.withinDays <= 365)) p.push('The goal window must be 1 to 365 days.');
  return p;
}

type ManageDeps = CoreDeps;

async function context(deps: ManageDeps) {
  return { templates: await deps.templates.list(), segments: await deps.segments.list(), pipelines: await deps.pipelines.list() };
}

function guard(admin: AdminUser, a: Automation) {
  assertCan(admin, 'automations.write');
  if (a.category === 'investors') assertCan(admin, 'pipelines.investors');
}

const snapshot = ({ stats: _s, ...rest }: Automation) => rest;

/** Switch on or off. On: checked first, and date/schedule moments from now are planned straight away. */
export async function setAutomationEnabled(deps: ManageDeps, admin: AdminUser, id: string, enabled: boolean): Promise<Automation> {
  const before = await deps.automations.get(id);
  if (!before) throw new AutomationValidationError(['That automation doesn’t exist.']);
  guard(admin, before);
  if (enabled) {
    const problems = automationProblems(before, await context(deps));
    if (problems.length) throw new AutomationValidationError(problems);
  }
  const now = deps.clock.now().toISOString();
  const next: Automation = { ...before, enabled, ...(enabled ? { enabledAt: now } : {}), updatedAt: now, updatedBy: admin.id };
  await deps.automations.save(next);
  await deps.automations.addVersion({ automationId: id, version: next.version, savedAt: now, savedBy: admin.name, change: enabled ? 'Switched on' : 'Switched off', snapshot: snapshot(next) });
  await recordAudit(deps, { actor: `admin:${admin.id}`, action: enabled ? 'automation.enable' : 'automation.disable', target: `crmAutomations/${id}`, before: { enabled: before.enabled }, after: { enabled } });
  if (enabled) await planTimedEntries(deps, { automationId: id });
  return next;
}

/**
 * Save an edited automation as a new version. On/off, stats, category and draft-only can't be
 * changed this way (on/off has its own audited switch; draft-only can never be turned off).
 */
export async function saveAutomation(deps: ManageDeps, admin: AdminUser, edited: Automation, change: string): Promise<Automation> {
  const before = await deps.automations.get(edited.id);
  if (!before) throw new AutomationValidationError(['That automation doesn’t exist.']);
  guard(admin, before);
  const parsed = parseEditableAutomation(edited);
  if (!parsed.ok) throw new AutomationValidationError(parsed.problems);
  const now = deps.clock.now().toISOString();
  const { goal: _g, ...beforeRest } = before;
  const next: Automation = {
    ...beforeRest,
    ...parsed.value,
    id: before.id,
    category: before.category,
    draftOnly: before.draftOnly,
    enabled: before.enabled,
    ...(before.enabledAt ? { enabledAt: before.enabledAt } : {}),
    stats: before.stats,
    version: before.version + 1,
    updatedAt: now,
    updatedBy: admin.id,
  };
  const problems = automationProblems(next, await context(deps));
  if (problems.length) throw new AutomationValidationError(problems);
  const note = change.trim().slice(0, 200) || 'Edited';
  await deps.automations.save(next);
  await deps.automations.addVersion({ automationId: next.id, version: next.version, savedAt: now, savedBy: admin.name, change: note, snapshot: snapshot(next) });
  await recordAudit(deps, { actor: `admin:${admin.id}`, action: 'automation.update', target: `crmAutomations/${next.id}`, before: snapshot(before), after: snapshot(next) });
  if (next.enabled) await planTimedEntries(deps, { automationId: next.id });
  return next;
}
