/**
 * The 08:00 daily digest and the Monday 08:00 weekly brief. Both are emailed to Gus and shown on
 * Today. The CRM works out every fact; for the weekly brief the AI only writes them up (with a
 * plain version if AI is off or its answer is unusable). Each is claimed per day/week, so a doubled
 * scheduler run sends nothing twice.
 */
import { rankConnectors } from '../audience/audience';
import type { CoreDeps } from '../deps';
import type { DailyDigest, WeeklyBrief } from '../model/brief';
import type { Contact } from '../model/contact';
import { INBOX_CATEGORIES, INBOX_CATEGORY_LABELS } from '../model/inbox';
import { overdueRelationships } from '../pipelines/followUps';
import { weeklyChange } from '../segments/membership';
import { zonedParts } from '../sending/timezone';
import { parseBrief } from './aiOutput';

const DAY = 86_400_000;
/** What the AI sees: first name and last initial, never more. */
const shortName = (c: Contact) => `${c.name.first}${c.name.last ? ` ${c.name.last[0]}.` : ''}`;
const days = (from: number, to: number) => Math.max(0, Math.round((to - from) / DAY));

export function mondayOf(now: Date, timeZone = 'Europe/London'): string {
  const p = zonedParts(now, timeZone);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  d.setUTCDate(d.getUTCDate() - ((p.weekday + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export interface WeeklyFacts extends Omit<WeeklyBrief, 'id' | 'text' | 'writtenBy' | 'generatedAt'> {
  /** For the write-up: the same facts with short names. */
  lines: { contact: string[]; moving: string[]; conversion: string[]; partners: string[] };
}

export async function computeWeeklyFacts(deps: CoreDeps, now: Date): Promise<WeeklyFacts> {
  const t = now.getTime();
  const contacts = (await deps.contacts.list()).filter((c) => !c.mergedInto);
  const items = await deps.pipelineItems.list();
  const pipelines = await deps.pipelines.list();
  const segments = await deps.segments.list();
  const pick: { contactId: string; reason: string }[] = [];
  const lines: WeeklyFacts['lines'] = { contact: [], moving: [], conversion: [], partners: [] };
  const add = (c: Contact, reason: string) => {
    if (pick.length >= 6 || pick.some((p) => p.contactId === c.id)) return;
    pick.push({ contactId: c.id, reason });
    lines.contact.push(`${shortName(c)}: ${reason}`);
  };

  for (const r of overdueRelationships(contacts, items, pipelines, now).filter((x) => x.contact).slice(0, 3)) add(r.contact!, `follow-up was due ${days(Date.parse(r.dueAt), t)} days ago (${r.sub || 'relationship'})`);
  for (const c of contacts.filter((c) => c.signals.subscription?.status === 'billing_issue').slice(0, 2)) add(c, 'payment failed: a personal note beats the automated email');
  const ending = contacts
    .filter((c) => c.signals.freePeriod && Date.parse(c.signals.freePeriod.endsAt) > t && Date.parse(c.signals.freePeriod.endsAt) <= t + 7 * DAY && !['active', 'cancelled_active'].includes(c.signals.subscription?.status ?? ''))
    .sort((a, z) => (z.signals.eventsAttended ?? 0) - (a.signals.eventsAttended ?? 0));
  for (const c of ending.slice(0, 2)) add(c, `free months end in ${days(t, Date.parse(c.signals.freePeriod!.endsAt))} days; been to ${c.signals.eventsAttended ?? 0} events`);
  const top = rankConnectors(contacts)[0];
  if (top) add(top.contact, `your top Connector: brought in ${top.invited} people (${top.invitedActive} still active). Worth a thank-you`);
  const waiting = contacts.filter((c) => c.lifecycle?.stage === 'Applicant' && c.signals.application?.submittedAt && t - Date.parse(c.signals.application.submittedAt) > 5 * DAY);
  for (const c of waiting.slice(0, 1)) add(c, `applied ${days(Date.parse(c.signals.application!.submittedAt!), t)} days ago and is still waiting`);

  const segmentMoves = segments
    .filter((s) => s.pinned)
    .map((s) => ({ s, w: weeklyChange(s) }))
    .filter(({ w }) => w.weekAgo !== undefined && w.change !== 0)
    .map(({ s, w }) => ({ segmentId: s.id, name: s.name, from: w.weekAgo!, to: w.now }));
  for (const m of segmentMoves) lines.moving.push(`${m.name}: ${m.from} → ${m.to} (${m.to > m.from ? '+' : ''}${m.to - m.from})`);

  const inWeek = (iso: string | undefined, startDaysAgo: number) => !!iso && Date.parse(iso) > t - startDaysAgo * DAY && Date.parse(iso) <= t - (startDaysAgo - 7) * DAY;
  const count = (startDaysAgo: number) => ({
    'New sign-ups': contacts.filter((c) => c.lifecycle && inWeek(c.createdAt, startDaysAgo)).length,
    Applied: contacts.filter((c) => inWeek(c.signals.application?.submittedAt, startDaysAgo)).length,
    'Started free months': contacts.filter((c) => inWeek(c.signals.freePeriod?.startedAt, startDaysAgo)).length,
    'Became Members': contacts.filter((c) => c.lifecycle?.stage === 'Member' && inWeek(c.lifecycle.since, startDaysAgo)).length,
  });
  const conversion = { thisWeek: count(7), lastWeek: count(14) };
  for (const k of Object.keys(conversion.thisWeek) as (keyof typeof conversion.thisWeek)[]) lines.conversion.push(`${k}: ${conversion.thisWeek[k]} (last week ${conversion.lastWeek[k]})`);

  const partnerFollowUpsDue = items
    .filter((i) => i.pipelineId === 'partnerships' && i.nextFollowUpAt && Date.parse(i.nextFollowUpAt) <= t + 7 * DAY)
    .filter((i) => !pipelines.find((p) => p.id === i.pipelineId)?.stages.find((s) => s.id === i.stageId)?.outcome)
    .sort((a, z) => a.nextFollowUpAt!.localeCompare(z.nextFollowUpAt!))
    .map((i) => ({ itemId: i.id, title: i.title, dueAt: i.nextFollowUpAt! }));
  for (const p of partnerFollowUpsDue.slice(0, 6)) lines.partners.push(`${p.title}: ${Date.parse(p.dueAt) < t ? `overdue by ${days(Date.parse(p.dueAt), t)} days` : `due in ${days(t, Date.parse(p.dueAt))} days`}`);

  return { weekOf: mondayOf(now), contactThisWeek: pick, segmentMoves, conversion, partnerFollowUpsDue, lines };
}

export function plainBrief(f: WeeklyFacts): string {
  const sec = (title: string, xs: string[], empty: string) => `${title}\n${xs.length ? xs.map((x) => `• ${x}`).join('\n') : empty}`;
  return [
    sec('Who to contact this week', f.lines.contact, 'No one stands out this week.'),
    sec('Growing or slipping', f.lines.moving, 'Your pinned segments held steady.'),
    sec('This week against last', f.lines.conversion, ''),
    sec('Partner follow-ups due', f.lines.partners, 'None due.'),
  ].join('\n\n');
}

async function emailGus(deps: CoreDeps, subject: string, text: string, key: string): Promise<boolean> {
  // Internal email to Gus himself. Pause all sending holds these too, for predictability.
  if ((await deps.killSwitches.read()).pauseAllSending) return false;
  await deps.email.send({ to: deps.config.ownerEmail, from: deps.config.senders.transactionalFrom, subject, text, headers: {}, idempotencyKey: key, tags: { kind: key.split('_')[0]! } });
  return true;
}

/** Monday 08:00. Returns undefined if this week's brief has already gone. */
export async function sendWeeklyBrief(deps: CoreDeps, options: { force?: boolean } = {}): Promise<WeeklyBrief | undefined> {
  const now = deps.clock.now();
  const facts = await computeWeeklyFacts(deps, now);
  if (!options.force && !(await deps.processedEvents.claim(`brief:${facts.weekOf}`, now.toISOString()))) return undefined;
  const ai = await deps.settings.getAi();
  let text: string | undefined;
  if (ai.enabled) {
    try {
      const factsText = `Week of ${facts.weekOf}.\n\n${plainBrief(facts)}`;
      text = parseBrief(await deps.ai.writeBrief(factsText, ai));
    } catch (e) {
      deps.logger.warn('brief.ai_error', { error: e instanceof Error ? e.name : 'unknown' });
    }
  }
  const brief: WeeklyBrief = {
    id: `brief_${facts.weekOf}`,
    weekOf: facts.weekOf,
    generatedAt: now.toISOString(),
    text: text ?? plainBrief(facts),
    contactThisWeek: facts.contactThisWeek,
    segmentMoves: facts.segmentMoves,
    conversion: facts.conversion,
    partnerFollowUpsDue: facts.partnerFollowUpsDue,
    writtenBy: text ? 'ai' : 'template',
  };
  await deps.briefs.saveWeekly(brief);
  await emailGus(deps, `Your week: ${facts.weekOf}`, brief.text, `brief_${facts.weekOf}`);
  return brief;
}

export async function buildDailyDigest(deps: CoreDeps, now: Date): Promise<DailyDigest & { waiting: { id: string; from: string; subject: string }[] }> {
  const since = new Date(now.getTime() - DAY).toISOString();
  const recent = (await deps.inbox.listSince(since)).filter((m) => m.status !== 'queued');
  const counts: Record<string, number> = Object.fromEntries(INBOX_CATEGORIES.map((c) => [c, recent.filter((m) => m.category === c).length]));
  const texted = recent.filter((m) => m.alertId).length;
  const drafts = recent.filter((m) => m.draftId).length;
  const auto = recent.filter((m) => m.autoReplied).length;
  const flagged = recent.filter((m) => m.suspicious).length;
  const waiting = (await deps.inbox.listSince(new Date(now.getTime() - 14 * DAY).toISOString())).filter((m) => m.status === 'waiting_for_you');
  const breakdown = INBOX_CATEGORIES.filter((c) => counts[c]).map((c) => `${counts[c]} ${INBOX_CATEGORY_LABELS[c].toLowerCase()}`).join(', ');
  const text = [
    `${recent.length} email${recent.length === 1 ? '' : 's'} in the last day${breakdown ? `: ${breakdown}` : ''}.`,
    `The agent texted you about ${texted}, saved ${drafts} draft repl${drafts === 1 ? 'y' : 'ies'} in Gmail${auto ? `, sent ${auto} approved answer${auto === 1 ? '' : 's'}` : ''}, and flagged ${flagged} that tried to give it instructions.`,
    waiting.length ? `Waiting for you:\n${waiting.slice(0, 10).map((m) => `• ${m.from.name || m.from.email}: ${m.subject}`).join('\n')}` : 'Nothing is waiting for you.',
  ].join('\n\n');
  const date = now.toISOString().slice(0, 10);
  return { id: `digest_${date}`, date, generatedAt: now.toISOString(), text, counts, waiting: waiting.slice(0, 10).map((m) => ({ id: m.id, from: m.from.name || m.from.email, subject: m.subject })) };
}

/** Daily at Gus's chosen time (default 08:00 London). Returns undefined if today's has gone. */
export async function sendDailyDigest(deps: CoreDeps, options: { force?: boolean } = {}): Promise<DailyDigest | undefined> {
  const now = deps.clock.now();
  const digest = await buildDailyDigest(deps, now);
  if (!options.force && !(await deps.processedEvents.claim(`digest:${digest.date}`, now.toISOString()))) return undefined;
  const { waiting: _w, ...record } = digest;
  await deps.briefs.saveDigest(record);
  await emailGus(deps, `Inbox digest: ${digest.date}`, digest.text, `digest_${digest.date}`);
  return record;
}

/** Is it time? Lets an hourly job honour the digest time Gus picks. */
export function isDigestHour(now: Date, digestTime: string, timeZone = 'Europe/London'): boolean {
  return zonedParts(now, timeZone).hour === Number(digestTime.slice(0, 2));
}
