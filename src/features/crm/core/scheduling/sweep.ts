/**
 * The daily sweep (runs once a night, safe to run again): things that change with time rather
 * than with an event.
 *
 *   - Lifecycle: free months ending → Guest; no app use for 14 days → At risk; etc.
 *   - Segment membership for everyone, and today's segment counts for the trends.
 *   - Follow-up rules for every pipeline.
 *
 * Returns the triggers it produced for the automation engine. Claims "sweep:<date>" first, so a
 * retried or duplicated scheduler run does nothing the second time.
 */
import type { CoreDeps } from '../deps';
import type { TriggerSignal } from '../events/ingest';
import { applyLifecycle } from '../lifecycle/derive';
import { runFollowUps, type FollowUpRun } from '../pipelines/followUps';
import { refreshMembership, snapshotCounts } from '../segments/membership';

export interface SweepResult {
  ran: boolean;
  lifecycleChanges: number;
  segmentJoins: number;
  followUps?: FollowUpRun;
  triggers: TriggerSignal[];
}

export async function runDailySweep(deps: CoreDeps, options: { force?: boolean } = {}): Promise<SweepResult> {
  const now = deps.clock.now();
  const date = now.toISOString().slice(0, 10);
  if (!options.force && !(await deps.processedEvents.claim(`sweep:${date}`, now.toISOString()))) {
    return { ran: false, lifecycleChanges: 0, segmentJoins: 0, triggers: [] };
  }
  const triggers: TriggerSignal[] = [];
  const segments = await deps.segments.list();
  let lifecycleChanges = 0;
  let segmentJoins = 0;
  const all = await deps.contacts.list();
  for (const original of all) {
    if (original.mergedInto) continue;
    const life = applyLifecycle(original, now, deps.lifecycle);
    let c = life.contact;
    if (life.change) {
      lifecycleChanges += 1;
      triggers.push({ kind: 'lifecycle_changed', contactId: c.id, from: life.change.from, to: life.change.to, at: now.toISOString() });
      const words: Record<string, string> = { Guest: 'Free months ended: now a Guest', AtRisk: 'Now at risk', Lapsed: 'Membership lapsed', Member: 'Now a Member', Trial: 'Back to active' };
      if (words[life.change.to]) await deps.timeline.append({ id: deps.ids.next('tl'), contactId: c.id, kind: 'subscription', summary: words[life.change.to]!, at: now.toISOString(), actor: 'system:sweep', ownerOnly: c.ownerOnly });
    }
    const m = refreshMembership(c, segments, now);
    for (const segmentId of m.joined) triggers.push({ kind: 'segment_joined', contactId: c.id, segmentId, occasion: `seg:${segmentId}:${date}`, at: now.toISOString() });
    segmentJoins += m.joined.length;
    if (m.joined.length || m.left.length) c = { ...c, segmentIds: m.segmentIds };
    if (c !== original) await deps.contacts.save(c);
  }
  for (const s of snapshotCounts(segments, await deps.contacts.list(), now)) await deps.segments.save(s);
  const followUps = await runFollowUps(deps);
  deps.logger.info('sweep.ran', { date, lifecycleChanges, segmentJoins, tasks: followUps.tasksCreated });
  return { ran: true, lifecycleChanges, segmentJoins, followUps, triggers };
}
