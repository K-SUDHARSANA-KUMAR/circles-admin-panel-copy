import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '../router';
import { Sparkline } from './charts';
import { cx } from './ui';

/**
 * Stat tile in the Pulse style: caps label + hint, big number, sparkline, change pill.
 * `upIsGood` decides whether a rise shows green or red.
 */
export function StatTile({
  label,
  hint,
  value,
  trend,
  trendLabels,
  delta,
  deltaLabel,
  upIsGood = true,
  to,
  footer,
}: {
  label: string;
  hint?: string;
  value: ReactNode;
  trend?: number[];
  trendLabels?: string[];
  delta?: number | null;
  deltaLabel?: string;
  upIsGood?: boolean;
  to?: string;
  footer?: ReactNode;
}) {
  const good = delta === undefined || delta === null ? null : delta === 0 ? null : (delta > 0) === upIsGood;
  const body = (
    <div className={cx('card flex h-full flex-col p-4 transition-colors sm:p-6', to && 'hover:border-crm-line-strong hover:bg-[#0e0e11]')}>
      <div className="flex items-start justify-between gap-3">
        <div className="label-caps">{label}</div>
        {hint && <div className="hidden text-right text-[13px] leading-snug text-crm-ink-3 sm:block">{hint}</div>}
      </div>
      <div className="mt-3 text-[30px] font-semibold leading-none tracking-tight tabular-nums sm:mt-4 sm:text-[40px]">{value}</div>
      {trend && trend.length > 1 && (
        <div className="mt-5">
          <Sparkline values={trend} {...(trendLabels ? { labels: trendLabels } : {})} />
        </div>
      )}
      <div className="mt-auto pt-4">
        {delta !== undefined && delta !== null ? (
          <div className="border-t border-crm-line pt-3">
            <span
              className={cx(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] font-semibold',
                good === null && 'border-crm-line-strong bg-crm-raised text-crm-ink-2',
                good === true && 'border-crm-good/30 bg-crm-good/10 text-crm-good',
                good === false && 'border-crm-bad/30 bg-crm-bad/10 text-crm-bad',
              )}
            >
              {delta > 0 ? <ArrowUpRight size={14} /> : delta < 0 ? <ArrowDownRight size={14} /> : null}
              {Math.abs(Math.round(delta * 100))}%<span className="font-normal opacity-80">{deltaLabel}</span>
            </span>
          </div>
        ) : footer ? (
          <div className="border-t border-crm-line pt-3 text-[13px] text-crm-ink-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
