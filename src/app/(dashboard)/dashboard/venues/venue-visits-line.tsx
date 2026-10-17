'use client';

import { IconMapPinCheck } from "@tabler/icons-react";
import type { VenueVisits } from "@/services/venue-visits.service";

/**
 * Verified visits under a venue in the list: this UK month and all time.
 * A visit is one member at the venue on one day, proven by a perk redeem or an
 * "I'm here" check-in. Totals only — never who visited.
 */
export function VenueVisitsLine({
  visits,
  status,
  className = "",
}: {
  visits: VenueVisits | undefined;
  status: "loading" | "error" | "ready";
  className?: string;
}) {
  const label = (
    <span className="text-zinc-500 font-semibold">Verified visits: </span>
  );

  if (status !== "ready") {
    return (
      <div className={`flex items-center gap-1.5 text-xs ${className}`}>
        <IconMapPinCheck size={13} className="text-emerald-400/70 shrink-0" />
        <span>
          {label}
          <span className="text-zinc-600">{status === "loading" ? "…" : "unavailable"}</span>
        </span>
      </div>
    );
  }

  const month = visits?.period ?? { visits: 0, visitors: 0, perkRedemptions: 0, checkIns: 0 };
  const allTime = visits?.allTime ?? { visits: 0, visitors: 0, perkRedemptions: 0, checkIns: 0 };
  const tooltip =
    `This month: ${month.visits} visits by ${month.visitors} ${month.visitors === 1 ? "member" : "members"} ` +
    `(${month.perkRedemptions} perk redeems, ${month.checkIns} I'm here)\n` +
    `All time: ${allTime.visits} visits by ${allTime.visitors} ${allTime.visitors === 1 ? "member" : "members"} ` +
    `(${allTime.perkRedemptions} perk redeems, ${allTime.checkIns} I'm here)\n` +
    `One member at the venue on one day counts as one visit.`;

  return (
    <div className={`flex flex-col gap-0.5 text-xs ${className}`} title={tooltip}>
      <div className="flex items-center gap-1.5">
        <IconMapPinCheck size={13} className="text-emerald-400 shrink-0" />
        <span>
          {label}
          <span className="text-white font-semibold">{month.visits}</span>
          <span className="text-zinc-400"> this month</span>
          <span className="text-zinc-600"> · </span>
          <span className="text-white font-semibold">{allTime.visits}</span>
          <span className="text-zinc-400"> all time</span>
        </span>
      </div>
      <span className="pl-[19px] text-[11px] text-zinc-500">
        This month: {month.perkRedemptions} perk {month.perkRedemptions === 1 ? "redeem" : "redeems"} · {month.checkIns} I&apos;m here
      </span>
    </div>
  );
}
