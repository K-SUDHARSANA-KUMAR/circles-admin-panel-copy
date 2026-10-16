'use client';

import React, { useState } from 'react';
import { IconCheck, IconPencil, IconX } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { monthLabel } from '@/services/pulse.service';
import {
  fmtChange,
  fmtGbp,
  fmtMembers,
  type RevenueMonth,
} from '@/services/pulse-revenue.service';

const TypeChip = ({ m }: { m: RevenueMonth }) => (
  <span
    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
      m.kind === 'forecast'
        ? 'text-sky-300 bg-sky-500/10 border-sky-500/30'
        : m.partial
          ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
          : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    }`}
  >
    {m.kind === 'forecast' ? 'Forecast' : m.partial ? 'So far' : 'Actual'}
  </span>
);

/** Luma ticket sales: typed per month, actual months only. */
const EventsCell = ({
  m,
  onSave,
}: {
  m: RevenueMonth;
  onSave: (month: string, amount: number) => Promise<boolean>;
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  if (m.kind === 'forecast') return <span className="text-muted-foreground">—</span>;

  // A past month can only be edited once it is in Circles Pulse (no row = null).
  // The current month is created on save if Pulse has not made it yet.
  if (m.eventsRevenue == null && !m.partial) {
    return (
      <span
        className="text-muted-foreground"
        title="Log this month in Circles Pulse first"
      >
        —
      </span>
    );
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-end gap-1">
        <span>{fmtGbp(m.eventsRevenue)}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Edit events revenue"
          onClick={() => {
            setValue(m.eventsRevenue ? String(m.eventsRevenue) : '');
            setEditing(true);
          }}
        >
          <IconPencil size={14} />
        </Button>
      </div>
    );
  }

  const amount = Number(value);
  const valid = value.trim() !== '' && Number.isFinite(amount) && amount >= 0;

  const save = async () => {
    if (!valid || busy) return; // Enter pressed twice must not save twice
    setBusy(true);
    const ok = await onSave(m.month, Number(amount.toFixed(2)));
    setBusy(false);
    if (ok) setEditing(false);
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Input
        type="number"
        inputMode="decimal"
        step="0.01"
        min={0}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="h-8 w-24"
      />
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={save} disabled={!valid || busy} title="Save">
        <IconCheck size={14} />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(false)} disabled={busy} title="Cancel">
        <IconX size={14} />
      </Button>
    </div>
  );
};

export const RevenueTable = ({
  months,
  onSaveEvents,
}: {
  months: RevenueMonth[];
  onSaveEvents: (month: string, amount: number) => Promise<boolean>;
}) => (
  <div className="glass-card p-0 overflow-hidden">
    <div className="px-6 pt-6 pb-3">
      <h3 className="text-base font-bold">Month by month</h3>
      <p className="text-xs text-muted-foreground">
        Members and ARR are read at each month end (now, for the current month). Events
        revenue is one-off ticket money from Luma and is not part of ARR.
      </p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
            <th className="text-left px-6 py-3">Month</th>
            <th className="text-left px-3 py-3">Type</th>
            <th className="text-right px-3 py-3">Monthly</th>
            <th className="text-right px-3 py-3">Annual</th>
            <th className="text-right px-3 py-3" title="New monthly / new annual">New (m / a)</th>
            <th className="text-right px-3 py-3" title="Monthly members who stopped paying">Churned</th>
            <th className="text-right px-3 py-3">MRR</th>
            <th className="text-right px-3 py-3">ARR gross</th>
            <th className="text-right px-3 py-3">ARR net</th>
            <th className="text-right px-3 py-3">Change</th>
            <th className="text-right px-6 py-3">Events revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {months.map((m) => (
            <tr key={m.month} className={m.kind === 'forecast' ? 'text-zinc-400' : ''}>
              <td className="px-6 py-3 font-semibold whitespace-nowrap">{monthLabel(m.month)}</td>
              <td className="px-3 py-3"><TypeChip m={m} /></td>
              <td className="px-3 py-3 text-right">{fmtMembers(m.monthlyMembers)}</td>
              <td className="px-3 py-3 text-right">{fmtMembers(m.annualMembers)}</td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                {fmtMembers(m.newMonthly)} / {fmtMembers(m.newAnnual)}
              </td>
              <td className="px-3 py-3 text-right">{fmtMembers(m.churnedMonthly)}</td>
              <td className="px-3 py-3 text-right">{fmtGbp(m.mrrGross)}</td>
              <td className="px-3 py-3 text-right font-semibold">{fmtGbp(m.arrGross)}</td>
              <td className="px-3 py-3 text-right">{fmtGbp(m.arrNet)}</td>
              <td
                className={`px-3 py-3 text-right ${
                  m.arrChange == null
                    ? 'text-muted-foreground'
                    : m.arrChange >= 0
                      ? 'text-emerald-400'
                      : 'text-red-400'
                }`}
              >
                {fmtChange(m.arrChange)}
              </td>
              <td className="px-6 py-3 text-right">
                <EventsCell m={m} onSave={onSaveEvents} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
