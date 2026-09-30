'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  IconActivityHeartbeat,
  IconCalendar,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconLock,
  IconPencil,
  IconPlus,
  IconRefresh,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ListingPageContainer,
  ListingSectionHeader,
} from '@/components/shared/listing-page';
import {
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load Pulse data');
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExporting(true);
    try {
      await downloadPulseExport(format);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
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
              onClick={() => handleExport('xlsx')}
              disabled={exporting || !entries.length}
            >
              <IconDownload size={18} />
              Excel
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
          <div className="glass-card p-3.5 sm:p-4 flex items-center justify-between gap-4 flex-wrap border border-white/10 bg-card/60 backdrop-blur-xl rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <IconCalendar size={18} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Active Period</div>
                  <div className="text-sm font-bold tracking-tight text-foreground">
                    {selected ? monthLabel(selected.month) : 'Select Month'}
                  </div>
                </div>
              </div>

              <div className="h-8 w-px bg-border/40 mx-1 hidden sm:block" />

              <div className="flex items-center gap-2">
                <Select
                  value={selectedMonth ?? ''}
                  onValueChange={(val) => setSelectedMonth(val)}
                >
                  <SelectTrigger className="w-[190px] h-9 rounded-xl border-border/60 bg-background/50 hover:bg-background/80 hover:border-border transition-all font-medium text-sm">
                    <SelectValue placeholder="Choose month" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/60 bg-[#18181b] backdrop-blur-2xl shadow-2xl p-1 min-w-[210px] z-50">
                    {[...entries].reverse().map((e) => (
                      <SelectItem
                        key={e.month}
                        value={e.month}
                        className="rounded-lg text-sm font-medium py-2 px-3 cursor-pointer transition-colors focus:bg-primary/20 focus:text-primary"
                      >
                        <div className="flex items-center justify-between w-full gap-3">
                          <span>{monthLabel(e.month)}</span>
                          {e.locked ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full">
                              <IconLock size={10} /> Locked
                            </span>
                          ) : null}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Quick Prev / Next month navigation */}
                <div className="flex items-center gap-1 bg-background/30 p-0.5 rounded-xl border border-border/40">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-background/80 disabled:opacity-30"
                    onClick={() => selectedIndex > 0 && setSelectedMonth(entries[selectedIndex - 1].month)}
                    disabled={selectedIndex <= 0}
                    title="Previous month"
                  >
                    <IconChevronLeft size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-background/80 disabled:opacity-30"
                    onClick={() => selectedIndex < entries.length - 1 && setSelectedMonth(entries[selectedIndex + 1].month)}
                    disabled={selectedIndex >= entries.length - 1}
                    title="Next month"
                  >
                    <IconChevronRight size={16} />
                  </Button>
                </div>
              </div>

              {selected?.locked ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-sm">
                  <IconLock size={12} /> Locked Record
                </span>
              ) : selected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live & Editable
                </span>
              ) : null}
            </div>

            <span className="text-xs text-muted-foreground/80 hidden xl:inline">
              Cards reflect the selected month • Charts & ledger show all-time history
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
                  ['Activation rate', 'Activated ÷ new users. Activated = 5+ friends and 1 Live Moment within 14 days.'],
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
