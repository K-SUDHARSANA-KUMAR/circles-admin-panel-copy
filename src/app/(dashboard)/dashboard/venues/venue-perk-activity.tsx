'use client';

import React, { useCallback, useEffect, useRef, useState } from "react";
import { IconCamera, IconReceipt, IconRefresh, IconUser } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchPerkCaptureEvents,
  fetchPerkRedemptions,
  voidPerkRedemption,
  type PerkCaptureEvent,
  type PerkLogUser,
  type PerkRedemption,
} from "@/services/venue-perks.service";
import { formatUk, RANGE_LABELS, rangeParams, type Range } from "@/lib/uk-month";

const PAGE_SIZE = 20;
const UK = "Europe/London";

function periodLabel(r: PerkRedemption): string {
  const start = new Date(r.periodStartsAt);
  const when =
    r.perkPeriod === "month"
      ? start.toLocaleString("en-GB", { timeZone: UK, month: "short", year: "numeric" })
      : r.perkPeriod === "week"
        ? `w/c ${start.toLocaleString("en-GB", { timeZone: UK, day: "numeric", month: "short" })}`
        : start.toLocaleString("en-GB", { timeZone: UK, day: "numeric", month: "short" });
  return `${when} · limit ${r.perkLimit}/${r.perkPeriod}`;
}

function MemberCell({ user }: { user: PerkLogUser | null }) {
  const name = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "";
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-300 shrink-0">
        <IconUser size={16} />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-white truncate">
          {user ? name || `User ${user.id}` : "Deleted account"}
        </p>
        {user?.phone && <p className="text-zinc-500 text-[11px]">{user.phone}</p>}
      </div>
    </div>
  );
}

function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 pt-3 text-xs text-zinc-400">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span>
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}

function EmptyOrError({
  loading,
  error,
  empty,
  emptyText,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyText: string;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 gap-2 text-zinc-500 text-xs">
        <IconRefresh size={18} className="animate-spin text-purple-400" />
        Loading...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3 text-xs text-red-400">
        {error}
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex items-center justify-center h-40 text-xs text-zinc-500">{emptyText}</div>
    );
  }
  return null;
}

function RedemptionsTab({ venueId, range }: { venueId: string; range: Range }) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PerkRedemption[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ redeemed: 0, voided: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voiding, setVoiding] = useState<PerkRedemption | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  // Only the latest request may update the table (fast paging can overlap).
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPerkRedemptions({
        venueId,
        page,
        limit: PAGE_SIZE,
        ...rangeParams(range),
      });
      if (request !== requestRef.current) return;
      setItems(res.items);
      setTotalPages(res.totalPages);
      setSummary(res.summary);
    } catch (err: unknown) {
      if (request !== requestRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load perk redemptions");
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [venueId, page, range]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmVoid = async () => {
    if (!voiding) return;
    setSaving(true);
    try {
      await voidPerkRedemption(voiding.id, reason);
      toast.success("Redemption voided. It no longer counts toward the member's limit.");
      setVoiding(null);
      setReason("");
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to void the redemption");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="font-semibold px-3 py-1 rounded-full bg-emerald-950/50 text-emerald-300 border border-emerald-800/50">
          {summary.redeemed} redeemed
        </span>
        <span className="font-semibold px-3 py-1 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
          {summary.voided} voided
        </span>
      </div>

      <EmptyOrError
        loading={loading}
        error={error}
        empty={items.length === 0}
        emptyText="No perk redemptions in this period."
        onRetry={load}
      />

      {!loading && !error && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#18181b] bg-[#0c0c0e]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#18181b] bg-zinc-900/50 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Redeemed (UK time)</th>
                <th className="py-3 px-4">Counts toward</th>
                <th className="py-3 px-4">Device</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18181b] text-xs">
              {items.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3 px-4">
                    <MemberCell user={r.user} />
                  </td>
                  <td className="py-3 px-4 text-zinc-300">{formatUk(r.redeemedAt)}</td>
                  <td className="py-3 px-4 text-zinc-400">{periodLabel(r)}</td>
                  <td className="py-3 px-4 text-zinc-400">{r.platform ?? "—"}</td>
                  <td className="py-3 px-4">
                    {r.voided ? (
                      <span
                        className="text-zinc-400"
                        title={r.voidReason || undefined}
                      >
                        Voided {formatUk(r.voidedAt)}
                        {r.voidReason ? ` · ${r.voidReason}` : ""}
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">Counted</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {!r.voided && (
                      <Button variant="outline" size="sm" onClick={() => setVoiding(r)}>
                        Void
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} totalPages={totalPages} onPage={setPage} />

      <Dialog open={!!voiding} onOpenChange={(open) => !open && !saving && setVoiding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void this redemption?</DialogTitle>
            <DialogDescription>
              Use this when a redeem was a mistake (e.g. nothing was served). It stays in the
              log, but stops counting toward the member&apos;s limit, so they can redeem again.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            placeholder="Reason (optional), e.g. Tapped by mistake, no drink served"
          />
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setVoiding(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={saving} onClick={confirmVoid}>
              {saving ? "Voiding..." : "Void redemption"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CaptureEventsTab({ venueId, range }: { venueId: string; range: Range }) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PerkCaptureEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPerkCaptureEvents({
        venueId,
        page,
        limit: PAGE_SIZE,
        ...rangeParams(range),
      });
      if (request !== requestRef.current) return;
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      if (request !== requestRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load the screenshot log");
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [venueId, page, range]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-zinc-500">
        Android blocks screenshots of the badge. iOS cannot block them, so the app reports
        them here. {total} in this period.
      </p>

      <EmptyOrError
        loading={loading}
        error={error}
        empty={items.length === 0}
        emptyText="No screenshots or recordings of the badge in this period."
        onRetry={load}
      />

      {!loading && !error && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#18181b] bg-[#0c0c0e]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#18181b] bg-zinc-900/50 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">What</th>
                <th className="py-3 px-4">Device</th>
                <th className="py-3 px-4">When (UK time)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18181b] text-xs">
              {items.map((e) => (
                <tr key={e.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3 px-4">
                    <MemberCell user={e.user} />
                  </td>
                  <td className="py-3 px-4 text-amber-300">
                    {e.kind === "screenshot" ? "Screenshot" : "Screen recording"}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">{e.platform ?? "—"}</td>
                  <td className="py-3 px-4 text-zinc-300">{formatUk(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}

/**
 * Venue page section: who redeemed this venue's perk (with Void), and the
 * screenshots / recordings the app caught on the member badge.
 */
export function VenuePerkActivity({ venueId }: { venueId: string }) {
  const [range, setRange] = useState<Range>("this-month");

  return (
    <div className="glass-card p-6 mt-8 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <IconReceipt size={20} className="text-primary" />
            Perk activity
          </h3>
          <p className="text-xs text-muted-foreground">
            Every redeem of this venue&apos;s perk, from the member badge. Use the monthly
            count to settle up with the venue or brand.
          </p>
        </div>
        <div className="flex gap-2">
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              onClick={() => setRange(r)}
            >
              {RANGE_LABELS[r]}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="redemptions">
        <TabsList>
          <TabsTrigger value="redemptions">
            <IconReceipt size={14} className="mr-1.5" />
            Redemptions
          </TabsTrigger>
          <TabsTrigger value="captures">
            <IconCamera size={14} className="mr-1.5" />
            Screenshots
          </TabsTrigger>
        </TabsList>
        <TabsContent value="redemptions" className="pt-3">
          {/* Keyed by range: a new filter starts again from page 1. */}
          <RedemptionsTab key={range} venueId={venueId} range={range} />
        </TabsContent>
        <TabsContent value="captures" className="pt-3">
          <CaptureEventsTab key={range} venueId={venueId} range={range} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
