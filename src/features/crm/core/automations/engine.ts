/**
 * The automation engine: When → If → Wait → Do.
 *
 * How it runs
 *   - Events (the app, RevenueCat, Luma, pipeline moves, the inbox) produce TriggerSignals.
 *     enterFromSignals() starts a run for every switched-on automation they match, and can process
 *     each new run straight away (so "Application received" goes out at once).
 *   - The nightly job calls planTimedEntries() for the triggers that depend on the clock: dates
 *     ("7 days before the free months end, at 10:00"), "hasn't opened the app for 21 days", "no
 *     reply in a pipeline" and schedules ("every Tuesday at 10:00"). It creates runs whose first
 *     step is due at that moment, so the frequent tick never has to scan every contact.
 *   - A tick every few minutes calls processDueRuns(): it leases each due run and moves it on.
 *
 * Safety
 *   - Every message goes through send(), so consent, unsubscribe, suppression, the weekly limit,
 *     quiet hours and Pause all sending apply at the moment it goes, not when the run started.
 *   - Run ids come from automation + person + occasion, and send keys from run + step, so a repeated
 *     trigger, a retried tick or two overlapping workers can never send the same thing twice.
 *   - The "If" is checked on entry and again before every action. Someone who says no to marketing
 *     leaves as soon as only marketing is left to send (service messages still reach them).
 *     Switching an automation off
 *     stops everyone in it at their next step. Pause all sending holds every run where it is;
 *     marketing that would end up more than 2 days late is skipped rather than sent late.
 *   - Rate limited per tick: anything over the limit waits for the next tick.
 *   - Draft-only automations (the investor update) can never send, whatever their steps say.
 */
import type { CoreDeps } from '../deps';
import { sha256Hex } from '../crypto';
import { suppressedScopesFor } from '../consent/suppression';
import type { TriggerSignal } from '../events/ingest';
import { followUpOccasion, followUpTaskId, hasReplied } from '../pipelines/followUps';
import { reportProblem } from '../audit/problems';
import { send } from '../sending/sendService';
import { addLocalDays, parseHHMM, resolveTimeZone, zonedParts, zonedWallTimeToUtc } from '../sending/timezone';
import { evaluateGroup, membersOf } from '../segments/evaluate';
import { renderTemplate, variablesFor, type Variables } from '../templates/render';
import { isClosed, type Contact } from '../model/contact';
import { OWNER_RUN, type Automation, type AutomationAction, type AutomationRun, type AutomationStep, type DateField, type ExitReason, type Trigger } from '../model/automation';
import type { Template } from '../model/template';

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const iso = (t: Date | number) => new Date(t).toISOString();
const MAX_HISTORY = 30;

/** "Wed 7 Oct, 09:00" in their time zone (London if unknown), for the run history Gus reads. */
export function whenLabel(date: Date, timeZone = 'Europe/London'): string {
  const d = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone }).format(date);
  const t = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date);
  return `${d}, ${t}`;
}

export type EngineDeps = CoreDeps;

export async function runIdFor(automationId: string, contactId: string, occasion: string): Promise<string> {
  return `run_${(await sha256Hex(`${automationId}|${contactId}|${occasion}`)).slice(0, 32)}`;
}

const hashId = async (prefix: string, ...parts: string[]) => `${prefix}_${(await sha256Hex(parts.join('|'))).slice(0, 24)}`;

/** Actions that don't message anyone: the only ones a draft-only automation or a "just me" schedule may use. */
export const OWNER_ACTIONS: ReadonlySet<AutomationAction['type']> = new Set(['create_draft', 'create_task', 'notify_owner']);

// ---------------------------------------------------------------------------------------
// Entry

export interface Skipped {
  automationId: string;
  contactId: string;
  why: 'off' | 'contact_gone' | 'conditions' | 'exit_condition' | 'already_in_it' | 'once_only' | 'too_soon' | 'no_steps' | 'duplicate';
}

export interface EntryResult {
  entered: AutomationRun[];
  skipped: Skipped[];
}

interface EntryOptions {
  firstDueAt: Date;
  segmentId?: string;
  pipelineItemId?: string;
}

async function tryEnter(deps: EngineDeps, a: Automation, contactId: string, occasion: string, options: EntryOptions, now: Date): Promise<AutomationRun | Skipped['why']> {
  if (!a.enabled) return 'off';
  let ownerOnly = contactId === OWNER_RUN || a.category === 'investors';
  if (contactId !== OWNER_RUN) {
    const c = await deps.contacts.get(contactId);
    ownerOnly ||= !!c?.ownerOnly;
    if (!c || c.mergedInto || isClosed(c)) return 'contact_gone';
    if (!evaluateGroup(c, a.conditions, now)) return 'conditions';
    if (a.exitWhen.conditions.length > 0 && evaluateGroup(c, a.exitWhen, now)) return 'exit_condition';
  }
  const previous = (await deps.automationRuns.listForContact(contactId)).filter((r) => r.automationId === a.id);
  if (previous.some((r) => r.status === 'active' || r.status === 'waiting')) return 'already_in_it';
  if (a.reEntry.mode === 'once' && previous.length > 0) return 'once_only';
  if (a.reEntry.mode === 'every') {
    const last = previous.reduce((m, r) => Math.max(m, Date.parse(r.enteredAt)), 0);
    if (last && now.getTime() - last < a.reEntry.days * DAY) return 'too_soon';
  }
  const first = a.steps[0];
  if (!first) return 'no_steps';
  const due = options.firstDueAt.getTime() > now.getTime() ? options.firstDueAt : now;
  const run: AutomationRun = {
    id: await runIdFor(a.id, contactId, occasion),
    automationId: a.id,
    automationVersion: a.version,
    contactId,
    occasion,
    ownerOnly,
    triggeredBy: a.trigger.type,
    ...(options.segmentId ? { segmentId: options.segmentId } : {}),
    ...(options.pipelineItemId ? { pipelineItemId: options.pipelineItemId } : {}),
    stepId: first.id,
    stepIndex: 0,
    stepDueAt: iso(due),
    attempts: 0,
    status: due > now ? 'waiting' : 'active',
    nextAt: iso(due),
    history: [{ at: iso(now), stepId: 'start', outcome: due > now ? `Queued for ${whenLabel(due)}` : 'Started' }],
    enteredAt: iso(now),
    updatedAt: iso(now),
  };
  if (!(await deps.automationRuns.create(run))) return 'duplicate';
  await deps.automations.bumpStats(a.id, { entered: 1 });
  return run;
}

function signalMatches(t: Trigger, s: TriggerSignal): boolean {
  switch (s.kind) {
    case 'app_event':
      return t.type === 'app_event' && t.event === s.event && t.event !== 'inactive';
    case 'subscription_event':
      return t.type === 'subscription_event' && t.event === s.event;
    case 'segment_joined':
      return t.type === 'segment_joined' && t.segmentId === s.segmentId;
    case 'pipeline_stage_changed':
      return t.type === 'pipeline_stage_changed' && t.pipelineId === s.pipelineId && (!t.stageId || t.stageId === s.stageId);
    case 'inbound_email':
      return t.type === 'inbound_email_category' && t.category === s.category;
    default:
      return false;
  }
}

/**
 * Start runs for every switched-on automation these signals match. With processNow, each new run
 * is moved on straight away (subject to the same rate limit and pause as the tick).
 */
export async function enterFromSignals(deps: EngineDeps, signals: readonly TriggerSignal[], options: { processNow?: boolean } = {}): Promise<EntryResult & { tick?: TickResult }> {
  const out: EntryResult = { entered: [], skipped: [] };
  if (signals.length === 0) return out;
  const now = deps.clock.now();
  const automations = (await deps.automations.list()).filter((a) => a.enabled);
  for (const s of signals) {
    if (s.kind === 'lifecycle_changed') continue;
    for (const a of automations) {
      if (!signalMatches(a.trigger, s)) continue;
      const r = await tryEnter(deps, a, s.contactId, s.occasion, { firstDueAt: now, ...(s.kind === 'pipeline_stage_changed' ? { pipelineItemId: s.itemId } : {}) }, now);
      if (typeof r === 'string') out.skipped.push({ automationId: a.id, contactId: s.contactId, why: r });
      else out.entered.push(r);
    }
  }
  if (!options.processNow || out.entered.length === 0) return out;
  const tick = emptyTick();
  for (const run of out.entered) await processRun(deps, run.id, tick);
  return { ...out, tick };
}

const TIMED: ReadonlySet<Trigger['type']> = new Set(['date_field', 'pipeline_no_reply', 'schedule']);
const isTimed = (t: Trigger) => TIMED.has(t.type) || (t.type === 'app_event' && t.event === 'inactive');

export function dateFieldValue(c: Contact, field: DateField): string | undefined {
  switch (field) {
    case 'freePeriodEndsAt':
      return c.signals.freePeriod?.endsAt;
    case 'subscriptionExpiresAt':
      return c.signals.subscription?.expiresAt;
    case 'nextFollowUpAt':
      return c.nextFollowUpAt;
    case 'lastActiveAt':
      return c.signals.lastActiveAt;
  }
}

/** "7 days before <date>, at 10:00 their time." Without a time, exactly offset days from the date. */
export function fireTimeFor(dateIso: string, offsetDays: number, atTime: string | undefined, timeZone: string): number {
  if (!atTime) return Date.parse(dateIso) + offsetDays * DAY;
  const p = zonedParts(new Date(dateIso), timeZone);
  const d = addLocalDays(p.year, p.month, p.day, offsetDays);
  const t = parseHHMM(atTime);
  return zonedWallTimeToUtc(d.year, d.month, d.day, t.hour, t.minute, timeZone).getTime();
}

/** Every moment a schedule fires between from and to, with its local date (the occasion). */
export function scheduleOccurrences(t: Extract<Trigger, { type: 'schedule' }>, from: number, to: number, timeZone: string): { at: number; date: string }[] {
  const out: { at: number; date: string }[] = [];
  const start = zonedParts(new Date(from), timeZone);
  const { hour, minute } = parseHHMM(t.time);
  for (let i = -1; i <= Math.ceil((to - from) / DAY) + 1; i++) {
    const d = addLocalDays(start.year, start.month, start.day, i);
    const weekday = new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();
    if (t.every === 'week' && weekday !== (t.weekday ?? 2)) continue;
    if (t.every === 'month' && d.day !== (t.dayOfMonth ?? 1)) continue;
    const at = zonedWallTimeToUtc(d.year, d.month, d.day, hour, minute, timeZone).getTime();
    if (at >= from && at < to) out.push({ at, date: `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` });
  }
  return out;
}

/**
 * Nightly (and when an automation is switched on): create runs for date, inactivity, no-reply and
 * schedule triggers that fall between a little in the past (in case a night was missed) and a
 * little after the next nightly run. Never for moments before the automation was switched on.
 */
export async function planTimedEntries(deps: EngineDeps, options: { automationId?: string } = {}): Promise<EntryResult> {
  const out: EntryResult = { entered: [], skipped: [] };
  const now = deps.clock.now();
  const cfg = deps.config.automations;
  const automations = (await deps.automations.list()).filter((a) => a.enabled && isTimed(a.trigger) && (!options.automationId || a.id === options.automationId));
  if (automations.length === 0) return out;
  let contactsCache: Contact[] | undefined;
  const contacts = async () => (contactsCache ??= (await deps.contacts.list()).filter((c) => !c.mergedInto && !isClosed(c)));
  const record = (a: Automation, contactId: string, r: AutomationRun | Skipped['why']) => (typeof r === 'string' ? out.skipped.push({ automationId: a.id, contactId, why: r }) : out.entered.push(r));

  for (const a of automations) {
    const from = Math.max(now.getTime() - cfg.lookbackHours * HOUR, a.enabledAt ? Date.parse(a.enabledAt) : 0);
    const to = now.getTime() + cfg.horizonHours * HOUR;
    const inWindow = (t: number) => t >= from && t < to;
    const t = a.trigger;

    if (t.type === 'date_field') {
      for (const c of await contacts()) {
        const value = dateFieldValue(c, t.field);
        if (!value) continue;
        const fire = fireTimeFor(value, t.offsetDays, t.atTime, resolveTimeZone(c.timezone, cfg.scheduleTimeZone));
        if (inWindow(fire)) record(a, c.id, await tryEnter(deps, a, c.id, `date:${t.field}:${value}:${t.offsetDays}`, { firstDueAt: new Date(fire) }, now));
      }
    } else if (t.type === 'app_event' && t.event === 'inactive') {
      const days = t.days ?? 21;
      for (const c of await contacts()) {
        const last = c.signals.lastActiveAt;
        if (!last) continue;
        const fire = Date.parse(last) + days * DAY;
        if (inWindow(fire)) record(a, c.id, await tryEnter(deps, a, c.id, `inactive:${days}:${last}`, { firstDueAt: new Date(fire) }, now));
      }
    } else if (t.type === 'pipeline_no_reply') {
      const pipeline = await deps.pipelines.get(t.pipelineId);
      if (!pipeline) continue;
      for (const item of (await deps.pipelineItems.list()).filter((i) => i.pipelineId === t.pipelineId)) {
        if (!item.contactId || !item.lastOutboundAt || hasReplied(item)) continue;
        if (pipeline.stages.find((s) => s.id === item.stageId)?.outcome) continue;
        const fire = Date.parse(item.lastOutboundAt) + t.days * DAY;
        if (inWindow(fire)) record(a, item.contactId, await tryEnter(deps, a, item.contactId, followUpOccasion(item), { firstDueAt: new Date(fire), pipelineItemId: item.id }, now));
      }
    } else if (t.type === 'schedule') {
      for (const occ of scheduleOccurrences(t, from, to, cfg.scheduleTimeZone)) {
        const occasion = `sched:${occ.date}`;
        if (!t.segmentId) {
          record(a, OWNER_RUN, await tryEnter(deps, a, OWNER_RUN, occasion, { firstDueAt: new Date(occ.at) }, now));
          continue;
        }
        const segment = (await deps.segments.list()).find((s) => s.id === t.segmentId);
        if (!segment) continue;
        for (const c of membersOf(await contacts(), segment.filter, now)) {
          record(a, c.id, await tryEnter(deps, a, c.id, occasion, { firstDueAt: new Date(occ.at), segmentId: segment.id }, now));
        }
      }
    }
  }
  deps.logger.info('automations.planned', { entered: out.entered.length, skipped: out.skipped.length });
  return out;
}

// ---------------------------------------------------------------------------------------
// Processing

export interface TickResult {
  processed: number;
  sent: number;
  deferred: number;
  blocked: number;
  exited: number;
  completed: number;
  tasks: number;
  drafts: number;
  alerts: number;
  /** Pause all sending was on: nothing moved. */
  paused: boolean;
  /** Stopped at the per-tick send limit; the rest go next tick. */
  hitLimit: boolean;
}

export const emptyTick = (): TickResult => ({ processed: 0, sent: 0, deferred: 0, blocked: 0, exited: 0, completed: 0, tasks: 0, drafts: 0, alerts: 0, paused: false, hitLimit: false });

/** The frequent tick: move every due run on, up to the rate limits. */
export async function processDueRuns(deps: EngineDeps): Promise<TickResult> {
  const tally = emptyTick();
  if ((await deps.killSwitches.read()).pauseAllSending) {
    tally.paused = true;
    return tally;
  }
  const cfg = deps.config.automations;
  const due = await deps.automationRuns.listDue(deps.clock.now().toISOString(), cfg.maxRunsPerTick);
  for (const run of due) {
    if (tally.sent >= cfg.maxSendsPerTick) {
      tally.hitLimit = true;
      break;
    }
    await processRun(deps, run.id, tally);
  }
  if (tally.processed) deps.logger.info('automations.tick', { ...tally });
  return tally;
}

/** Lease one run and move it on until it has to wait (or finishes). Safe to call concurrently. */
export async function processRun(deps: EngineDeps, runId: string, tally: TickResult = emptyTick()): Promise<TickResult> {
  const now = deps.clock.now();
  const cfg = deps.config.automations;
  if ((await deps.killSwitches.read()).pauseAllSending) {
    tally.paused = true;
    return tally;
  }
  if (tally.sent >= cfg.maxSendsPerTick) {
    tally.hitLimit = true;
    return tally;
  }
  if (!(await deps.automationRuns.lease(runId, iso(now.getTime() + cfg.leaseMinutes * MINUTE), iso(now)))) return tally;
  const leased = await deps.automationRuns.get(runId);
  if (!leased) return tally;
  let run: AutomationRun = leased;
  if ((run.status === 'active' || run.status === 'waiting') && run.nextAt && run.nextAt <= iso(now)) {
    tally.processed += 1;
    try {
      run = await advance(deps, run, now, tally);
    } catch (e) {
      // Unexpected error: try again in 15 minutes, give up after a few attempts. No personal data logged.
      const attempts = run.attempts + 1;
      deps.logger.error('automation.run_error', { runId, automationId: run.automationId, attempts, error: e instanceof Error ? e.name : 'unknown' });
      if (attempts >= cfg.maxStepAttempts) await reportProblem(deps, { id: `run_${runId}`, area: 'automations', message: 'An automation stopped for one person after repeated errors.', ref: { kind: 'automation_run', id: runId } });
      run =
        attempts >= cfg.maxStepAttempts
          ? withHistory({ ...run, status: 'failed', attempts }, now, run.stepId ?? '-', 'Stopped: kept hitting an error')
          : withHistory({ ...run, status: 'waiting', attempts, nextAt: iso(now.getTime() + 15 * MINUTE) }, now, run.stepId ?? '-', 'Hit an error; will try again');
    }
  }
  const { leaseUntil: _released, ...rest } = run;
  await deps.automationRuns.save({ ...rest, updatedAt: iso(now) });
  return tally;
}

function withHistory(run: AutomationRun, now: Date, stepId: string, outcome: string): AutomationRun {
  return { ...run, history: [...run.history, { at: iso(now), stepId, outcome }].slice(-MAX_HISTORY) };
}

function moveTo(run: AutomationRun, a: Automation, index: number, dueAt: Date, now: Date): AutomationRun {
  const next = a.steps[index];
  const { stepId: _s, nextAt: _n, ...rest } = run;
  return {
    ...rest,
    stepIndex: index,
    ...(next ? { stepId: next.id } : {}),
    stepDueAt: iso(dueAt),
    nextAt: iso(dueAt),
    attempts: 0,
    status: dueAt > now ? 'waiting' : 'active',
  };
}

function finish(run: AutomationRun, a: Automation, now: Date, status: 'completed' | 'exited', reason?: ExitReason): AutomationRun {
  const { nextAt: _n, ...rest } = run;
  const goalUntil = a.goal && run.firstMessageAt && !run.converted ? iso(Date.parse(run.firstMessageAt) + a.goal.withinDays * DAY) : undefined;
  return { ...rest, status, ...(reason ? { exitReason: reason } : {}), ...(goalUntil ? { goalUntil } : {}) };
}

/**
 * True if the steps still to come send something, and every one of them is marketing. Someone who
 * has said no to marketing stops then; if a service message is still to come (e.g. the plain
 * "your free months end on…" notice), they stay in and only that goes.
 */
async function onlyMarketingLeft(deps: EngineDeps, a: Automation, from: number): Promise<boolean> {
  let sends = 0;
  for (const step of a.steps.slice(from)) {
    if (step.kind !== 'action' || (step.action.type !== 'send_email' && step.action.type !== 'send_push')) continue;
    sends += 1;
    const t = step.action.templateId ? await deps.templates.get(step.action.templateId) : undefined;
    if (t && t.messageClass !== 'marketing') return false;
  }
  return sends > 0;
}

async function isUnsubscribed(deps: EngineDeps, c: Contact): Promise<boolean> {
  if (c.consent.email?.marketing?.status === 'withdrawn') return true;
  const scopes = await suppressedScopesFor(c, deps);
  return scopes.includes('marketing') || scopes.includes('all');
}

async function countConversion(deps: EngineDeps, run: AutomationRun, a: Automation, c: Contact, now: Date, tally: TickResult): Promise<AutomationRun> {
  if (!a.goal || run.converted || !run.firstMessageAt) return run;
  if (now.getTime() > Date.parse(run.firstMessageAt) + a.goal.withinDays * DAY) return run;
  if (!evaluateGroup(c, a.goal.condition, now)) return run;
  await deps.automations.bumpStats(a.id, { converted: 1 });
  void tally;
  return withHistory({ ...run, converted: true }, now, 'goal', `Reached the goal: ${a.goal.label}`);
}

/** Next time after a wait: days and hours from when the step became due, then the next HH:MM / weekday in their time zone. */
export function waitUntil(step: Extract<AutomationStep, { kind: 'wait' }>, from: number, timeZone: string): Date {
  let at = from + (step.days ?? 0) * DAY + (step.hours ?? 0) * HOUR;
  if (step.untilTime || step.untilWeekday !== undefined) {
    const { hour, minute } = step.untilTime ? parseHHMM(step.untilTime) : { hour: 9, minute: 0 };
    const p = zonedParts(new Date(at), timeZone);
    for (let i = 0; i < 8; i++) {
      const d = addLocalDays(p.year, p.month, p.day, i);
      const candidate = zonedWallTimeToUtc(d.year, d.month, d.day, hour, minute, timeZone).getTime();
      const weekday = new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();
      if (candidate >= at && (step.untilWeekday === undefined || weekday === step.untilWeekday)) {
        at = candidate;
        break;
      }
    }
  }
  return new Date(at);
}

async function advance(deps: EngineDeps, start: AutomationRun, now: Date, tally: TickResult): Promise<AutomationRun> {
  let run = start;
  for (let guard = 0; guard < 50; guard++) {
    const a = await deps.automations.get(run.automationId);
    if (!a || !a.enabled) {
      tally.exited += 1;
      return withHistory(finish(run, a ?? ({} as Automation), now, 'exited', 'switched_off'), now, run.stepId ?? '-', 'Stopped: switched off');
    }
    const index = run.stepId ? a.steps.findIndex((s) => s.id === run.stepId) : run.stepIndex;
    if (index === -1) {
      tally.exited += 1;
      return withHistory(finish(run, a, now, 'exited', 'step_removed'), now, run.stepId ?? '-', 'Stopped: that step was removed');
    }
    if (index >= a.steps.length) {
      tally.completed += 1;
      return withHistory(finish(run, a, now, 'completed'), now, 'end', 'Finished');
    }
    const step = a.steps[index]!;

    let contact: Contact | undefined;
    if (run.contactId !== OWNER_RUN) {
      contact = await deps.contacts.get(run.contactId);
      const exit = async (reason: ExitReason, words: string) => {
        tally.exited += 1;
        return withHistory(finish(run, a, now, 'exited', reason), now, step.id, words);
      };
      if (!contact || contact.mergedInto || isClosed(contact)) return exit('contact_gone', 'Stopped: contact closed, merged or erased');
      if ((await isUnsubscribed(deps, contact)) && (await onlyMarketingLeft(deps, a, index))) return exit('unsubscribed', 'Stopped: they’ve said no to marketing emails');
      run = await countConversion(deps, run, a, contact, now, tally);
      if (a.exitWhen.conditions.length > 0 && evaluateGroup(contact, a.exitWhen, now)) return exit('exit_condition', 'Stopped early: met the stop condition');
      if (step.kind === 'action') {
        if (!evaluateGroup(contact, a.conditions, now)) return exit('no_longer_applies', 'Stopped: no longer matches who it’s for');
        if (run.segmentId) {
          const segment = (await deps.segments.list()).find((s) => s.id === run.segmentId);
          if (segment && !evaluateGroup(contact, segment.filter, now)) return exit('left_segment', 'Stopped: no longer in the segment');
        }
      }
    }

    if (step.kind === 'wait') {
      const tz = resolveTimeZone(contact?.timezone, deps.config.automations.scheduleTimeZone);
      const next = waitUntil(step, Date.parse(run.stepDueAt), tz);
      run = moveTo(run, a, index + 1, next, now);
      if (next > now) return withHistory(run, now, step.id, `Waiting until ${whenLabel(next, tz)}`);
      continue;
    }

    if (step.onlyIf && contact && !evaluateGroup(contact, step.onlyIf, now)) {
      run = withHistory(moveTo(run, a, index + 1, now, now), now, step.id, 'Skipped: the “only if” didn’t match');
      continue;
    }

    const outcome = await doAction(deps, a, run, step, contact, now, tally);
    if (outcome.hold) {
      return withHistory({ ...run, status: 'waiting', nextAt: iso(outcome.hold), attempts: outcome.attempts ?? run.attempts }, now, step.id, outcome.words);
    }
    if (outcome.messaged && !run.firstMessageAt) run = { ...run, firstMessageAt: iso(now) };
    run = withHistory(moveTo(run, a, index + 1, now, now), now, step.id, outcome.words);
    if (outcome.stopTick) return run;
  }
  return run;
}

interface ActionOutcome {
  words: string;
  /** Wait on this same step until then (quiet hours, weekly limit, provider retry, pause). */
  hold?: Date;
  attempts?: number;
  /** Something went (or may have gone) to the person: starts the goal clock. */
  messaged?: boolean;
  /** Hit the send limit: leave the rest of this run for the next tick. */
  stopTick?: boolean;
}

export function monthLabel(now: Date, timeZone = 'Europe/London'): string {
  // On the 1st-7th, the update is about the month just gone.
  const ref = zonedParts(now, timeZone).day <= 7 ? new Date(now.getTime() - 8 * DAY) : now;
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone }).format(ref);
}

/** The numbers block for the investor update, from the CRM. Gus edits the draft before it goes. */
export function investorNumbers(contacts: readonly Contact[], now: Date, timeZone = 'Europe/London'): string {
  const label = monthLabel(now, timeZone);
  const p = zonedParts(zonedParts(now, timeZone).day <= 7 ? new Date(now.getTime() - 8 * DAY) : now, timeZone);
  const start = zonedWallTimeToUtc(p.year, p.month, 1, 0, 0, timeZone).getTime();
  const nm = addLocalDays(p.year, p.month, 28, 4);
  const end = Math.min(zonedWallTimeToUtc(nm.year, nm.month, 1, 0, 0, timeZone).getTime(), now.getTime());
  const people = contacts.filter((c) => !c.mergedInto && c.appUserId);
  const inMonth = (t?: string) => !!t && Date.parse(t) >= start && Date.parse(t) < end;
  const users = people.filter((c) => Date.parse(c.createdAt) < end).length;
  const fresh = people.filter((c) => inMonth(c.createdAt)).length;
  const members = people.filter((c) => ['active', 'cancelled_active', 'billing_issue'].includes(c.signals.subscription?.status ?? '')).length;
  const guests = people.filter((c) => c.lifecycle?.stage === 'Guest').length;
  const ended = people.filter((c) => inMonth(c.signals.freePeriod?.endsAt));
  const converted = ended.filter((c) => c.signals.subscription?.status === 'active' || c.signals.subscription?.status === 'cancelled_active').length;
  const month = label.split(' ')[0];
  return [
    `App users: ${users} (${fresh} new in ${month})`,
    `Paying Members: ${members}; Guests: ${guests}`,
    ended.length ? `Free months ended for ${ended.length} people in ${month}; ${converted} became Members (${Math.round((converted / ended.length) * 100)}%)` : `No free periods ended in ${month}`,
    `[Add from Pulse: weekly active users, plans made, events]`,
  ].join('\n');
}

async function variablesForRun(deps: EngineDeps, a: Automation, contact: Contact | undefined, template: Template | undefined, now: Date): Promise<Variables> {
  const org = contact?.orgIds[0] ? await deps.organisations.get(contact.orgIds[0]) : undefined;
  const event = (await deps.lumaEvents.upcoming(iso(now), 1))[0];
  const venue = event?.venueOrgId ? (await deps.organisations.get(event.venueOrgId))?.name : undefined;
  const wantsNumbers = !!template?.body?.includes('{numbers}');
  return variablesFor(contact, {
    campaign: a.id,
    month: monthLabel(now),
    ...(org ? { orgName: org.name } : contact ? { orgName: `${contact.name.first} ${contact.name.last ?? ''}`.trim() } : {}),
    ...(event ? { event: { name: event.name, startsAt: event.startsAt, url: event.url, ...(venue ? { venueName: venue } : {}) } } : {}),
    ...(wantsNumbers ? { numbers: investorNumbers(await deps.contacts.list(), now) } : {}),
  });
}

const fillText = (text: string, vars: Variables) => text.replace(/\{([a-z_]+)\}/g, (m, k: string) => vars[k as keyof Variables] ?? m);

async function doAction(deps: EngineDeps, a: Automation, run: AutomationRun, step: Extract<AutomationStep, { kind: 'action' }>, contact: Contact | undefined, now: Date, tally: TickResult): Promise<ActionOutcome> {
  const action = step.action;
  const cfg = deps.config.automations;
  if (!contact && !OWNER_ACTIONS.has(action.type)) return { words: 'Skipped: no one to send to' };
  if (a.draftOnly && !OWNER_ACTIONS.has(action.type)) {
    deps.logger.warn('automation.draft_only_refused', { automationId: a.id, stepId: step.id });
    return { words: 'Refused: this automation can only draft' };
  }

  switch (action.type) {
    case 'send_email':
    case 'send_push': {
      const channel = action.type === 'send_email' ? 'email' : 'push';
      const template = action.templateId ? await deps.templates.get(action.templateId) : undefined;
      const blocked = async (words: string): Promise<ActionOutcome> => {
        tally.blocked += 1;
        await deps.automations.bumpStats(a.id, { blocked: 1 });
        return { words };
      };
      if (!template || template.channel !== channel) return blocked('Not sent: the template is missing');
      const staleHours = action.expiresAfterHours ?? (template.messageClass === 'marketing' ? cfg.marketingStaleAfterHours : undefined);
      const deadline = staleHours === undefined ? undefined : Date.parse(run.stepDueAt) + staleHours * HOUR;
      if (deadline !== undefined && now.getTime() > deadline) return blocked(`Skipped: more than ${staleHours} hours late`);
      const rendered = renderTemplate(template, await variablesForRun(deps, a, contact, template, now));
      if (rendered.missing.length) return blocked(`Not sent: nothing to fill in {${rendered.missing.join('}, {')}}`);
      const result = await send(deps, {
        contactId: contact!.id,
        channel,
        messageClass: template.messageClass,
        ...(template.purpose ? { purpose: template.purpose } : {}),
        templateId: template.id,
        templateVersion: template.version,
        automationId: a.id,
        automationVersion: a.version,
        stepId: step.id,
        occasion: run.id,
        ...(rendered.email ? { email: rendered.email } : {}),
        ...(rendered.push ? { push: rendered.push } : {}),
      });
      const what = channel === 'email' ? `“${rendered.email?.subject ?? template.name}”` : 'Push';
      switch (result.status) {
        case 'sent':
          tally.sent += 1;
          await deps.automations.bumpStats(a.id, { sent: 1 });
          return { words: `Sent ${what}`, messaged: true, stopTick: tally.sent >= cfg.maxSendsPerTick };
        case 'duplicate':
          return { words: `${what} had already gone`, messaged: true };
        case 'unknown':
          return { words: `${what}: unclear whether it went, so not resent`, messaged: true };
        case 'deferred': {
          const until = new Date(result.until);
          if (deadline !== undefined && until.getTime() > deadline) return blocked(`Skipped: the next allowed time is more than ${staleHours} hours late`);
          tally.deferred += 1;
          return { words: result.reason === 'quiet_hours' ? `${what}: waiting for quiet hours to end` : `${what}: waiting, they’ve had this week’s emails`, hold: until };
        }
        case 'blocked':
          if (result.reason === 'paused') return { words: 'Held: sending is paused', hold: now };
          return blocked(`Not sent: ${result.explanation}`);
        case 'retrying':
          if (run.attempts + 1 >= cfg.maxStepAttempts) return blocked('Not sent: the email service kept failing');
          return { words: 'Email service hiccup: trying again', hold: new Date(result.retryAt), attempts: run.attempts + 1 };
        case 'failed':
          return blocked('Not sent: the email service refused it');
      }
      return { words: 'Not sent' };
    }

    case 'create_task': {
      const item = run.pipelineItemId ? await deps.pipelineItems.get(run.pipelineItemId) : undefined;
      const id = run.triggeredBy === 'pipeline_no_reply' ? followUpTaskId(run.occasion) : await hashId('at', run.id, step.id);
      if (await deps.tasks.get(id)) return { words: 'Task was already there' };
      const vars = await variablesForRun(deps, a, contact, undefined, now);
      if (item?.orgId && !contact?.orgIds.includes(item.orgId)) {
        const org = await deps.organisations.get(item.orgId);
        if (org) vars.org_name = org.name;
      }
      const title = fillText(action.text?.trim() || a.name, vars).slice(0, 200);
      await deps.tasks.save({
        id,
        title,
        dueAt: iso(now),
        ...(item?.ownerId ? { assigneeId: item.ownerId } : {}),
        ...(contact ? { contactId: contact.id } : {}),
        ...(item?.orgId ? { orgId: item.orgId } : {}),
        ...(item ? { pipelineItemId: item.id } : {}),
        source: 'automation',
        status: 'open',
        createdBy: `automation:${a.id}`,
        createdAt: iso(now),
        ownerOnly: contact?.ownerOnly ?? item?.ownerOnly ?? a.category === 'investors',
      });
      if (contact) await deps.timeline.append({ id: deps.ids.next('tl'), contactId: contact.id, kind: 'task', summary: `Task from “${a.name}”: ${title}`, at: iso(now), actor: `automation:${a.id}`, ownerOnly: contact.ownerOnly });
      tally.tasks += 1;
      return { words: `Task created: ${title}` };
    }

    case 'notify_owner': {
      const id = await hashId('al', run.id, step.id);
      if (await deps.alerts.get(id)) return { words: 'Already told you' };
      const vars = await variablesForRun(deps, a, contact, undefined, now);
      const body = fillText(action.text?.trim() || (contact ? `${contact.name.first} reached this step` : 'This step ran'), vars).slice(0, 300);
      await deps.alerts.save({ id, kind: 'automation', title: a.name, body, ...(contact ? { contactId: contact.id } : {}), createdAt: iso(now) });
      tally.alerts += 1;
      return { words: `Told you: ${body}` };
    }

    case 'add_tag': {
      const tag = action.tag?.trim();
      if (!tag || !contact) return { words: 'Skipped: no tag' };
      if (!contact.tags.includes(tag)) await deps.contacts.save({ ...contact, tags: [...contact.tags, tag], updatedAt: iso(now) });
      return { words: `Tagged “${tag}”` };
    }

    case 'change_stage': {
      if (!contact || !action.pipelineId || !action.stageId) return { words: 'Skipped: no stage chosen' };
      const pipeline = await deps.pipelines.get(action.pipelineId);
      const stage = pipeline?.stages.find((s) => s.id === action.stageId);
      if (!pipeline || !stage) return { words: 'Skipped: that stage no longer exists' };
      const existing = (await deps.pipelineItems.list()).find((i) => i.pipelineId === pipeline.id && i.contactId === contact.id);
      if (existing?.stageId === stage.id) return { words: `Already in ${stage.name}` };
      const item = existing
        ? { ...existing, stageId: stage.id, stageChangedAt: iso(now), updatedAt: iso(now) }
        : {
            id: await hashId('pi', run.id, step.id),
            pipelineId: pipeline.id,
            stageId: stage.id,
            title: `${contact.name.first} ${contact.name.last ?? ''}`.trim(),
            contactId: contact.id,
            ...(contact.orgIds[0] ? { orgId: contact.orgIds[0] } : {}),
            followUpsSent: 0,
            ownerOnly: pipeline.ownerOnly || contact.ownerOnly,
            stageChangedAt: iso(now),
            createdAt: iso(now),
            updatedAt: iso(now),
          };
      await deps.pipelineItems.save(item);
      await deps.timeline.append({ id: deps.ids.next('tl'), contactId: contact.id, kind: 'system', summary: `Moved to ${stage.name} in ${pipeline.name} by “${a.name}”`, at: iso(now), actor: `automation:${a.id}`, ownerOnly: item.ownerOnly });
      return { words: `Moved to ${stage.name} in ${pipeline.name}` };
    }

    case 'create_draft': {
      const template = action.templateId ? await deps.templates.get(action.templateId) : undefined;
      if (!template || template.channel !== 'email') return { words: 'Skipped: the template is missing' };
      const id = await hashId('dr', run.id, step.id);
      if (await deps.drafts.get(id)) return { words: 'Draft was already there' };
      const rendered = renderTemplate({ ...template, fallbacks: { first_name: 'there', ...template.fallbacks } }, await variablesForRun(deps, a, contact, template, now));
      const email = rendered.email;
      if (!email) return { words: 'Skipped: nothing to draft' };
      const to = contact?.emails.find((e) => e.primary)?.address ?? contact?.emails[0]?.address;
      await deps.drafts.save({
        id,
        source: 'automation',
        automationId: a.id,
        templateId: template.id,
        ...(contact ? { contactId: contact.id } : {}),
        ...(to ? { to } : {}),
        subject: email.subject,
        text: email.text,
        status: 'open',
        ownerOnly: true,
        createdAt: iso(now),
      });
      await deps.tasks.save({
        id: `${id}_review`,
        title: `Review and send: ${email.subject}`,
        dueAt: iso(now),
        ...(contact ? { contactId: contact.id } : {}),
        source: 'automation',
        status: 'open',
        link: { kind: 'gmail_draft', id },
        createdBy: `automation:${a.id}`,
        createdAt: iso(now),
        ownerOnly: true,
      });
      tally.drafts += 1;
      return { words: `Draft ready for you: ${email.subject}` };
    }
  }
}

// ---------------------------------------------------------------------------------------
// Goals and the nightly bundle

/** Count conversions that happen after a run has finished, while still inside the goal window. */
export async function checkGoals(deps: EngineDeps, limit = 2000): Promise<number> {
  const now = deps.clock.now();
  let converted = 0;
  const automations = new Map((await deps.automations.list()).map((a) => [a.id, a]));
  for (const run of await deps.automationRuns.listGoalPending(iso(now), limit)) {
    const a = automations.get(run.automationId);
    const c = await deps.contacts.get(run.contactId);
    if (!a?.goal || !c || !run.firstMessageAt) continue;
    if (!evaluateGroup(c, a.goal.condition, now)) continue;
    await deps.automations.bumpStats(a.id, { converted: 1 });
    await deps.automationRuns.save(withHistory({ ...run, converted: true, updatedAt: iso(now) }, now, 'goal', `Reached the goal: ${a.goal.label}`));
    converted += 1;
  }
  return converted;
}
