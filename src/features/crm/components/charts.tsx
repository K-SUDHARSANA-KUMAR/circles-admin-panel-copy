/**
 * Small single-series visuals in the dashboard's style. Following the dataviz rules: 2px lines,
 * a ~10% area wash, bars capped at 24px with 4px rounded ends, recessive hairlines, text in text
 * tokens (never the series colour), and a hover tooltip on every point and bar.
 */
import { useState } from 'react';
import { cx } from './ui';

/** Sparkline for stat tiles: violet line with a faint wash, end dot, hover tooltip. */
export function Sparkline({ values, labels, height = 48, format = String }: { values: number[]; labels?: string[]; height?: number; format?: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 240;
  const h = height;
  if (values.length < 2) return <div style={{ height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 6;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (values.length - 1);
  const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1)},${h} L${x(0)},${h} Z`;
  const last = values.length - 1;
  const active = hover ?? last;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
        <path d={area} fill="var(--color-crm-accent)" opacity={0.1} />
        <path d={line} fill="none" stroke="var(--color-crm-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {values.map((_, i) => (
          <rect key={i} x={x(i) - w / values.length / 2} y={0} width={w / values.length} height={h} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      <span
        className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-crm-accent ring-2 ring-crm-card"
        style={{ left: `${(x(active) / w) * 100}%`, top: `${(y(values[active]!) / h) * 100}%` }}
      />
      {hover !== null && (
        <span className="pointer-events-none absolute -top-7 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-crm-line-strong bg-crm-raised px-2 py-0.5 text-[11px] text-crm-ink" style={{ left: `${(x(hover) / w) * 100}%` }}>
          {labels?.[hover] ? `${labels[hover]}: ` : ''}
          {format(values[hover]!)}
        </span>
      )}
    </div>
  );
}

/** Horizontal bars for a ranked list (Connectors, clusters). Single series, value at the tip. */
export function BarRow({ value, max, label, sub, tooltip, onClick, emphasis }: { value: number; max: number; label: React.ReactNode; sub?: React.ReactNode; tooltip?: string; onClick?: () => void; emphasis?: boolean }) {
  const pctWidth = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <button type="button" onClick={onClick} title={tooltip} className={cx('group w-full rounded-xl px-2 py-2 text-left', onClick && 'hover:bg-crm-hover')}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-crm-ink">{label}</span>
        {sub && <span className="shrink-0 text-xs text-crm-ink-3">{sub}</span>}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-2.5 flex-1 rounded-r-[4px] bg-transparent">
          <div className={cx('h-2.5 rounded-r-[4px]', emphasis ? 'bg-crm-accent' : 'bg-crm-accent/60')} style={{ width: `${pctWidth}%` }} />
        </div>
      </div>
    </button>
  );
}

/** Funnel: one bar per step, width = share of the first step; drop-off between steps. */
export function FunnelChart({
  steps,
  onStepClick,
  selected,
}: {
  steps: { id: string; label: string; note: string; count: number; fromPrevious: number | null; stuck: number }[];
  onStepClick?: (id: string) => void;
  selected?: string;
}) {
  const top = steps[0]?.count || 1;
  return (
    <div className="space-y-1">
      {steps.map((s, i) => {
        const width = Math.max(1.5, (s.count / top) * 100);
        const next = steps[i + 1];
        return (
          <div key={s.id}>
            <button
              type="button"
              onClick={() => onStepClick?.(s.id)}
              className={cx('w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-crm-hover', selected === s.id && 'bg-crm-hover ring-1 ring-crm-accent/40')}
              title={`${s.label}: ${s.count.toLocaleString('en-GB')} people. ${s.note}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-crm-ink">{s.label}</span>
                  <span className="ml-2 hidden text-xs text-crm-ink-3 sm:inline">{s.note}</span>
                </div>
                <span className="text-lg font-semibold tabular-nums text-crm-ink">{s.count.toLocaleString('en-GB')}</span>
              </div>
              <div className="mt-2 h-6">
                <div className="h-6 rounded-r-[4px] bg-crm-accent" style={{ width: `${width}%`, opacity: 1 - i * 0.1 }} />
              </div>
            </button>
            {next && (
              <div className="flex items-center gap-2 py-0.5 pl-3 text-xs text-crm-ink-3">
                <span className="text-crm-ink-2">{next.fromPrevious === null ? '' : `${Math.round(next.fromPrevious * 100)}% carry on`}</span>
                <span>·</span>
                <span>{s.stuck.toLocaleString('en-GB')} stopped here</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
