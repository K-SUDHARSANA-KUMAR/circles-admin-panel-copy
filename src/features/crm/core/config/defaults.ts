import type { KillSwitches, SendingSettings } from '../model/settings';

/** Day-one sending rules. Gus can change every one of these in Settings → Sending rules. */
export const DEFAULT_SENDING_SETTINGS: SendingSettings = {
  frequencyCap: {
    email: { max: 2, windowDays: 7 },
    push: { max: 2, windowDays: 7 },
    maxDeferDays: 3,
  },
  quietHours: {
    start: '21:00',
    end: '08:00',
    spreadMinutes: 60,
    contactActionGraceMinutes: 5,
  },
  defaultTimezone: 'Europe/London',
  testRecipients: [],
};

/**
 * At go-live, Pause all sending starts ON so nothing goes out until Gus has reviewed
 * everything and switched it off himself.
 */
export const DEFAULT_KILL_SWITCHES: KillSwitches = {
  pauseAllSending: true,
  inboxAgentOff: false,
  updatedAt: '1970-01-01T00:00:00.000Z',
  updatedBy: 'system:defaults',
};

/** Who emails come from. Set per environment; these are the recommended production values. */
export interface SenderIdentity {
  /** Transactional email: its own subdomain so marketing complaints can't affect it. */
  transactionalFrom: string;
  /** Branded marketing and automated outreach. */
  marketingFrom: string;
  /** Plain "from Gus" layout. */
  personalFrom: string;
  /** Replies land in Gus's Gmail, where the inbox agent sees them and follow-ups stop. */
  replyTo: string;
}

export const DEFAULT_SENDER_IDENTITY: SenderIdentity = {
  transactionalFrom: 'The Circles Club <hello@notify.thecirclesclub.com>',
  marketingFrom: 'The Circles Club <hello@mail.thecirclesclub.com>',
  personalFrom: 'Gus at The Circles Club <gus@mail.thecirclesclub.com>',
  replyTo: 'gus@thecirclesclub.com',
};

export interface CoreConfig {
  senders: SenderIdentity;
  /** Public HTTPS endpoint that handles unsubscribe links and one-click POSTs. */
  unsubscribeBaseUrl: string;
  /** Optional mailto: fallback for List-Unsubscribe. */
  unsubscribeMailto?: string;
  /** How long unsubscribe links stay valid. After that the page asks for their email instead. */
  unsubscribeTokenTtlDays: number;
  /** Retry policy for temporary provider failures. */
  retry: { maxAttempts: number; maxWindowHours: number };
  /** The consent wording version currently live on each external form (see templates/consent). */
  consentWording: { website: string; luma: string };
  /** Accept RevenueCat sandbox (test purchase) events. Off in production. */
  acceptSandboxPurchases: boolean;
  automations: AutomationEngineConfig;
  /** Where the daily digest and weekly brief go. */
  ownerEmail: string;
  /** The admin dashboard's address, for links in texts to Gus, e.g. https://admin.thecirclesclub.com. */
  dashboardUrl?: string;
}

export interface AutomationEngineConfig {
  /** Rate limits per tick. Anything over waits for the next tick. */
  maxRunsPerTick: number;
  maxSendsPerTick: number;
  /** Marketing messages more than this late (after a pause or outage) are skipped, not sent late. */
  marketingStaleAfterHours: number;
  /** The nightly check also picks up date and schedule moments this far back, in case a night was missed. */
  lookbackHours: number;
  /** And plans this far ahead, so 10:00 messages are queued for 10:00. */
  horizonHours: number;
  /** A run is held for this long while one worker processes it. */
  leaseMinutes: number;
  /** Provider retries on one step before giving up on it. */
  maxStepAttempts: number;
  /** Time zone for schedule triggers ("every Tuesday at 10:00"). */
  scheduleTimeZone: string;
}

export const DEFAULT_AUTOMATION_ENGINE_CONFIG: AutomationEngineConfig = {
  maxRunsPerTick: 500,
  maxSendsPerTick: 200,
  marketingStaleAfterHours: 48,
  lookbackHours: 26,
  horizonHours: 25,
  leaseMinutes: 5,
  maxStepAttempts: 6,
  scheduleTimeZone: 'Europe/London',
};

export const DEFAULT_CORE_CONFIG: CoreConfig = {
  senders: DEFAULT_SENDER_IDENTITY,
  unsubscribeBaseUrl: 'https://u.thecirclesclub.com/',
  unsubscribeMailto: 'unsubscribe@mail.thecirclesclub.com',
  unsubscribeTokenTtlDays: 730,
  // Retries must finish well within Resend's 24-hour idempotency window.
  retry: { maxAttempts: 6, maxWindowHours: 20 },
  consentWording: { website: 'website-v1', luma: 'luma-v1' },
  acceptSandboxPurchases: false,
  automations: DEFAULT_AUTOMATION_ENGINE_CONFIG,
  ownerEmail: 'gus@thecirclesclub.example',
};
