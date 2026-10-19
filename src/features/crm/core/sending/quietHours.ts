import type { SendingSettings } from '../model/settings';
import { addLocalDays, parseHHMM, stableHash, zonedParts, zonedWallTimeToUtc } from './timezone';

export interface QuietHoursCheck {
  quiet: boolean;
  /** When quiet hours end in the recipient's zone (only when quiet). */
  endsAt?: Date;
}

/**
 * Is it quiet hours for this recipient right now? Quiet hours are local to the recipient:
 * by default nothing automated sends between 21:00 and 08:00 in their time zone.
 */
export function checkQuietHours(now: Date, timeZone: string, quietHours: SendingSettings['quietHours']): QuietHoursCheck {
  const start = parseHHMM(quietHours.start);
  const end = parseHHMM(quietHours.end);
  const startMin = start.hour * 60 + start.minute;
  const endMin = end.hour * 60 + end.minute;
  if (startMin === endMin) return { quiet: false };

  const local = zonedParts(now, timeZone);
  const nowMin = local.hour * 60 + local.minute;
  const crossesMidnight = startMin > endMin;
  const quiet = crossesMidnight ? nowMin >= startMin || nowMin < endMin : nowMin >= startMin && nowMin < endMin;
  if (!quiet) return { quiet: false };

  // Quiet ends at the next `end` time on the local clock.
  const endToday = nowMin < endMin;
  const date = endToday ? local : addLocalDays(local.year, local.month, local.day, 1);
  const endsAt = zonedWallTimeToUtc(date.year, date.month, date.day, end.hour, end.minute, timeZone);
  return { quiet: true, endsAt };
}

/**
 * The earliest moment at or after `from` when this message may send, respecting quiet hours.
 * Messages held overnight are spread over `spreadMinutes` after quiet hours end, using a
 * stable offset per message so a retry lands on the same slot.
 */
export function nextAllowedTime(
  from: Date,
  timeZone: string,
  quietHours: SendingSettings['quietHours'],
  spreadKey: string,
): Date {
  const check = checkQuietHours(from, timeZone, quietHours);
  if (!check.quiet || !check.endsAt) return from;
  const spread = Math.max(0, quietHours.spreadMinutes);
  const offsetMinutes = spread > 0 ? stableHash(spreadKey) % spread : 0;
  return new Date(check.endsAt.getTime() + offsetMinutes * 60_000);
}
