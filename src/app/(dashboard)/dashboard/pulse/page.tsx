'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  IconActivityHeartbeat,
  IconChevronDown,
  IconDownload,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconWand,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  ListingPageContainer,
  ListingSectionHeader,
} from '@/components/shared/listing-page';
import {
  autofillAndSavePulse,
  deletePulseEntry,
  downloadPulseExport,
  fetchPulseEntries,
  fmtInt,
  fmtMoney,
  fmtPct,
  monthLabel,
  savePulseEntry,
  type PulseEntry,
  type PulseInputs,
} from '@/services/pulse.service';
import { KPI_SPECS } from './kpi-config';
import { KpiCard } from './kpi-card';
import { PulseCharts } from './pulse-charts';
import { MonthForm } from './month-form';

const currentMonth = () => new Date().toISOString().slice(0, 7);

const PulsePage = () => {
  const [entries, setEntries] = useState<PulseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [formFor, setFormFor] = useState<'new' | PulseEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPulseEntries();
      setEntries(data);
      setError(null);
      // Default to the latest month, and keep the selection if it still exists.
      setSelectedMonth((prev) =>
        prev && data.some((e) => e.month === prev)
          ? prev
          : data.length
            ? data[data.length - 1].month
            : null,
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load Pulse data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedIndex = useMemo(
    () => entries.findIndex((e) => e.month === selectedMonth),
    [entries, selectedMonth],
  );
  const selected = selectedIndex >= 0 ? entries[selectedIndex] : null;
  const previous = selectedIndex > 0 ? entries[selectedIndex - 1] : null;
  // The sparkline stops at the selected month rather than running to the end.
  const history = selectedIndex >= 0 ? entries.slice(0, selectedIndex + 1) : [];

  const onlyExamples = entries.length > 0 && entries.every((e) => e.isExample);

  const handleSave = async (month: string, inputs: PulseInputs) => {
    setSaving(true);
    try {
      await savePulseEntry(month, inputs);
      toast.success(`Saved ${monthLabel(month)}`);
      setFormFor(null);
      setSelectedMonth(month);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (month: string) => {
    setSaving(true);
    try {
      await deletePulseEntry(month);
      toast.success(`Deleted ${monthLabel(month)}`);
      setFormFor(null);
      setSelectedMonth(null);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  /** Recomputes the selected month from our own data, keeping manual values. */
  const handleSync = async () => {
    if (!selectedMonth) return;
    setSyncing(true);
    try {
      await autofillAndSavePulse(selectedMonth);
      toast.success(`Synced ${monthLabel(selectedMonth)} from our data`);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExporting(true);
    try {
      await downloadPulseExport(format);
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ListingPageContainer className="font-sans">
      <ListingSectionHeader
        icon={IconActivityHeartbeat}
        title="Circles Pulse"
        subtitle="The Circles Club — membership growth & health, tracked monthly"
        trailing={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" className="gap-2" onClick={load} disabled={loading}>
              <IconRefresh size={18} />
              Refresh
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleExport('csv')}
              disabled={exporting || !entries.length}
            >
              <IconDownload size={18} />
              CSV
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleExport('xlsx')}
              disabled={exporting || !entries.length}
            >
              <IconDownload size={18} />
              Excel
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleSync}
              disabled={!selected || syncing}
            >
              <IconWand size={18} />
              {syncing ? 'Syncing…' : 'Sync from data'}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => selected && setFormFor(selected)}
              disabled={!selected}
            >
              <IconPencil size={18} />
              Edit month
            </Button>
            <Button className="gap-2" onClick={() => setFormFor('new')}>
              <IconPlus size={18} />
              Log a month
            </Button>
          </div>
        }
      />

      {onlyExamples ? (
        <div className="glass-card p-4 text-sm text-amber-300 border border-amber-500/30 bg-amber-500/5">
          Showing example data — log a real month to replace it.
        </div>
      ) : null}

      {error ? (
        <div className="glass-card p-6 flex flex-col items-center gap-3">
          <p className="font-bold">Could not load Circles Pulse</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={load}>Retry</Button>
        </div>
      ) : loading ? (
        <div className="glass-card p-12 text-center text-muted-foreground">Loading…</div>
      ) : !entries.length ? (
        <div className="glass-card p-12 flex flex-col items-center gap-3">
          <p className="font-bold">No months logged yet</p>
          <p className="text-sm text-muted-foreground">
            Log a month to start tracking growth and health.
          </p>
          <Button className="gap-2" onClick={() => setFormFor('new')}>
            <IconPlus size={18} />
            Log a month
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <label htmlFor="pulse-period" className="text-sm font-semibold">
              Period
            </label>
            <select
              id="pulse-period"
              className="h-10 rounded-xl border border-border/50 bg-muted/20 px-3 text-sm"
              value={selectedMonth ?? ''}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {[...entries].reverse().map((e) => (
                <option key={e.month} value={e.month}>
                  {monthLabel(e.month)}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              Cards show the selected month. Charts and the ledger always show every month.
            </span>
          </div>

          {selected ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              {KPI_SPECS.map((spec) => (
                <KpiCard
                  key={spec.key}
                  spec={spec}
                  history={history}
                  current={selected}
                  previous={previous}
                />
              ))}
            </div>
          ) : null}

          <PulseCharts entries={entries} />

          <div className="glass-card p-6 flex flex-col gap-4 overflow-hidden">
            <h3 className="text-base font-bold">Monthly ledger</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/50">
                    <th className="py-2 pr-4">Month</th>
                    <th className="py-2 pr-4">Total users</th>
                    <th className="py-2 pr-4">New</th>
                    <th className="py-2 pr-4">Activation</th>
                    <th className="py-2 pr-4">Invite share</th>
                    <th className="py-2 pr-4">MAU %</th>
                    <th className="py-2 pr-4">Members</th>
                    <th className="py-2 pr-4">Members %</th>
                    <th className="py-2 pr-4">Free→member</th>
                    <th className="py-2 pr-4">CAC</th>
                    <th className="py-2 pr-4">LTV</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {[...entries].reverse().map((e) => (
                    <tr key={e.month} className="border-b border-border/30 last:border-0">
                      <td className="py-2 pr-4 font-semibold whitespace-nowrap">
                        {monthLabel(e.month)}
                        {e.isExample ? (
                          <span className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">
                            example
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4">{fmtInt(e.kpis.totalUsers)}</td>
                      <td className="py-2 pr-4">{fmtInt(e.kpis.newUsers)}</td>
                      <td className="py-2 pr-4">{fmtPct(e.kpis.activationRate)}</td>
                      <td className="py-2 pr-4">{fmtPct(e.kpis.inviteShare)}</td>
                      <td className="py-2 pr-4">{fmtPct(e.kpis.mauPct)}</td>
                      <td className="py-2 pr-4">{fmtInt(e.kpis.fullMembers)}</td>
                      <td className="py-2 pr-4">{fmtPct(e.kpis.membersPctUsers)}</td>
                      <td className="py-2 pr-4">{fmtPct(e.kpis.freeToMember)}</td>
                      <td className="py-2 pr-4">{fmtMoney(e.kpis.cac)}</td>
                      <td className="py-2 pr-4">{fmtMoney(e.kpis.ltv)}</td>
                      <td className="py-2">
                        <Button variant="ghost" size="sm" onClick={() => setFormFor(e)}>
                          <IconPencil size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card p-6">
            <button
              className="flex items-center gap-2 text-base font-bold w-full text-left"
              onClick={() => setShowDefinitions((v) => !v)}
            >
              <IconChevronDown
                size={18}
                className={`transition-transform ${showDefinitions ? '' : '-rotate-90'}`}
              />
              How each KPI is calculated
            </button>
            {showDefinitions ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {[
                  ['Total users', 'The cumulative account count you entered.'],
                  ['New users', 'Accounts created in the month.'],
                  ['Activation rate', 'Activated ÷ new users. Activated = 5+ friends and 1 plan within 14 days.'],
                  ['Invite share', 'Invited ÷ new users, from the sign-up source.'],
                  ['MAU %', 'Monthly active users ÷ total users.'],
                  ['Full members', 'Active paid subscriptions, cumulative.'],
                  ['Members % of users', 'Full members ÷ total users.'],
                  ['Free period → member', 'Converted ÷ free periods ended in the month.'],
                  ['CAC', 'Acquisition spend ÷ new paying customers. Lower is better.'],
                  ['LTV', 'ARPM × average member lifetime in months (lifetime = 1 ÷ monthly churn).'],
                  ['LTV:CAC', 'LTV ÷ CAC. 3× or more is healthy, under 1× is not.'],
                ].map(([label, text]) => (
                  <div key={label} className="rounded-xl border border-border/50 bg-muted/10 p-3">
                    <p className="font-bold">{label}</p>
                    <p className="text-muted-foreground text-xs mt-1">{text}</p>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground md:col-span-2">
                  A KPI with no denominator shows as — rather than 0, so a missing
                  input never reads as a real result.
                </p>
              </div>
            ) : null}
          </div>
        </>
      )}

      {formFor ? (
        <MonthForm
          entry={formFor === 'new' ? null : formFor}
          defaultMonth={selectedMonth || currentMonth()}
          priorTotalUsers={
            formFor === 'new'
              ? entries.length
                ? entries[entries.length - 1].totalUsers
                : null
              : (() => {
                  const i = entries.findIndex((e) => e.month === formFor.month);
                  return i > 0 ? entries[i - 1].totalUsers : null;
                })()
          }
          existingMonths={entries.map((e) => e.month)}
          saving={saving}
          onCancel={() => setFormFor(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ) : null}
    </ListingPageContainer>
  );
};

export default PulsePage;
