import type { IsoDateTime } from './common';

/**
 * Something that went wrong and that Gus (or a developer) should know about, in plain English and
 * without personal details: a send that failed, an automation that kept erroring, a text that
 * didn't go, an event that was rejected. Shown in Settings → Problems.
 */
export interface Problem {
  /** Stable, so the same problem reported twice is one entry. */
  id: string;
  area: 'sending' | 'automations' | 'inbox' | 'alerts' | 'events' | 'members';
  message: string;
  ref?: { kind: string; id: string };
  at: IsoDateTime;
  resolvedAt?: IsoDateTime;
  resolvedBy?: string;
}
