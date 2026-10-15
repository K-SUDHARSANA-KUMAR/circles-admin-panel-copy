'use client';

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconCalendarEvent, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";
import {
  ListingEmptyRow,
  ListingErrorPanel,
  ListingLoadingRow,
  ListingPageContainer,
  ListingPagination,
  ListingSectionHeader,
  ListingStatusBadge,
  ListingTableBody,
  ListingTableHead,
  ListingTableWrapper,
  ListingTh,
  ListingToolbar,
  listingStyles,
} from "@/components/shared/listing-page";
import { fetchAdminEvents, type AdminEvent } from "@/services/admin-event.service";
import EventDetailClient from "./EventDetailClient";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const accessLabel = (e: AdminEvent) =>
  e.audience === "members_only" ? "Members only" : e.generalAccessAt ? "Everyone · members first" : "Everyone";

/** Same rule the app uses: published and before visibleUntil (or endsAt). */
const statusOf = (e: AdminEvent) => {
  if (!e.isPublished) return { variant: "inactive" as const, label: "Draft" };
  if (new Date(e.visibleUntil ?? e.endsAt) <= new Date()) return { variant: "inactive" as const, label: "Ended" };
  return { variant: "active" as const, label: "Live in app" };
};

const EventsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailId = searchParams.get("id");

  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearch = useDebounce(search, 500);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminEvents({ page, limit, search: debouncedSearch });
      setEvents(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    if (!detailId) load();
  }, [load, detailId]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  if (detailId) return <EventDetailClient />;

  return (
    <ListingPageContainer className="font-sans">
      <ListingSectionHeader
        icon={IconCalendarEvent}
        title="Events"
        subtitle="Admin events pinned to the top of All Moments in the app"
      />

      <ListingToolbar
        countLabel={`${total} Events`}
        showCount={!loading}
        searchPlaceholder="Search events..."
        searchValue={search}
        onSearchChange={setSearch}
        onRefresh={load}
        refreshDisabled={loading}
        refreshLoading={loading}
        primaryAction={
          <Button onClick={() => router.push("/dashboard/events/create")} className={listingStyles.primaryButton}>
            <IconPlus size={14} />
            <span>Add Event</span>
          </Button>
        }
      />

      {error ? (
        <ListingErrorPanel title="Failed to load events" message={error} onRetry={load} />
      ) : (
        <ListingTableWrapper
          footer={
            !loading && (
              <ListingPagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                itemsPerPage={limit}
                itemLabel="events"
                onFirst={() => setPage(1)}
                onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                onLast={() => setPage(totalPages)}
                onItemsPerPageChange={(v) => {
                  setLimit(v);
                  setPage(1);
                }}
              />
            )
          }
        >
          <ListingTableHead>
            <ListingTh>Event</ListingTh>
            <ListingTh>Venue</ListingTh>
            <ListingTh>Starts</ListingTh>
            <ListingTh>Access</ListingTh>
            <ListingTh>Status</ListingTh>
          </ListingTableHead>
          <ListingTableBody>
            {loading ? (
              <ListingLoadingRow colSpan={5} message="Loading events..." />
            ) : events.length === 0 ? (
              <ListingEmptyRow colSpan={5} icon={IconCalendarEvent} title="No events yet" description="Create one to pin it in the app." />
            ) : (
              events.map((e) => {
                const status = statusOf(e);
                return (
                  <tr
                    key={e.id}
                    className={`${listingStyles.tableRow} cursor-pointer`}
                    onClick={() => router.push(`/dashboard/events?id=${e.id}`)}
                  >
                    <td className={listingStyles.cellDefault}>
                      <div className="flex items-center gap-3">
                        {e.coverImageUrl ? (
                          <img src={e.coverImageUrl} alt="" className="h-10 w-16 rounded-md object-cover" />
                        ) : (
                          <div className="h-10 w-16 rounded-md bg-zinc-900" />
                        )}
                        <span className="text-sm font-semibold text-white">{e.title}</span>
                      </div>
                    </td>
                    <td className={listingStyles.cellMuted}>{e.venue?.name ?? e.locationName ?? "—"}</td>
                    <td className={listingStyles.cellMuted}>{formatDate(e.startsAt)}</td>
                    <td className={listingStyles.cellMuted}>{accessLabel(e)}</td>
                    <td className={listingStyles.cellDefault}>
                      <ListingStatusBadge variant={status.variant} label={status.label} />
                    </td>
                  </tr>
                );
              })
            )}
          </ListingTableBody>
        </ListingTableWrapper>
      )}
    </ListingPageContainer>
  );
};

export default EventsPage;
