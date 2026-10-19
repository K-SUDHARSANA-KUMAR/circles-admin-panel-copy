import type { SendStatus } from './message';

/** Statuses that hold the idempotency key: a new attempt with the same key is a duplicate. */
export const FINAL_OR_IN_FLIGHT: ReadonlySet<SendStatus> = new Set<SendStatus>(['claimed', 'sent', 'unknown', 'failed']);

/** Statuses that may be claimed again by a later attempt (which re-runs the whole gate). */
export const RECLAIMABLE: ReadonlySet<SendStatus> = new Set<SendStatus>(['blocked', 'deferred', 'retrying']);

/** Statuses that count towards the frequency cap (anything that has or may have gone out). */
export const COUNTS_TOWARDS_CAP: ReadonlySet<SendStatus> = new Set<SendStatus>(['claimed', 'sent', 'unknown', 'retrying']);
