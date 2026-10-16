'use client';

import React, { useEffect, useState } from 'react';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { fmtPct } from '@/services/pulse.service';
import {
  fmtGbp2,
  type PlanPrice,
  type ResolvedAssumption,
  type RevenueAssumptions,
  type RevenueAssumptionsUpdate,
} from '@/services/pulse-revenue.service';

type RateKey = 'trialToPaid' | 'monthlyChurn' | 'annualShare';
type UseActualKey = 'useActualTrialToPaid' | 'useActualChurn' | 'useActualAnnualShare';

const RATES: Array<{ key: RateKey; useKey: UseActualKey; label: string; hint: string; sampleLabel: string }> = [
  {
    key: 'trialToPaid',
    useKey: 'useActualTrialToPaid',
    label: 'Trial-to-paid',
    hint: 'Of trials that end, how many start paying',
    sampleLabel: 'trials',
  },
  {
    key: 'monthlyChurn',
    useKey: 'useActualChurn',
    label: 'Monthly churn',
    hint: 'Monthly members who stop paying each month (annual members are not churned)',
    sampleLabel: 'monthly members',
  },
  {
    key: 'annualShare',
    useKey: 'useActualAnnualShare',
    label: 'Choosing annual',
    hint: 'Share of new payers who pick the annual plan',
    sampleLabel: 'new payers',
  },
];

interface FormState {
  trialToPaid: string;
  monthlyChurn: string;
  annualShare: string;
  storeFee: string;
  usdToGbp: string;
  monthlyPriceGbp: string;
  annualPriceGbp: string;
  useActualTrialToPaid: boolean;
  useActualChurn: boolean;
  useActualAnnualShare: boolean;
}

/** Fractions are shown as percentages; trailing zeros are dropped (25, not 25.00). */
const pct = (v: number) => String(Number((v * 100).toFixed(2)));

const toForm = (a: RevenueAssumptions): FormState => ({
  trialToPaid: pct(a.trialToPaid.saved),
  monthlyChurn: pct(a.monthlyChurn.saved),
  annualShare: pct(a.annualShare.saved),
  storeFee: pct(a.storeFee),
  usdToGbp: String(a.usdToGbp),
  monthlyPriceGbp: a.monthlyPrice.saved == null ? '' : String(a.monthlyPrice.saved),
  annualPriceGbp: a.annualPrice.saved == null ? '' : String(a.annualPrice.saved),
  useActualTrialToPaid: a.trialToPaid.useActual,
  useActualChurn: a.monthlyChurn.useActual,
  useActualAnnualShare: a.annualShare.useActual,
});

/** Builds the request, or returns the first problem in plain words. */
function toUpdate(f: FormState): RevenueAssumptionsUpdate | string {
  const rate = (label: string, raw: string): number | string => {
    const v = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(v) || v < 0 || v > 100) {
      return `${label} must be a number from 0 to 100.`;
    }
    return Number((v / 100).toFixed(4));
  };
  const price = (label: string, raw: string): number | null | string => {
    if (raw.trim() === '') return null;
    const v = Number(raw);
    if (!Number.isFinite(v) || v < 0) return `${label} must be a positive amount or empty.`;
    return Number(v.toFixed(2));
  };

  const values = {
    trialToPaid: rate('Trial-to-paid', f.trialToPaid),
    monthlyChurn: rate('Monthly churn', f.monthlyChurn),
    annualShare: rate('Choosing annual', f.annualShare),
    storeFee: rate('Store fee', f.storeFee),
    monthlyPriceGbp: price('Monthly price', f.monthlyPriceGbp),
    annualPriceGbp: price('Annual price', f.annualPriceGbp),
  };
  for (const v of Object.values(values)) if (typeof v === 'string') return v;

  const usd = Number(f.usdToGbp);
  if (!Number.isFinite(usd) || usd < 0.01 || usd > 10) {
    return 'USD to GBP rate must be between 0.01 and 10.';
  }

  return {
    ...(values as Required<Omit<RevenueAssumptionsUpdate, 'usdToGbp' | UseActualKey>>),
    usdToGbp: Number(usd.toFixed(6)),
    useActualTrialToPaid: f.useActualTrialToPaid,
    useActualChurn: f.useActualChurn,
    useActualAnnualShare: f.useActualAnnualShare,
  };
}

const SourceBadge = ({ source }: { source: 'actual' | 'assumption' | 'missing' }) => (
  <span
    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
      source === 'actual'
        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
        : source === 'missing'
          ? 'text-red-400 bg-red-500/10 border-red-500/30'
          : 'text-amber-300 bg-amber-500/10 border-amber-500/30'
    }`}
  >
    {source === 'actual' ? 'Using actual' : source === 'missing' ? 'Missing' : 'Using assumption'}
  </span>
);

const Field = ({
  label,
  hint,
  suffix,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  suffix?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => (
  <label className="flex flex-col gap-1">
    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</span>
    <div className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="decimal"
        step="any"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-28"
      />
      {suffix ? <span className="text-xs text-muted-foreground">{suffix}</span> : null}
    </div>
    {hint ? <span className="text-[11px] text-muted-foreground/80">{hint}</span> : null}
  </label>
);

const priceLine = (p: PlanPrice) =>
  p.source === 'actual'
    ? `Members pay ${fmtGbp2(p.actual)} on average`
    : p.source === 'assumption'
      ? `No paying members yet, using ${fmtGbp2(p.used)}`
      : 'No paying members yet and no price saved';

export const AssumptionsPanel = ({
  assumptions,
  saving,
  onSave,
}: {
  assumptions: RevenueAssumptions;
  saving: boolean;
  /** Resolves true once saved, false if the save failed (edits are kept). */
  onSave: (update: RevenueAssumptionsUpdate) => Promise<boolean>;
}) => {
  const [form, setForm] = useState<FormState>(() => toForm(assumptions));
  const [error, setError] = useState<string | null>(null);
  // Typed but not saved yet. A reload of the page (e.g. after saving events
  // revenue) must not wipe those edits.
  const [dirty, setDirty] = useState(false);

  // Show what is stored, unless the admin is in the middle of editing.
  useEffect(() => {
    if (dirty) return;
    setForm(toForm(assumptions));
    setError(null);
  }, [assumptions, dirty]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setDirty(true);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submit = async () => {
    const update = toUpdate(form);
    if (typeof update === 'string') {
      setError(update);
      return;
    }
    setError(null);
    // Saved: show the stored values again (the effect reloads the form).
    if (await onSave(update)) setDirty(false);
  };

  const rate = (r: ResolvedAssumption) =>
    r.actual == null ? 'no data yet' : `${fmtPct(r.actual)} actual`;

  return (
    <div className="glass-card p-6 flex flex-col gap-5">
      <div>
        <h3 className="text-base font-bold">Forecast assumptions</h3>
        <p className="text-xs text-muted-foreground">
          Real figures from the last {assumptions.trailingMonths || 0} complete month(s) replace
          the saved ones when switched on. New payers per month = trials per month (
          {assumptions.trialsPerMonth.toLocaleString('en-GB')}) × trial-to-paid.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {RATES.map(({ key, useKey, label, hint, sampleLabel }) => {
          const a = assumptions[key];
          return (
            <div key={key} className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{label}</span>
                <SourceBadge source={a.source} />
              </div>
              <p className="text-2xl font-bold">{fmtPct(a.used)}</p>
              <p className="text-[11px] text-muted-foreground">
                {rate(a)}
                {a.actual != null ? ` (from ${a.sample.toLocaleString('en-GB')} ${sampleLabel})` : ''}
              </p>
              <Field
                label="Saved value"
                hint={hint}
                suffix="%"
                value={form[key]}
                onChange={(v) => set(key, v)}
              />
              <Switch
                checked={form[useKey]}
                onCheckedChange={(v) => set(useKey, v)}
                label="Use actual when available"
              />
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <Field
          label="Store fee"
          hint="Apple / Google cut. Net = gross minus this."
          suffix="%"
          value={form.storeFee}
          onChange={(v) => set('storeFee', v)}
        />
        <Field
          label="USD to GBP"
          hint="£ per $1, for sales not made in pounds"
          value={form.usdToGbp}
          onChange={(v) => set('usdToGbp', v)}
        />
        <Field
          label="Monthly price"
          hint={priceLine(assumptions.monthlyPrice)}
          suffix="£"
          placeholder="e.g. 9.99"
          value={form.monthlyPriceGbp}
          onChange={(v) => set('monthlyPriceGbp', v)}
        />
        <Field
          label="Annual price"
          hint={priceLine(assumptions.annualPrice)}
          suffix="£"
          placeholder="e.g. 99.99"
          value={form.annualPriceGbp}
          onChange={(v) => set('annualPriceGbp', v)}
        />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] text-muted-foreground">
          Plan prices are only used while nobody pays for that plan yet.
        </p>
        <div className="flex items-center gap-3">
          {error ? <span className="text-xs text-red-400">{error}</span> : null}
          <Button className="gap-2" onClick={submit} disabled={saving}>
            <IconDeviceFloppy size={18} />
            {saving ? 'Saving…' : 'Save and recalculate'}
          </Button>
        </div>
      </div>
    </div>
  );
};
