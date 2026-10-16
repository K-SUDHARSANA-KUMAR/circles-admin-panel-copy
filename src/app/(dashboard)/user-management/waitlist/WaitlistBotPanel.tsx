'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { IconLoader, IconPlayerPlay, IconRobot } from '@tabler/icons-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionConfirmationModal } from '@/components/modals/action-confirmation-modal';
import { detailStyles, listingStyles } from '@/components/shared/listing-page';
import {
  fetchWaitlistBotStatus,
  runWaitlistBotSweep,
  updateWaitlistBotSettings,
  type WaitlistBotMode,
  type WaitlistBotStatus,
} from '@/services/waitlist-bot.service';

const MODES: Array<{ id: WaitlistBotMode; label: string; help: string }> = [
  { id: 'off', label: 'Off', help: 'The bot does nothing. Admins approve every applicant by hand.' },
  {
    id: 'assist',
    label: 'Assist',
    help: 'The bot checks every applicant and marks them "Recommended" or "Needs review". An admin still presses Approve.',
  },
  {
    id: 'auto',
    label: 'Auto',
    help: 'The bot approves applicants who pass every check (profile verification + waitlist), up to the daily cap. Anything unsure goes to "Needs review". It never rejects.',
  },
];

type Props = {
  /** Called after a manual run so the list can refresh its badges. */
  onRan?: () => void;
};

/** Mode switch, daily cap, minimum score and "Run now" for the waitlist bot. */
export default function WaitlistBotPanel({ onRan }: Props) {
  const [status, setStatus] = useState<WaitlistBotStatus | null>(null);
  const [mode, setMode] = useState<WaitlistBotMode>('off');
  const [dailyCap, setDailyCap] = useState('50');
  const [minScore, setMinScore] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [confirmAuto, setConfirmAuto] = useState(false);

  const applyStatus = (s: WaitlistBotStatus) => {
    setStatus(s);
    setMode(s.mode);
    setDailyCap(String(s.dailyCap));
    setMinScore(String(s.minScore));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      applyStatus(await fetchWaitlistBotStatus());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load bot settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const capNumber = Number(dailyCap);
  const scoreNumber = Number(minScore);
  const capValid = Number.isInteger(capNumber) && capNumber >= 1 && capNumber <= 1000;
  const scoreValid = Number.isInteger(scoreNumber) && scoreNumber >= 0 && scoreNumber <= 100;
  const dirty =
    !!status && (mode !== status.mode || capNumber !== status.dailyCap || scoreNumber !== status.minScore);

  const save = async () => {
    setSaving(true);
    try {
      applyStatus(await updateWaitlistBotSettings({ mode, dailyCap: capNumber, minScore: scoreNumber }));
      toast.success(`Bot saved — mode is now ${mode.toUpperCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save bot settings');
    } finally {
      setSaving(false);
      setConfirmAuto(false);
    }
  };

  const handleSave = () => {
    // Turning Auto on approves real people, so ask once.
    if (mode === 'auto' && status?.mode !== 'auto') {
      setConfirmAuto(true);
      return;
    }
    save();
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const s = await runWaitlistBotSweep();
      if (s.capReached && s.checked === 0) {
        toast.message(
          `Today's cap of ${status?.dailyCap ?? ''} is full — the bot starts approving again after midnight (${status?.timeZone ?? 'London'}).`,
        );
      } else {
        toast.success(
          `Checked ${s.checked}: ${s.approved} approved, ${s.recommended} recommended, ${s.escalated} need review, ${s.held} waiting, ${s.unchanged} unchanged${s.failed ? `, ${s.failed} failed` : ''}${s.capReached ? ' — daily cap now full, paused until midnight' : ''}`,
        );
      }
      await load();
      onRan?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bot run failed');
    } finally {
      setRunning(false);
    }
  };

  const activeHelp = MODES.find((m) => m.id === mode)?.help;

  return (
    <div className={detailStyles.card}>
      <div className={`${detailStyles.cardHeader} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <h3 className={detailStyles.cardTitle}>
          <IconRobot size={16} className={detailStyles.cardTitleIcon} aria-hidden />
          Auto-verify bot
          {status && (
            <span className="text-[10px] font-semibold text-zinc-500 ml-2">
              {status.approvedToday} / {status.dailyCap} approved by bot today ({status.timeZone})
            </span>
          )}
        </h3>
        <Button
          type="button"
          variant="outline"
          disabled={running || loading || status?.mode === 'off'}
          onClick={runNow}
          title={status?.mode === 'off' ? 'Turn the bot on (Assist or Auto) to run it' : 'Check every pending applicant now'}
          className={`${detailStyles.outlineButton} flex items-center gap-1.5`}
        >
          {running ? <IconLoader size={12} className="animate-spin" /> : <IconPlayerPlay size={12} />}
          <span>{running ? 'Running...' : 'Run now'}</span>
        </Button>
      </div>

      <div className="px-4 py-4 flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="space-y-1.5">
          <span className={detailStyles.fieldLabel}>Mode</span>
          <div role="radiogroup" aria-label="Bot mode" className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5 w-fit">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mode === m.id}
                disabled={loading}
                onClick={() => setMode(m.id)}
                className={`px-4 h-7 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${
                  mode === m.id ? 'bg-[#d8b4fe] text-[#3b0764]' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <label className="space-y-1.5 w-full lg:w-32">
          <span className={detailStyles.fieldLabel}>Daily cap</span>
          <Input
            type="number"
            min={1}
            max={1000}
            value={dailyCap}
            disabled={loading}
            onChange={(e) => setDailyCap(e.target.value)}
            className={listingStyles.searchInput.replace('pl-8 ', '')}
            aria-invalid={!capValid}
          />
        </label>

        <label className="space-y-1.5 w-full lg:w-32">
          <span className={detailStyles.fieldLabel}>Min score</span>
          <Input
            type="number"
            min={0}
            max={100}
            value={minScore}
            disabled={loading}
            onChange={(e) => setMinScore(e.target.value)}
            className={listingStyles.searchInput.replace('pl-8 ', '')}
            aria-invalid={!scoreValid}
          />
        </label>

        <Button
          type="button"
          disabled={!dirty || !capValid || !scoreValid || saving || loading}
          onClick={handleSave}
          className={listingStyles.primaryButton}
        >
          {saving ? <IconLoader size={12} className="animate-spin" /> : null}
          Save
        </Button>
      </div>

      <p className="px-4 pb-4 text-[11px] text-zinc-500">
        {activeHelp}
        {!capValid && <span className="text-rose-400"> Daily cap must be 1–1000.</span>}
        {!scoreValid && <span className="text-rose-400"> Min score must be 0–100.</span>}
        {' '}Min score 0 means optional fields (Instagram, friends, invite, vouch, push) never block approval.
      </p>

      <ActionConfirmationModal
        open={confirmAuto}
        onOpenChange={setConfirmAuto}
        onConfirm={save}
        title="Turn on Auto mode?"
        description={`The bot will approve applicants who pass every check, up to ${capValid ? capNumber : 50} per day, and send them the "You're approved" push. It never rejects anyone.`}
        confirmText="Turn on Auto"
        cancelText="Cancel"
        isLoading={saving}
        variant="approve"
      />
    </div>
  );
}
