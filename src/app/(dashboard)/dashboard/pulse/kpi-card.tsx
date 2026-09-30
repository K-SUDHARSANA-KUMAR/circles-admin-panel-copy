'use client';

import React from 'react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { IconArrowDownRight, IconArrowUpRight, IconMinus } from '@tabler/icons-react';
import type { PulseEntry } from '@/services/pulse.service';
import { fmtRatio, ltvCacBand, monthLabelShort } from '@/services/pulse.service';
import type { KpiSpec } from './kpi-config';

interface KpiCardProps {
  spec: KpiSpec;
  /** Months up to and including the selected one — the sparkline never runs ahead. */
  history: PulseEntry[];
  current: PulseEntry;
  previous: PulseEntry | null;
}

/** Under 0.1% either way reads as flat; anything else gets a direction. */
const FLAT_THRESHOLD = 0.001;

export const KpiCard = ({ spec, history, current, previous }: KpiCardProps) => {
  const value = current.kpis[spec.key] as number | null;
  const prevValue = previous ? (previous.kpis[spec.key] as number | null) : null;

  // Guard the zero denominator explicitly: a previous value of 0 makes the
  // percentage change meaningless rather than infinite.
  const change =
    prevValue != null && value != null && prevValue !== 0
      ? (value - prevValue) / Math.abs(prevValue)
      : null;

  const flat = change != null && Math.abs(change) < FLAT_THRESHOLD;
  const rising = change != null && change > 0;
  const good = rising === (spec.goodDirection === 'up');

  const sparkline = history.map((e) => ({
    month: e.month,
    value: e.kpis[spec.key] as number | null,
  }));
  const hasSeries = sparkline.filter((p) => p.value != null).length > 1;

  const isLtv = spec.key === 'ltv';
  const band = ltvCacBand(current.kpis.ltvCacRatio);
  const bandClass =
    band === 'healthy'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : band === 'neutral'
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        : band === 'unhealthy'
          ? 'bg-red-500/10 text-red-400 border-red-500/30'
          : 'bg-muted/30 text-muted-foreground border-border/50';

  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {spec.label}
      </p>

      <p className="text-3xl font-bold tracking-tight">{spec.format(value)}</p>

      <div className="h-10 -mx-1">
        {hasSeries ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkline}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="currentColor"
                className="text-primary"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        {change == null ? (
          <span className="text-xs text-muted-foreground">
            {previous ? 'no comparison' : 'first entry'}
          </span>
        ) : (
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold ${
              flat
                ? 'text-muted-foreground'
                : good
                  ? 'text-emerald-400'
                  : 'text-red-400'
            }`}
          >
            {flat ? (
              <IconMinus size={14} />
            ) : rising ? (
              <IconArrowUpRight size={14} />
            ) : (
              <IconArrowDownRight size={14} />
            )}
            {flat ? 'flat' : `${(Math.abs(change) * 100).toFixed(1)}%`}
            {previous && !flat ? (
              <span className="font-normal text-muted-foreground">
                vs {monthLabelShort(previous.month)}
              </span>
            ) : null}
          </span>
        )}

        {isLtv ? (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${bandClass}`}>
            {fmtRatio(current.kpis.ltvCacRatio)} CAC
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{spec.subtitle}</span>
        )}
      </div>
    </div>
  );
};
