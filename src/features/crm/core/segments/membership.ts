/**
 * Live segments: membership is re-evaluated for one person whenever their data changes, so
 * "joins segment" triggers fire straight away. Counts are snapshotted daily for the trend
 * ("growing or slipping") on the Audience page and in the weekly brief.
 */
import type { Contact } from '../model/contact';
import type { Segment } from '../model/segment';
import { evaluateGroup, membersOf } from './evaluate';

export function refreshMembership(contact: Contact, segments: readonly Segment[], now: Date): { segmentIds: string[]; joined: string[]; left: string[] } {
  const segmentIds = contact.mergedInto ? [] : segments.filter((s) => evaluateGroup(contact, s.filter, now)).map((s) => s.id);
  const before = new Set(contact.segmentIds);
  const after = new Set(segmentIds);
  return {
    segmentIds,
    joined: segmentIds.filter((id) => !before.has(id)),
    left: [...before].filter((id) => !after.has(id)),
  };
}

/** Add today's count to each segment's history (one entry per day, 120 days kept). */
export function snapshotCounts(segments: readonly Segment[], contacts: readonly Contact[], now: Date): Segment[] {
  const date = now.toISOString().slice(0, 10);
  return segments.map((s) => {
    const count = membersOf(contacts, s.filter, now).length;
    const history = [...s.countHistory.filter((h) => h.date !== date), { date, count }].sort((a, b) => a.date.localeCompare(b.date)).slice(-120);
    return { ...s, countHistory: history };
  });
}

/** Change over the last 7 days, from the daily history. */
export function weeklyChange(segment: Segment): { now: number; weekAgo: number | undefined; change: number | undefined } {
  const h = segment.countHistory;
  const last = h.at(-1);
  if (!last) return { now: 0, weekAgo: undefined, change: undefined };
  const target = new Date(Date.parse(`${last.date}T00:00:00Z`) - 7 * 86_400_000).toISOString().slice(0, 10);
  const weekAgo = [...h].reverse().find((x) => x.date <= target)?.count;
  return { now: last.count, weekAgo, change: weekAgo === undefined ? undefined : last.count - weekAgo };
}
