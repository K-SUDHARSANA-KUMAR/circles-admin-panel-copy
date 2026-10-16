'use client';

import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { monthLabel, monthLabelShort } from '@/services/pulse.service';
import { fmtGbp, type RevenueMonth } from '@/services/pulse-revenue.service';

const AXIS = { stroke: 'currentColor', fontSize: 11 } as const;
const GRID = 'rgba(255,255,255,0.06)';

/**
 * ARR month by month. Actual months are solid, forecast months dashed. The last
 * actual month also starts the forecast lines, so the two join up.
 */
export const RevenueChart = ({ months }: { months: RevenueMonth[] }) => {
  const data = useMemo(() => {
    const lastActual = months.reduce(
      (idx, m, i) => (m.kind === 'actual' ? i : idx),
      -1,
    );
    return months.map((m, i) => ({
      month: m.month,
      actualGross: m.kind === 'actual' ? m.arrGross : null,
      actualNet: m.kind === 'actual' ? m.arrNet : null,
      forecastGross: m.kind === 'forecast' || i === lastActual ? m.arrGross : null,
      forecastNet: m.kind === 'forecast' || i === lastActual ? m.arrNet : null,
    }));
  }, [months]);

  const interval = months.length > 12 ? Math.ceil(months.length / 8) - 1 : 0;

  return (
    <div className="glass-card p-6 flex flex-col gap-1">
      <h3 className="text-base font-bold">ARR, actual and forecast</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Gross is what members pay. Net is after the store fee. Dashed lines are the forecast.
      </p>
      <div className="h-[300px] text-muted-foreground">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={(m: string) => monthLabelShort(m)}
              interval={interval}
              {...AXIS}
            />
            <YAxis tickFormatter={(v: number) => fmtGbp(v)} width={72} {...AXIS} />
            <Tooltip
              contentStyle={{
                background: 'rgb(20 20 24)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                fontSize: 12,
              }}
              labelFormatter={(m: string) => monthLabel(String(m))}
              formatter={(v: number) => fmtGbp(v)}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              name="ARR gross"
              dataKey="actualGross"
              stroke="#d8b4fe"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              name="ARR net"
              dataKey="actualNet"
              stroke="#34d399"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              name="Forecast gross"
              dataKey="forecastGross"
              stroke="#d8b4fe"
              strokeDasharray="5 4"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              name="Forecast net"
              dataKey="forecastNet"
              stroke="#34d399"
              strokeDasharray="5 4"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
