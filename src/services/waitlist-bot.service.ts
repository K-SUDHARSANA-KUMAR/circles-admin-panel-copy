import customAxios from '@/lib/axios';
import { ADMIN_WAITLIST_URL } from '@/services/user.service';

/**
 * Waitlist auto-verify bot (user-service /admin/waitlist-bot). Rules-based:
 * Off does nothing, Assist only recommends, Auto approves applicants that pass
 * every check (up to the daily cap). The bot never rejects.
 */

export type WaitlistBotMode = 'off' | 'assist' | 'auto';
export type WaitlistBotOutcome = 'approved' | 'recommended' | 'escalated' | 'held';
export type WaitlistBotRunResult = WaitlistBotOutcome | 'skipped' | 'unchanged' | 'failed';

export interface WaitlistBotStatus {
  mode: WaitlistBotMode;
  dailyCap: number;
  minScore: number;
  updatedBy: string | null;
  updatedAt: string | null;
  approvedToday: number;
  capRemaining: number;
  timeZone: string;
}

export interface WaitlistBotEvaluation {
  required: Array<{ key: string; label: string; passed: boolean }>;
  optional: Array<{ key: string; label: string; points: number; maxPoints: number }>;
  redFlags: Array<{ key: string; label: string }>;
  score: number;
  minScore: number;
  missingRequired: string[];
  passed: boolean;
  reasons: string[];
}

export interface WaitlistBotPreview {
  userId: string;
  eligible: boolean;
  notEligibleReason: string | null;
  mode: WaitlistBotMode;
  evaluation: WaitlistBotEvaluation | null;
  wouldDo: WaitlistBotOutcome | null;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface WaitlistBotDecision {
  id: string;
  userId: string;
  mode: WaitlistBotMode;
  outcome: WaitlistBotOutcome;
  score: number;
  reasons: string[];
  createdAt: string;
}

export interface WaitlistBotSummary {
  userId: string;
  outcome: WaitlistBotOutcome;
  score: number;
  reasons: string[];
  createdAt: string;
}

export interface WaitlistBotSweepSummary {
  mode: WaitlistBotMode;
  checked: number;
  approved: number;
  recommended: number;
  escalated: number;
  held: number;
  unchanged: number;
  skipped: number;
  failed: number;
  /** Auto mode's daily cap is full, so the sweep stopped early (resumes after midnight). */
  capReached: boolean;
  durationMs: number;
}

const BOT_URL = ADMIN_WAITLIST_URL.replace(/\/waitlist$/, '/waitlist-bot');

type Envelope = { result?: { data?: unknown; message?: string }; data?: unknown; message?: string };

/** Same envelope handling as the other user-service calls. */
function unwrap<T>(res: { data?: unknown }): T {
  const body = res.data as Envelope | undefined;
  return (body?.result?.data ?? body?.data ?? body) as T;
}

function toError(err: unknown): Error {
  const e = err as { response?: { data?: Envelope }; message?: string } | undefined;
  return new Error(
    e?.response?.data?.result?.message || e?.response?.data?.message || e?.message || 'Request failed',
  );
}

export async function fetchWaitlistBotStatus(): Promise<WaitlistBotStatus> {
  try {
    return unwrap<WaitlistBotStatus>(await customAxios.get(`${BOT_URL}/settings`));
  } catch (err) {
    throw toError(err);
  }
}

export async function updateWaitlistBotSettings(patch: {
  mode?: WaitlistBotMode;
  dailyCap?: number;
  minScore?: number;
}): Promise<WaitlistBotStatus> {
  try {
    return unwrap<WaitlistBotStatus>(await customAxios.put(`${BOT_URL}/settings`, patch));
  } catch (err) {
    throw toError(err);
  }
}

/** Latest bot decision per user, for the waitlist badges. Empty on error. */
export async function fetchWaitlistBotSummaries(userIds: string[]): Promise<WaitlistBotSummary[]> {
  const ids = userIds.filter((id) => /^\d+$/.test(id)).slice(0, 100);
  if (ids.length === 0) return [];
  try {
    const data = unwrap<WaitlistBotSummary[]>(
      await customAxios.get(`${BOT_URL}/summaries`, { params: { userIds: ids.join(',') } }),
    );
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchWaitlistBotPreview(userId: string): Promise<WaitlistBotPreview> {
  try {
    return unwrap<WaitlistBotPreview>(await customAxios.get(`${BOT_URL}/users/${userId}/preview`));
  } catch (err) {
    throw toError(err);
  }
}

export async function fetchWaitlistBotDecisions(userId: string): Promise<WaitlistBotDecision[]> {
  try {
    const data = unwrap<WaitlistBotDecision[]>(
      await customAxios.get(`${BOT_URL}/users/${userId}/decisions`),
    );
    return Array.isArray(data) ? data : [];
  } catch (err) {
    throw toError(err);
  }
}

export async function runWaitlistBotForUser(userId: string): Promise<WaitlistBotRunResult> {
  try {
    const data = unwrap<{ result: WaitlistBotRunResult }>(
      await customAxios.post(`${BOT_URL}/users/${userId}/run`),
    );
    return data.result;
  } catch (err) {
    throw toError(err);
  }
}

export async function runWaitlistBotSweep(): Promise<WaitlistBotSweepSummary> {
  try {
    return unwrap<WaitlistBotSweepSummary>(await customAxios.post(`${BOT_URL}/run`));
  } catch (err) {
    throw toError(err);
  }
}

/** Badge text and colours for a bot outcome. */
export const BOT_OUTCOME_BADGE: Record<
  WaitlistBotOutcome,
  { label: string; className: string; dotClassName: string }
> = {
  approved: {
    label: 'Approved by bot',
    className: 'bg-emerald-950/30 border border-emerald-900/40 text-emerald-400',
    dotClassName: 'bg-emerald-400',
  },
  recommended: {
    label: 'Recommended',
    className: 'bg-sky-950/30 border border-sky-900/40 text-sky-300',
    dotClassName: 'bg-sky-400',
  },
  escalated: {
    label: 'Needs review',
    className: 'bg-[#2d1f10]/60 border border-[#5f3e15]/50 text-amber-400',
    dotClassName: 'bg-amber-400',
  },
  held: {
    label: 'Waiting (daily cap)',
    className: 'bg-zinc-900 border border-zinc-800 text-zinc-300',
    dotClassName: 'bg-zinc-400',
  },
};
