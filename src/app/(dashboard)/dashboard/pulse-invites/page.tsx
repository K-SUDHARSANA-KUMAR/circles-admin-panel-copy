'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IconRefresh, IconUserPlus } from '@tabler/icons-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  ListingPageContainer,
  ListingSectionHeader,
} from '@/components/shared/listing-page';
import {
  fmtInt,
  fmtPct,
  monthLabel,
  monthLabelShort,
} from '@/services/pulse.service';
import {
  fetchPulseInvites,
  flywheelBand,
  fmtPerUser,
  type InviteMonth,
  type PulseInvites,
} from '@/services/pulse-invites.service';

const AXIS = { stroke: 'currentColor', fontSize: 11 } as const;
const GRID = 'rgba(255,255,255,0.06)';

const StatCard = ({
  label,
  value,
  sub,
  footer,
}: {
  label: string;
  value: string;
  sub: React.ReactNode;
  footer?: React.ReactNode;
}) => (
  <div className="glass-card p-5 flex flex-col gap-2">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/90">
      {label}
    </p>
    <p className="text-3xl font-bold tracking-tight">{value}</p>
    <p className="text-xs text-muted-foreground">{sub}</p>
    {footer ? (
      <div className="pt-2 border-t border-border/30 text-xs text-muted-foreground">
        {footer}
      </div>
    ) : null}
  </div>
);

const FlywheelBadge = ({ value }: { value: number | null }) => {
  const band = flywheelBand(value);
  const cls =
    band === 'self-sustaining'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      : band === 'below'
        ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
        : 'text-muted-foreground bg-muted/20 border-border/40';
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cls}`}>
      {band === 'self-sustaining'
        ? 'Growth sustains itself'
        : band === 'below'
          ? 'Below 1: needs other growth'
          : 'No data yet'}
    </span>
  );
};

/** One table for both views: the columns are the same, only the grouping differs. */
const InviteTable = ({
  title,
  subtitle,
  monthHeader,
  rows,
}: {
  title: string;
  subtitle: string;
  monthHeader: string;
  rows: InviteMonth[];
}) => (
  <div className="glass-card p-0 overflow-hidden">
    <div className="px-6 pt-6 pb-3">
      <h3 className="text-base font-bold">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
            <th className="text-left px-6 py-3">{monthHeader}</th>
            <th className="text-right px-3 py-3">Users</th>
            <th className="text-right px-3 py-3">Invited</th>
            <th className="text-right px-3 py-3">% invited</th>
            <th className="text-right px-3 py-3">Invites</th>
            <th className="text-right px-3 py-3">Per user</th>
            <th className="text-right px-3 py-3">Joined</th>
            <th className="text-right px-3 py-3">Verified</th>
            <th className="text-right px-3 py-3">% verified</th>
            <th className="text-right px-6 py-3" title="Invites per user × % verified">
              New verified per user
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {[...rows].reverse().map((m) => (
            <tr key={m.month}>
              <td className="px-6 py-3 font-semibold whitespace-nowrap">
                {monthLabel(m.month)}
                {m.partial ? (
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    so far
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-3 text-right">{fmtInt(m.users)}</td>
              <td className="px-3 py-3 text-right">{fmtInt(m.inviters)}</td>
              <td className="px-3 py-3 text-right">{fmtPct(m.invitedShare)}</td>
              <td className="px-3 py-3 text-right">{fmtInt(m.invites)}</td>
              <td className="px-3 py-3 text-right">{fmtPerUser(m.invitesPerUser)}</td>
              <td className="px-3 py-3 text-right">{fmtInt(m.joined)}</td>
              <td className="px-3 py-3 text-right">{fmtInt(m.verified)}</td>
              <td className="px-3 py-3 text-right">{fmtPct(m.verifiedRate)}</td>
              <td
                className={`px-6 py-3 text-right font-semibold ${
                  m.newVerifiedPerUser != null && m.newVerifiedPerUser > 1
                    ? 'text-emerald-400'
                    : ''
                }`}
              >
                {fmtPerUser(m.newVerifiedPerUser)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const TrendChart = ({ monthly, bySignUp }: { monthly: InviteMonth[]; bySignUp: InviteMonth[] }) => {
  const data = useMemo(() => {
    const cohort = new Map(bySignUp.map((m) => [m.month, m.newVerifiedPerUser]));
    return monthly.map((m) => ({
      month: m.month,
      monthly: m.newVerifiedPerUser,
      bySignUp: cohort.get(m.month) ?? null,
    }));
  }, [monthly, bySignUp]);

  return (
    <div className="glass-card p-6 flex flex-col gap-1">
      <h3 className="text-base font-bold">New verified users per user</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Invites per user × % verified. The dashed line is 1: above it, every user brings in more
        than one more and growth sustains itself.
      </p>
      <div className="h-[280px] text-muted-foreground">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="month" tickFormatter={(m: string) => monthLabelShort(m)} {...AXIS} />
            <YAxis tickFormatter={(v: number) => v.toFixed(1)} width={40} {...AXIS} />
            <Tooltip
              contentStyle={{
                background: 'rgb(20 20 24)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                fontSize: 12,
              }}
              labelFormatter={(m: string) => monthLabel(String(m))}
              formatter={(v: number) => fmtPerUser(v)}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={1} stroke="#34d399" strokeDasharray="5 4" />
            <Line
              name="Invites sent that month"
              dataKey="monthly"
              stroke="#d8b4fe"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              name="Users who signed up that month"
              dataKey="bySignUp"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const PulseInvitesPage = () => {
  const [data, setData] = useState<PulseInvites | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchPulseInvites());
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load invite tracking');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary;

  return (
    <ListingPageContainer>
      <ListingSectionHeader
        icon={IconUserPlus}
        title="Pulse Invites"
        subtitle="Is the growth flywheel working: are users bringing in their friends, and how many?"
        trailing={
          <Button variant="outline" className="gap-2" onClick={load} disabled={loading}>
            <IconRefresh size={18} />
            Refresh
          </Button>
        }
      />

      {error ? (
        <div className="glass-card p-6 flex flex-col items-center gap-3">
          <p className="font-bold">Could not load invite tracking</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={load}>Retry</Button>
        </div>
      ) : loading && !data ? (
        <div className="glass-card p-12 text-center text-muted-foreground">Loading…</div>
      ) : data && s ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Users who invited"
              value={fmtPct(s.invitedShare)}
              sub={
                <>
                  {fmtInt(s.inviters)} of {fmtInt(s.users)} users invited at least one friend
                </>
              }
            />
            <StatCard
              label="Invites per user"
              value={fmtPerUser(s.invitesPerUser)}
              sub={<>{fmtInt(s.invites)} invites in total</>}
              footer={
                <>
                  {fmtInt(s.contactInvites)} contact invites · {fmtInt(s.codeSignUps)} code sign-ups
                </>
              }
            />
            <StatCard
              label="Invites joined and verified"
              value={fmtPct(s.verifiedRate)}
              sub={
                <>
                  {fmtInt(s.verified)} verified of {fmtInt(s.invites)} invites
                </>
              }
              footer={
                <>
                  {fmtPct(s.joinRate)} joined ({fmtInt(s.joined)})
                </>
              }
            />
            <StatCard
              label="New verified users per user"
              value={fmtPerUser(s.newVerifiedPerUser)}
              sub="Invites per user × % verified"
              footer={<FlywheelBadge value={s.newVerifiedPerUser} />}
            />
          </div>

          <TrendChart monthly={data.monthly} bySignUp={data.bySignUpMonth} />

          <InviteTable
            title="Monthly trend"
            subtitle="Invites sent in each month, by the users who existed by its end. Recent months keep rising as invited friends join and get approved."
            monthHeader="Month"
            rows={data.monthly}
          />

          <InviteTable
            title="By sign-up month"
            subtitle="Users grouped by the month they signed up, with every invite they have sent since. Shows whether newer users invite better."
            monthHeader="Signed up"
            rows={data.bySignUpMonth}
          />

          <div className="glass-card p-6">
            <h3 className="text-base font-bold mb-2">How these numbers are made</h3>
            <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
              {data.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </ListingPageContainer>
  );
};

export default PulseInvitesPage;
