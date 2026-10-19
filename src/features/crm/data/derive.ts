/**
 * Read-only views over the prototype data that several screens share.
 * (Overdue and follow-up rules move into core/pipelines in stage 3.)
 */
import { computeFunnel, membersOf, overdueRelationships, weeklyChange, type Contact, type OverdueRow, type Task } from '../core';
import type { Backend } from './backend';
import { DAY } from './format';

export type { OverdueRow } from '../core';

/** Every relationship whose follow-up date has passed (core/pipelines), limited to what this admin may see. */
export function overdue(b: Backend): OverdueRow[] {
  return overdueRelationships(b.visibleContacts(), b.state.world.pipelineItems, b.visiblePipelines(), new Date(b.state.now));
}

export function myOpenTasks(b: Backend): Task[] {
  const visible = (t: Task) => !t.ownerOnly || b.admin.role === 'owner';
  return b.state.world.tasks.filter((t) => t.status === 'open' && visible(t)).sort((a, c) => (a.dueAt ?? '9').localeCompare(c.dueAt ?? '9'));
}

/** Counts per week for the last n weeks, oldest first. */
export function weeklyCounts(dates: (string | undefined)[], now: string, weeks = 8): number[] {
  const end = Date.parse(now);
  const out = Array.from({ length: weeks }, () => 0);
  for (const d of dates) {
    if (!d) continue;
    const ago = Math.floor((end - Date.parse(d)) / (7 * DAY));
    if (ago >= 0 && ago < weeks) out[weeks - 1 - ago] = (out[weeks - 1 - ago] ?? 0) + 1;
  }
  return out;
}

export function weekLabels(now: string, weeks = 8): string[] {
  const end = Date.parse(now);
  return Array.from({ length: weeks }, (_, i) => {
    const start = new Date(end - (weeks - i) * 7 * DAY + DAY);
    return `w/c ${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  });
}

export function segmentMembers(b: Backend, segmentId: string): Contact[] {
  const seg = b.state.world.segments.find((s) => s.id === segmentId);
  if (!seg) return [];
  return membersOf(b.visibleContacts(), seg.filter, new Date(b.state.now));
}

export function funnel(b: Backend, sinceDays?: number) {
  const now = new Date(b.state.now);
  return computeFunnel(b.visibleContacts(), now, {
    activeDays: b.state.settings.activeDays,
    ...(sinceDays ? { since: new Date(now.getTime() - sinceDays * DAY) } : {}),
  });
}

/** Weekly segment sizes from the daily count history (oldest first), for the trend lines. */
export function segmentTrend(b: Backend, segmentId: string, weeks = 8): number[] {
  const seg = b.state.world.segments.find((s) => s.id === segmentId);
  if (!seg || seg.countHistory.length === 0) return [];
  const h = seg.countHistory;
  const last = Date.parse(`${h.at(-1)!.date}T00:00:00Z`);
  return Array.from({ length: weeks }, (_, i) => {
    const target = new Date(last - (weeks - 1 - i) * 7 * DAY).toISOString().slice(0, 10);
    return [...h].reverse().find((x) => x.date <= target)?.count ?? 0;
  });
}

export function segmentWeeklyChange(b: Backend, segmentId: string) {
  const seg = b.state.world.segments.find((s) => s.id === segmentId);
  return seg ? weeklyChange(seg) : undefined;
}
