import type { IsoDateTime } from '../model/common';

export interface CapStatus {
  underCap: boolean;
  /** How many counted sends are in the window. */
  count: number;
  /** When over the cap: the moment a slot frees up. */
  freesAt?: Date;
}

/**
 * Rolling-window frequency cap: at most `max` marketing messages per person per channel in any
 * `windowDays` period. Default 2 per 7 days. Transactional and business messages don't count.
 */
export function checkFrequencyCap(
  now: Date,
  countedSendTimes: readonly IsoDateTime[],
  cap: { max: number; windowDays: number },
): CapStatus {
  const windowMs = cap.windowDays * 86_400_000;
  const since = now.getTime() - windowMs;
  const inWindow = countedSendTimes
    .map((t) => Date.parse(t))
    .filter((t) => t > since && t <= now.getTime())
    .sort((a, b) => a - b);
  if (inWindow.length < cap.max) return { underCap: true, count: inWindow.length };
  // Enough sends must age out of the window to bring the count below the cap.
  const pivot = inWindow[inWindow.length - cap.max];
  const freesAt = pivot === undefined ? now : new Date(pivot + windowMs + 1000);
  return { underCap: false, count: inWindow.length, freesAt };
}

export function capWindowStart(now: Date, windowDays: number): Date {
  return new Date(now.getTime() - windowDays * 86_400_000);
}
