'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IconPlus, IconLayoutGrid, IconList, IconBuilding, IconUser, IconPencil, IconRefresh, IconAlertCircle } from "@tabler/icons-react";
import {
  ListingPageContainer,
  ListingSectionHeader,
  ListingToolbar,
  listingStyles,
} from "@/components/shared/listing-page";
import { useRouter, useSearchParams } from "next/navigation";
import VenueDetailClient from "./VenueDetailClient";
import { fetchVenues, fetchFeaturedVenues, type Venue } from "@/services/venue.service";
import { toast } from "sonner";

const VenuesPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailVenueId = searchParams.get("id");

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [filterType, setFilterType] = useState<'all' | 'featured' | 'partner'>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVenues, setTotalVenues] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const debouncedSearch = useDebounce(searchQuery, 500);


  const loadVenues = useCallback(async (searchVal = '', pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      let data: Venue[] = [];
      if (filterType === 'featured') {
        data = await fetchFeaturedVenues();
        setTotalVenues(data.length);
        setTotalPages(1);
      } else {
        data = await fetchVenues({ search: searchVal, page: pageNum, limit: itemsPerPage });
        setTotalVenues((data as { total?: number }).total ?? data.length);
        setTotalPages((data as { totalPages?: number }).totalPages ?? 1);
      }
      setVenues(data);
    } catch (err: any) {
      setError(err.message || "Failed to load venues");
      toast.error(err.message || "Failed to load venues list");
    } finally {
      setLoading(false);
    }
  }, [filterType, itemsPerPage]);

  const prevSearchRef = useRef(debouncedSearch);

  useEffect(() => {
    if (detailVenueId) return;

    if (prevSearchRef.current !== debouncedSearch) {
      prevSearchRef.current = debouncedSearch;
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
    }
    loadVenues(debouncedSearch, currentPage);
  }, [loadVenues, debouncedSearch, currentPage, detailVenueId]);

  if (detailVenueId) {
    return <VenueDetailClient />;
  }

  return (
    <ListingPageContainer className="font-sans">
      <ListingSectionHeader
        icon={IconBuilding}
        title="Venue Management"
        subtitle={`${totalVenues} venues registered`}
      />

      <ListingToolbar
        countLabel={`${totalVenues} Total Spaces`}
        showCount={!loading}
        searchPlaceholder="Search venues..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={() => loadVenues(searchQuery, currentPage)}
        refreshDisabled={loading}
        refreshLoading={loading}
        leadingActions={
          <div className="flex items-center bg-[#030303] border border-[#18181b] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'table'
                  ? 'bg-zinc-800 text-white shadow-md'
                  : 'text-muted-foreground hover:text-white'
                }`}
            >
              <IconList size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'cards'
                  ? 'bg-zinc-800 text-white shadow-md'
                  : 'text-muted-foreground hover:text-white'
                }`}
            >
              <IconLayoutGrid size={14} />
            </button>
          </div>
        }
        primaryAction={
          <Button
            onClick={() => router.push("/dashboard/venues/create")}
            className={listingStyles.primaryButton}
          >
            <IconPlus size={14} />
            <span>Add Venue</span>
          </Button>
        }
      />

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 bg-[#09090b] border border-[#18181b] p-12 rounded-xl min-h-[300px]">
          <IconRefresh size={32} className="animate-spin text-[#d8b4fe]" />
          <p className="text-xs text-zinc-500">Loading operational spaces...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 bg-[#09090b] border border-[#18181b] p-12 rounded-xl min-h-[300px]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
            <IconAlertCircle size={24} className="text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white text-center">Failed to load venues</p>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-0.5 text-center">{error}</p>
          </div>
          <Button
            onClick={() => loadVenues(searchQuery, currentPage)}
            variant="outline"
            size="sm"
            className="mt-1 gap-1.5 text-[10px] font-bold uppercase tracking-wider h-8 border-[#18181b] bg-zinc-900 text-white hover:bg-zinc-800"
          >
            <IconRefresh size={12} />
            Try Again
          </Button>
        </div>
      ) : venues.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 bg-[#09090b] border border-[#18181b] p-12 rounded-xl min-h-[300px]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-950/20 border border-purple-900/30 text-[#d8b4fe]">
            <IconBuilding size={24} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-white">No Venues Found</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs">There are no venues registered under your account yet.</p>
          </div>
          <Button
            onClick={() => router.push("/dashboard/venues/create")}
            size="sm"
            className="h-8 text-xs font-bold uppercase tracking-wider px-4 bg-[#d8b4fe] text-[#3b0764] hover:bg-[#c084fc]"
          >
            Create Your First Venue
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        /* Main Table Layout */
        <div className="bg-[#09090b] border border-[#18181b] rounded-xl overflow-hidden shadow-xl">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-[#18181b] bg-transparent font-sans">
                <TableHead className="bg-transparent text-zinc-500 font-bold text-[10px] uppercase tracking-widest py-4 px-12 border-b border-[#18181b] w-[30%]">Venue Information</TableHead>
                <TableHead className="bg-transparent text-zinc-500 font-bold text-[10px] uppercase tracking-widest py-4 px-12 border-b border-[#18181b] w-[20%]">Location</TableHead>
                <TableHead className="bg-transparent text-zinc-500 font-bold text-[10px] uppercase tracking-widest py-4 px-12 border-b border-[#18181b] w-[15%]">City</TableHead>
                <TableHead className="bg-transparent text-zinc-500 font-bold text-[10px] uppercase tracking-widest py-4 px-12 border-b border-[#18181b] w-[15%]">Manager</TableHead>
                <TableHead className="text-right bg-transparent text-zinc-500 font-bold text-[10px] uppercase tracking-widest py-4 px-12 border-b border-[#18181b] w-[20%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#18181b]">
              {venues.map((venue) => (
                <TableRow
                  key={venue.id}
                  className="group border-b border-[#18181b] hover:bg-[#0c0c0e] transition-colors font-sans cursor-pointer"
                  onClick={() => router.push(`/dashboard/venues?id=${venue.id}`)}
                >
                  <TableCell className="py-5 px-12">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{venue.name}</span>
                      {venue.addressLine1 && (
                        <span className="text-xs text-zinc-500 mt-0.5 font-normal">{venue.addressLine1}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-12 text-sm text-zinc-400 font-normal">{venue.location || '—'}</TableCell>
                  <TableCell className="py-5 px-12 text-sm text-zinc-400 font-normal">{venue.city || '—'}</TableCell>
                  <TableCell className="py-5 px-12">
                    {venue.manager ? (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <IconUser size={12} className="text-zinc-600 shrink-0" />
                        <span>{venue.manager}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-5 px-12">
                    <div className="flex justify-end gap-2.5 opacity-90 group-hover:opacity-100 transition-all duration-200">
                      <button
                        className="text-[#c084fc] hover:text-[#d8b4fe] hover:scale-110 active:scale-95 transition-all p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/venues?id=${venue.id}&edit=true`);
                        }}
                        title="Edit Venue"
                      >
                        <IconPencil size={15} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Premium Cards Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {venues.map((venue) => {
            const category = venue.interests && venue.interests[0] ? venue.interests[0] : "Venue";
            const city = venue.city || "Location";

            // Badge mapping
            let badgeText = "Active";
            let badgeClass = "bg-[#2d1657]/80 text-[#d8b4fe] border border-[#6d28d9]/30 backdrop-blur-sm";
            if (venue.status === 'Occupied') {
              badgeText = "Partner";
              badgeClass = "bg-black/50 text-zinc-300 border border-zinc-700/50 backdrop-blur-sm";
            } else if (venue.status === 'Maintenance') {
              badgeText = "Featured";
              badgeClass = "bg-[#2d1657]/80 text-[#d8b4fe] border border-[#6d28d9]/30 backdrop-blur-sm";
            }

            return (
              <div
                key={venue.id}
                onClick={() => router.push(`/dashboard/venues?id=${venue.id}`)}
                className="group relative flex flex-col bg-[#0c0c0e] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/60"
              >
                {/* Image Cover with title overlay */}
                <div className="relative w-full overflow-hidden" style={{ height: '260px' }}>
                  {venue.image ? (
                    <img
                      src={venue.image}
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-950/20 to-transparent" />
                      <IconBuilding className="h-8 w-8 text-purple-400/40 mb-2 relative z-10" />
                      <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest relative z-10">No Image</span>
                    </div>
                  )}

                  {/* Deep fade-to-card gradient at bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/30 to-transparent" />

                  {/* Title + Badge overlaid on image bottom */}
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-end justify-between gap-2">
                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 drop-shadow-md">
                      {venue.name}
                    </h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${badgeClass}`}>
                      {badgeText}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
                  {/* Category & City */}
                  <p className="text-xs text-zinc-500 font-medium">
                    {category} · {city}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 h-8 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all text-xs font-medium rounded-lg flex items-center justify-center gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/venues?id=${venue.id}&edit=true`);
                      }}
                    >
                      <IconPencil size={13} />
                      <span>Edit Venue</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination footer */}
      {!loading && !error && venues.length > 0 && (
        <div className="flex items-center justify-between border-t border-[#18181b] pt-4 px-1 text-xs mt-4">
          <span className="text-zinc-500">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalVenues)} of {totalVenues} venues
          </span>
          <div className="flex items-center gap-2">
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-7 px-2 text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-800 focus:outline-none transition-all cursor-pointer mr-2 select-none"
              aria-label="Records per page"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={40}>40</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="h-7 px-3 text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 hover:text-white rounded-lg transition-all"
            >
              Previous
            </Button>
            <span className="text-[11px] text-zinc-400 px-1 font-semibold select-none">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="h-7 px-3 text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 hover:text-white rounded-lg transition-all"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </ListingPageContainer>
  );
};

export default VenuesPage;
