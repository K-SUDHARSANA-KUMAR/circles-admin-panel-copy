'use client';

import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PulseEntry } from '@/services/pulse.service';
import {
  fmtMoney,
  fmtRatio,
  monthLabel,
  monthLabelShort,
} from '@/services/pulse.service';

const AXIS = { stroke: 'currentColor', fontSize: 11 } as const;
const GRID = 'rgba(255,255,255,0.06)';

/** Past ~8 months the labels collide, so show about six of them. */
const useTickInterval = (count: number) =>
  useMemo(() => (count > 8 ? Math.ceil(count / 6) - 1 : 0), [count]);

const ChartPanel = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => (
  <div className="glass-card p-6 flex flex-col gap-1">
    <h3 className="text-base font-bold">{title}</h3>
    <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>
    <div className="h-[260px]">{children}</div>
  </div>
);

const tooltipStyle = {
  contentStyle: {
    background: 'rgb(20 20 24)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    fontSize: 12,
  },
  labelFormatter: (m: string) => monthLabel(String(m)),
} as const;

export const PulseCharts = ({ entries }: { entries: PulseEntry[] }) => {
  const interval = useTickInterval(entries.length);

  const data = useMemo(
    () =>
      entries.map((e) => ({
        month: e.month,
        totalUsers: e.kpis.totalUsers,
        newUsers: e.kpis.newUsers,
        activationRate: e.kpis.activationRate != null ? e.kpis.activationRate * 100 : null,
        inviteShare: e.kpis.inviteShare != null ? e.kpis.inviteShare * 100 : null,
        freeToMember: e.kpis.freeToMember != null ? e.kpis.freeToMember * 100 : null,
        mauPct: e.kpis.mauPct != null ? e.kpis.mauPct * 100 : null,
        membersPctUsers: e.kpis.membersPctUsers != null ? e.kpis.membersPctUsers * 100 : null,
        cac: e.kpis.cac,
        ltv: e.kpis.ltv,
        ltvCacRatio: e.kpis.ltvCacRatio,
      })),
    [entries],
  );

  const xAxis = (
    <XAxis
      dataKey="month"
      tickFormatter={monthLabelShort}
      interval={interval}
      {...AXIS}
    />
  );

  const pctAxis = (
    <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} {...AXIS} />
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <ChartPanel
        title="User growth"
        subtitle="Total users against new users acquired each month."
      >
        <div className="grid grid-rows-2 h-full gap-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke={GRID} vertical={false} />
              {xAxis}
              <YAxis {...AXIS} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                name="Total users"
                type="monotone"
                dataKey="totalUsers"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke={GRID} vertical={false} />
              {xAxis}
              <YAxis {...AXIS} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar name="New users" dataKey="newUsers" fill="#3B82F6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartPanel>

      <ChartPanel
        title="Funnel health"
        subtitle="Activation, invite share and free-trial conversion, each as a share of its cohort."
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke={GRID} vertical={false} />
            {xAxis}
            {pctAxis}
            <Tooltip
              {...tooltipStyle}
              formatter={(v: number) => (v == null ? '—' : `${v.toFixed(1)}%`)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line name="Activation rate" type="monotone" dataKey="activationRate" stroke="#A855F7" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            <Line name="Invite share" type="monotone" dataKey="inviteShare" stroke="#3B82F6" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            <Line name="Free → member" type="monotone" dataKey="freeToMember" stroke="#10B981" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel
        title="Reach & conversion to paid"
        subtitle="MAU as a share of total users, against the paid share of the base."
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke={GRID} vertical={false} />
            {xAxis}
            {pctAxis}
            <Tooltip
              {...tooltipStyle}
              formatter={(v: number) => (v == null ? '—' : `${v.toFixed(1)}%`)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line name="MAU %" type="monotone" dataKey="mauPct" stroke="#8B5CF6" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            <Line name="Members % of users" type="monotone" dataKey="membersPctUsers" stroke="#F59E0B" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel
        title="Unit economics"
        subtitle="Cost to acquire a customer against their lifetime value."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke={GRID} vertical={false} />
            {xAxis}
            <YAxis {...AXIS} tickFormatter={(v: number) => `$${v}`} />
            <Tooltip
              {...tooltipStyle}
              formatter={(v: number, name: string, item: { payload?: { ltvCacRatio?: number | null } }) =>
                name === 'LTV'
                  ? [`${fmtMoney(v)}  (${fmtRatio(item?.payload?.ltvCacRatio)} CAC)`, name]
                  : [fmtMoney(v), name]
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar name="CAC" dataKey="cac" fill="#F43F5E" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar name="LTV" dataKey="ltv" fill="#10B981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </div>
  );
};
