import type { IsoDateTime } from './common';

/** Sending rules. All editable by the Owner in Settings → Sending rules. */
export interface SendingSettings {
  frequencyCap: {
    /** Max marketing emails per person per rolling window. Default 2 per 7 days. */
    email: { max: number; windowDays: number };
    /** Max marketing pushes per person per rolling window. Default 2 per 7 days. */
    push: { max: number; windowDays: number };
    /** If capped, wait for the next free slot for up to this many days, then skip. */
    maxDeferDays: number;
  };
  quietHours: {
    /** Local time in the recipient's zone, "HH:MM". Nothing automated sends from start until end. */
    start: string;
    end: string;
    /** Held messages are spread over this many minutes after `end`, so they don't all land at once. */
    spreadMinutes: number;
    /**
     * Transactional messages replying to something the person did within this many minutes
     * (e.g. "application received") may send during quiet hours.
     */
    contactActionGraceMinutes: number;
  };
  /** Used when a contact has no time zone, or an invalid one. */
  defaultTimezone: string;
  /** Owner-approved addresses that may receive test sends. */
  testRecipients: string[];
}

/**
 * Kill switches. Stored in their own document and read fresh on every send — never cached —
 * so they take effect immediately. Only the Owner can change them.
 */
export interface KillSwitches {
  pauseAllSending: boolean;
  inboxAgentOff: boolean;
  updatedAt: IsoDateTime;
  updatedBy: string;
}
