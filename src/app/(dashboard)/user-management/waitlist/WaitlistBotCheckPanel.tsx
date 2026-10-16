'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  IconAlertTriangle,
  IconCheck,
  IconLoader,
  IconPlayerPlay,
  IconRobot,
  IconX,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { detailStyles } from '@/components/shared/listing-page';
import {
  BOT_OUTCOME_BADGE,
  fetchWaitlistBotDecisions,
  fetchWaitlistBotPreview,
  runWaitlistBotForUser,
  type WaitlistBotDecision,
  type WaitlistBotPreview,
} from '@/services/waitlist-bot.service';

const RUN_RESULT_TEXT: Record<string, string> = {
  approved: 'Bot approved this applicant',
  recommended: 'Bot recommends approving this applicant',
  escalated: 'Bot sent this applicant to "Needs review"',
  held: 'Passed every check, but today\'s cap is used up — waiting for tomorrow',
  unchanged: 'Same answer as last time — nothing changed',
  skipped: 'Skipped — the bot is Off, or this user is not a pending applicant',
  failed: 'The bot could not finish — check the server logs',
};

type Props = {
  userId: string;
  /** Called when the bot changed the user (so the page can reload the profile). */
  onChanged?: () => void;
};

/** Live result of the waitlist bot's rules for one applicant, plus history. */
export default function WaitlistBotCheckPanel({ userId, onChanged }: Props) {
  const [preview, setPreview] = useState<WaitlistBotPreview | null>(null);
  const [history, setHistory] = useState<WaitlistBotDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, h] = await Promise.all([
        fetchWaitlistBotPreview(userId),
        fetchWaitlistBotDecisions(userId),
      ]);
      setPreview(p);
      setHistory(h);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the bot check');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const runNow = async () => {
    setRunning(true);
    try {
      const result = await runWaitlistBotForUser(userId);
      toast.message(RUN_RESULT_TEXT[result] ?? result);
      await load();
      if (result === 'approved') onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bot run failed');
    } finally {
      setRunning(false);
    }
  };

  const evaluation = preview?.evaluation;
  const wouldDo = preview?.wouldDo ? BOT_OUTCOME_BADGE[preview.wouldDo] : null;

  return (
    <div className={detailStyles.card}>
      <div className={`${detailStyles.cardHeader} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <h3 className={detailStyles.cardTitle}>
          <IconRobot size={16} className={detailStyles.cardTitleIcon} aria-hidden />
          Bot check
          {evaluation && (
            <span className="text-[11px] font-semibold text-zinc-400 ml-2">Score {evaluation.score}/100</span>
          )}
          {wouldDo && (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ml-2 ${wouldDo.className}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${wouldDo.dotClassName}`} />
              {preview?.mode === 'auto' && preview.wouldDo === 'approved' ? 'Would approve' : wouldDo.label}
            </span>
          )}
        </h3>
        <Button
          type="button"
          variant="outline"
          disabled={running || loading || !preview?.eligible || preview?.mode === 'off'}
          onClick={runNow}
          title={
            preview?.mode === 'off'
              ? 'The bot is Off — turn it on from the waitlist page'
              : `Run the bot for this applicant now (${preview?.mode ?? ''} mode)`
          }
          className={`${detailStyles.outlineButton} flex items-center gap-1.5`}
        >
          {running ? <IconLoader size={12} className="animate-spin" /> : <IconPlayerPlay size={12} />}
          <span>{running ? 'Running...' : 'Run bot now'}</span>
        </Button>
      </div>

      {loading ? (
        <div className="px-4 py-6 text-xs text-zinc-500 flex items-center gap-2">
          <IconLoader size={14} className="animate-spin" /> Checking...
        </div>
      ) : error ? (
        <div className="px-4 py-6 text-xs text-rose-400">{error}</div>
      ) : preview && evaluation ? (
        <div className="px-4 py-4 space-y-4">
          <p className="text-[11px] text-zinc-500">
            Mode: <span className="font-bold uppercase text-zinc-300">{preview.mode}</span>
            {preview.approvedBy && (
              <>
                {' · '}Approved by{' '}
                <span className="font-bold text-zinc-300">
                  {preview.approvedBy === 'bot' ? 'the bot' : `admin ${preview.approvedBy}`}
                </span>
                {preview.approvedAt ? ` on ${new Date(preview.approvedAt).toLocaleString()}` : ''}
              </>
            )}
            {!preview.eligible && preview.notEligibleReason && <> · {preview.notEligibleReason}</>}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <section className="space-y-2">
              <h4 className={detailStyles.sectionLabel}>Required (all must pass)</h4>
              <ul className="space-y-1">
                {evaluation.required.map((c) => (
                  <li key={c.key} className="flex items-center gap-2 text-xs">
                    {c.passed ? (
                      <IconCheck size={13} className="text-emerald-400 shrink-0" aria-label="passed" />
                    ) : (
                      <IconX size={13} className="text-rose-400 shrink-0" aria-label="missing" />
                    )}
                    <span className={c.passed ? 'text-zinc-300' : 'text-rose-300'}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h4 className={detailStyles.sectionLabel}>Optional (adds points)</h4>
              <ul className="space-y-1">
                {evaluation.optional.map((c) => (
                  <li key={c.key} className="flex items-center justify-between gap-2 text-xs">
                    <span className={c.points > 0 ? 'text-zinc-300' : 'text-zinc-500'}>{c.label}</span>
                    <span className={c.points > 0 ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>
                      +{c.points}/{c.maxPoints}
                    </span>
                  </li>
                ))}
              </ul>
              {evaluation.minScore > 0 && (
                <p className="text-[10px] text-zinc-500">Minimum score: {evaluation.minScore}</p>
              )}
            </section>

            <section className="space-y-2">
              <h4 className={detailStyles.sectionLabel}>Red flags (any one = needs review)</h4>
              {evaluation.redFlags.length === 0 ? (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <IconCheck size={13} /> None found
                </p>
              ) : (
                <ul className="space-y-1">
                  {evaluation.redFlags.map((f) => (
                    <li key={f.key} className="flex items-center gap-2 text-xs text-amber-400">
                      <IconAlertTriangle size={13} className="shrink-0" />
                      {f.label}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {history.length > 0 && (
            <section className="space-y-2 border-t border-[#18181b] pt-3">
              <h4 className={detailStyles.sectionLabel}>Bot history</h4>
              <ul className="space-y-1.5">
                {history.slice(0, 10).map((d) => {
                  const badge = BOT_OUTCOME_BADGE[d.outcome];
                  return (
                    <li key={d.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs">
                      <span className="text-zinc-500 w-40 shrink-0">{new Date(d.createdAt).toLocaleString()}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold w-fit ${badge?.className ?? ''}`}>
                        {badge?.label ?? d.outcome}
                      </span>
                      <span className="text-zinc-500 uppercase text-[10px]">{d.mode}</span>
                      <span className="text-zinc-400">Score {d.score}</span>
                      {d.reasons.length > 0 && <span className="text-zinc-500 truncate">{d.reasons.join(' · ')}</span>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <div className="px-4 py-6 text-xs text-zinc-500">{preview?.notEligibleReason ?? 'No data'}</div>
      )}
    </div>
  );
}
