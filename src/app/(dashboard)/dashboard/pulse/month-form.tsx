'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconAlertTriangle, IconTrash, IconWand, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import type {
  PulseEntry,
  PulseFieldSource,
  PulseInputs,
} from '@/services/pulse.service';
import {
  autofillPulseDraft,
  fmtMoney,
  fmtPct,
  fmtRatio,
  monthLabel,
} from '@/services/pulse.service';
import { INPUT_SPECS, validateInputs } from './kpi-config';

interface MonthFormProps {
  /** Null = logging a new month. */
  entry: PulseEntry | null;
  defaultMonth: string;
  /** Previous logged month, used for the "new users" sanity warning. */
  priorTotalUsers: number | null;
  existingMonths: string[];
  saving: boolean;
  onCancel: () => void;
  onSave: (month: string, inputs: PulseInputs) => void;
  onDelete?: (month: string) => void;
}

const blank: Record<string, string> = INPUT_SPECS.reduce(
  (acc, s) => ({ ...acc, [s.key]: '' }),
  {},
);

/** KPI preview needs numbers; empty means 0 for the preview only, never for save. */
const toNumbers = (values: Record<string, string>) =>
  INPUT_SPECS.reduce<Record<string, number>>((acc, s) => {
    acc[s.key] = Number(values[s.key] ?? 0) || 0;
    return acc;
  }, {});

export const MonthForm = ({
  entry,
  defaultMonth,
  priorTotalUsers,
  existingMonths,
  saving,
  onCancel,
  onSave,
  onDelete,
}: MonthFormProps) => {
  const isEdit = !!entry;
  const [month, setMonth] = useState(entry?.month || defaultMonth);
  const [values, setValues] = useState<Record<string, string>>(() =>
    entry
      ? INPUT_SPECS.reduce(
          (acc, s) => ({ ...acc, [s.key]: String((entry as any)[s.key] ?? '') }),
          {},
        )
      : { ...blank },
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filling, setFilling] = useState(false);
  // Which values came from our own data, so the editor can see what they are
  // about to accept and what still needs a human.
  const [sources, setSources] = useState<Record<string, PulseFieldSource>>({});
  const [notes, setNotes] = useState<string[]>([]);

  const autofill = async () => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      setError('Pick a month first.');
      return;
    }
    setFilling(true);
    try {
      const draft = await autofillPulseDraft(month);
      setValues((prev) => {
        const next = { ...prev };
        (Object.keys(draft.inputs) as Array<keyof PulseInputs>).forEach((k) => {
          // Never overwrite a figure the editor has already typed for a field we
          // cannot source — acquisition spend above all.
          if (draft.sources[k] === 'manual' && prev[k]) return;
          next[k] = String(draft.inputs[k]);
        });
        return next;
      });
      setSources(draft.sources);
      setNotes(draft.notes || []);
      setError(null);
      toast.success(`Filled ${monthLabel(month)} from our data`);
    } catch (err: any) {
      toast.error(err.message || 'Auto-fill failed');
    } finally {
      setFilling(false);
    }
  };

  const nums = useMemo(() => toNumbers(values), [values]);
  const crossFieldIssues = useMemo(() => validateInputs(nums), [nums]);

  // The client defines new users as the month-on-month delta of the total, so a
  // mismatch usually means one of the two numbers was read from the wrong place.
  const deltaWarning =
    priorTotalUsers != null &&
    values.totalUsers !== '' &&
    values.newUsers !== '' &&
    nums.totalUsers - priorTotalUsers !== nums.newUsers
      ? `New users (${nums.newUsers.toLocaleString()}) does not match the change in total users (${(
          nums.totalUsers - priorTotalUsers
        ).toLocaleString()}).`
      : null;

  const preview = useMemo(() => {
    const div = (a: number, b: number) => (b ? a / b : null);
    const cac = div(nums.marketingSpend, nums.newCustomers);
    const ltv = nums.arpm * nums.avgLifetimeMonths;
    return {
      activationRate: div(nums.activatedUsers, nums.newUsers),
      inviteShare: div(nums.invitedUsers, nums.newUsers),
      mauPct: div(nums.mau, nums.totalUsers),
      membersPctUsers: div(nums.fullMembers, nums.totalUsers),
      freeToMember: div(nums.freeConverted, nums.freeEnded),
      cac,
      ltv,
      // Treat ltv = 0 as a valid number when cac > 0 (produces 0.0x rather than —), while cac = 0 or null remains —
      ltvCacRatio: cac && ltv != null ? ltv / cac : null,
    };
  }, [nums]);

  const submit = () => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      setError('Pick a month.');
      return;
    }
    if (!isEdit && existingMonths.includes(month)) {
      setError(`${monthLabel(month)} is already logged. Edit it instead.`);
      return;
    }
    if (INPUT_SPECS.some((s) => values[s.key] === '' || values[s.key] == null)) {
      setError('Fill in every field.');
      return;
    }
    if (crossFieldIssues.length) {
      setError(crossFieldIssues[0]);
      return;
    }
    setError(null);
    onSave(month, nums as unknown as PulseInputs);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 sm:p-8"
      onClick={onCancel}
    >
      <div
        className="glass-card w-full max-w-3xl p-6 flex flex-col gap-5 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">
              {isEdit ? `Edit ${monthLabel(entry!.month)}` : 'Log a month'}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Enter the raw counts — every KPI is computed from these.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={autofill}
              disabled={filling}
            >
              <IconWand size={16} />
              {filling ? 'Computing…' : 'Fill from our data'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel} aria-label="Close">
              <IconX size={18} />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 max-w-[220px]">
          <Label htmlFor="pulse-month" className="text-sm font-semibold">Month</Label>
          <Input
            id="pulse-month"
            type="month"
            value={month}
            disabled={isEdit}
            onChange={(e) => setMonth(e.target.value)}
          />
          {isEdit ? (
            <p className="text-xs text-muted-foreground">
              The month cannot be changed after it is logged.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {INPUT_SPECS.map((spec) => (
            <div key={spec.key} className="flex flex-col gap-1.5">
              <Label
                htmlFor={`pulse-${spec.key}`}
                className="text-sm font-semibold flex items-center gap-2"
              >
                {spec.label}
                {sources[spec.key] ? (
                  <span
                    className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      sources[spec.key] === 'auto'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {sources[spec.key]}
                  </span>
                ) : null}
              </Label>
              <Input
                id={`pulse-${spec.key}`}
                type="number"
                min="0"
                step={spec.step || '1'}
                value={values[spec.key] ?? ''}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [spec.key]: e.target.value }))
                }
              />
              <p className="text-[11px] leading-snug text-muted-foreground">{spec.hint}</p>
            </div>
          ))}
        </div>

        {notes.length ? (
          <ul className="rounded-xl border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground space-y-1 list-disc pl-6">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        ) : null}

        {deltaWarning ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{deltaWarning} Save anyway if that is intentional.</span>
          </div>
        ) : null}

        <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Computed from these numbers
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              ['Activation', fmtPct(preview.activationRate)],
              ['Invite share', fmtPct(preview.inviteShare)],
              ['MAU %', fmtPct(preview.mauPct)],
              ['Members %', fmtPct(preview.membersPctUsers)],
              ['Free → member', fmtPct(preview.freeToMember)],
              ['CAC', fmtMoney(preview.cac)],
              ['LTV', fmtMoney(preview.ltv)],
              ['LTV:CAC', fmtRatio(preview.ltvCacRatio)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="font-bold">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {crossFieldIssues.length ? (
          <ul className="text-xs text-red-400 list-disc pl-4 space-y-0.5">
            {crossFieldIssues.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : null}
        {error ? <p className="text-sm text-red-400 font-semibold">{error}</p> : null}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          {isEdit && onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Delete this month?</span>
                <Button variant="destructive" size="sm" onClick={() => onDelete(entry!.month)}>
                  Yes, delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  No
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-red-400"
                onClick={() => setConfirmDelete(true)}
              >
                <IconTrash size={16} />
                Delete this month
              </Button>
            )
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Saving…' : 'Save month'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
