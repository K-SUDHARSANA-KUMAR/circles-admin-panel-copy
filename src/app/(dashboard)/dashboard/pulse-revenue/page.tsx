'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { IconCurrencyPound, IconRefresh } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  ListingPageContainer,
  ListingSectionHeader,
} from '@/components/shared/listing-page';
import { monthLabel } from '@/services/pulse.service';
import {
  fetchPulseRevenue,
  fmtChange,
  fmtGbp,
  savePulseEventsRevenue,
  savePulseRevenueAssumptions,
  type PulseRevenue,
  type RevenueAssumptionsUpdate,
} from '@/services/pulse-revenue.service';
import { RevenueChart } from './revenue-chart';
import { AssumptionsPanel } from './assumptions-panel';
import { RevenueTable } from './revenue-table';

const StatCard = ({
  label,
  gross,
  net,
  footer,
}: {
  label: string;
  gross: string;
  net: string;
  footer: React.ReactNode;
}) => (
  <div className="glass-card p-5 flex flex-col gap-2">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/90">
      {label}
    </p>
    <p className="text-3xl font-bold tracking-tight">{gross}</p>
    <p className="text-xs text-muted-foreground">
      Net <span className="text-foreground font-semibold">{net}</span> after store fee
    </p>
    <div className="pt-2 border-t border-border/30 text-xs text-muted-foreground">{footer}</div>
  </div>
);

const PulseRevenuePage = () => {
  const [data, setData] = useState<PulseRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchPulseRevenue());
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveAssumptions = async (update: RevenueAssumptionsUpdate) => {
    setSaving(true);
    try {
      // The response is the recomputed page, so the forecast updates straight away.
      setData(await savePulseRevenueAssumptions(update));
      toast.success('Assumptions saved, forecast updated');
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEvents = async (month: string, amount: number) => {
    try {
      await savePulseEventsRevenue(month, amount);
      toast.success(`Events revenue saved for ${monthLabel(month)}`);
      await load();
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
      return false;
    }
  };

  const current = data?.months.filter((m) => m.kind === 'actual').at(-1) ?? null;
  const p = data?.projection;

  return (
    <ListingPageContainer>
      <ListingSectionHeader
        icon={IconCurrencyPound}
        title="Pulse Revenue"
        subtitle="Actual and forecast ARR from RevenueCat (Apple and Google). Events revenue from Luma is shown separately."
        trailing={
          <Button variant="outline" className="gap-2" onClick={load} disabled={loading}>
            <IconRefresh size={18} />
            Refresh
          </Button>
        }
      />

      {error ? (
        <div className="glass-card p-6 flex flex-col items-center gap-3">
          <p className="font-bold">Could not load revenue</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={load}>Retry</Button>
        </div>
      ) : loading && !data ? (
        <div className="glass-card p-12 text-center text-muted-foreground">Loading…</div>
      ) : data && p ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="ARR now"
              gross={fmtGbp(p.arrGrossNow)}
              net={fmtGbp(p.arrNetNow)}
              footer={
                current ? (
                  <>
                    {current.monthlyMembers} monthly · {current.annualMembers} annual members
                  </>
                ) : null
              }
            />
            <StatCard
              label={`ARR forecast, ${monthLabel(p.endMonth)}`}
              gross={fmtGbp(p.arrGrossEnd)}
              net={fmtGbp(p.arrNetEnd)}
              footer={<>{fmtChange(p.arrGrowth)} vs now</>}
            />
            <StatCard
              label={`Next ${p.months} months, subscriptions`}
              gross={fmtGbp(p.revenueGross)}
              net={fmtGbp(p.revenueNet)}
              footer="Annual plans spread per month, not cash timing"
            />
            <div className="glass-card p-5 flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/90">
                Events revenue, {current ? monthLabel(current.month) : 'this month'}
              </p>
              <p className="text-3xl font-bold tracking-tight">
                {fmtGbp(current?.eventsRevenue ?? null)}
              </p>
              <p className="text-xs text-muted-foreground">Luma tickets, typed by an admin</p>
              <div className="pt-2 border-t border-border/30 text-xs text-muted-foreground">
                Not recurring, so not in ARR
              </div>
            </div>
          </div>

          <RevenueChart months={data.months} />

          <AssumptionsPanel
            assumptions={data.assumptions}
            saving={saving}
            onSave={handleSaveAssumptions}
          />

          <RevenueTable months={data.months} onSaveEvents={handleSaveEvents} />

          {data.notes.length ? (
            <div className="glass-card p-6">
              <h3 className="text-base font-bold mb-2">How these numbers are made</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                {data.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </ListingPageContainer>
  );
};

export default PulseRevenuePage;
