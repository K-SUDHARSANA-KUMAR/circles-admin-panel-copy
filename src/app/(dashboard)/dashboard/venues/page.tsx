'use client';

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { IconPlus, IconTrash, IconLayoutGrid, IconList, IconBuilding, IconRefresh, IconAlertCircle } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { fetchVenues, deleteVenue, fetchFeaturedVenues, type Venue } from "@/services/venue.service";
import PageHeader from "@/components/shared/page-header";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";

const VenuesPage = () => {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [filterType, setFilterType] = useState<'all' | 'featured' | 'partner'>('all');

  const columns: ColumnDef<Venue>[] = [
    {
      id: "sNo",
      header: "S.no",
      cell: ({ row }) => (
        <span className="text-xs font-bold text-muted-foreground/50 group-hover:text-primary transition-colors">
          {row.index + 1}
        </span>
      ),
    },
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-foreground/90 group-hover:text-primary transition-colors">
          {row.original.name}
        </span>
      ),
    },
    {
      id: "addressLine1",
      accessorKey: "addressLine1",
      header: "Address",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-normal">
          {row.original.addressLine1 || "N/A"}
        </span>
      ),
    },
    {
      id: "city",
      accessorKey: "city",
      header: "City name",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-normal">
          {row.original.city || "N/A"}
        </span>
      ),
    },
    {
      id: "popularityScore",
      accessorKey: "popularityScore",
      header: "Popularity Score",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-normal">
          {row.original.popularityScore !== undefined && row.original.popularityScore !== null
            ? row.original.popularityScore
            : "N/A"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right pr-6">Action</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2.5 opacity-90 group-hover:opacity-100 transition-all duration-200 pr-2">
          <Button 
            variant="secondary" 
            size="sm" 
            className="h-8 px-4 font-semibold text-xs rounded-md bg-[#171717] hover:bg-[#333333] border border-[#333333] hover:border-primary/50 text-primary transition-colors"
            onClick={(e) => {
               e.stopPropagation();
               router.push(`/dashboard/venues/${row.original.id}?edit=true`);
            }}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  const loadVenues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: Venue[] = [];
      if (filterType === 'featured') {
        data = await fetchFeaturedVenues();
      } else {
        data = await fetchVenues();
      }
      setVenues(data);
    } catch (err: any) {
      setError(err.message || "Failed to load venues");
      toast.error(err.message || "Failed to load venues list");
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this venue?")) {
      try {
        await deleteVenue(id);
        toast.success("Venue deleted successfully");
        loadVenues();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete venue");
      }
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 font-sans space-y-6">
      
      {/* Actions / Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#222222] border border-[#333333] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="flex h-9 w-[130px] rounded-lg border border-[#333333] bg-[#171717] px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="all">All Venues</option>
            <option value="featured">Featured</option>
            {/* <option value="partner">Partner</option> */}
          </select>

          {!loading && (
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 tracking-wider uppercase shrink-0">
              {venues.length} Total Spaces
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto sm:ml-0">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#171717] border border-[#333333] rounded-lg p-0.5 mr-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              <IconList size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'cards'
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              <IconLayoutGrid size={14} />
            </button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={loadVenues}
            disabled={loading}
            className="h-9 w-9 shrink-0 border-[#333333] hover:bg-[#333333]"
            title="Refresh"
          >
            <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button 
            variant="default" 
            className="flex items-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wider"
            onClick={() => router.push("/dashboard/venues/create")}
          >
            <IconPlus size={16} />
            <span>Add New Venue</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 bg-[#222222] border border-[#333333] p-12 rounded-lg min-h-[300px]">
          <IconRefresh size={32} className="animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading operational spaces and destinations...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 bg-[#222222] border border-[#333333] p-12 rounded-lg min-h-[300px]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
            <IconAlertCircle size={24} className="text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground text-center">Failed to load venues</p>
            <p className="text-xs text-muted-foreground/80 max-w-xs mx-auto mt-0.5 text-center">{error}</p>
          </div>
          <Button
            onClick={loadVenues}
            variant="outline"
            size="sm"
            className="mt-1 gap-1.5 text-[10px] font-bold uppercase tracking-wider h-8 border-[#333333]"
          >
            <IconRefresh size={12} />
            Try Again
          </Button>
        </div>
      ) : venues.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 bg-[#222222] border border-[#333333] p-12 rounded-lg min-h-[300px]">
          <div className="bg-primary/10 p-4 rounded-full text-primary">
            <IconBuilding size={32} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">No Venues Found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">There are no venues registered under your account yet.</p>
          </div>
          <Button
            onClick={() => router.push("/dashboard/venues/create")}
            size="sm"
            className="h-8 text-xs font-bold uppercase tracking-wider px-4"
          >
            Create Your First Venue
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="glass-card overflow-hidden shadow-2xl border-[#333333] p-4 bg-[#222222]">
          <DataTable
            tableId="venues_table"
            columns={columns}
            data={venues}
            isLoading={loading}
            isColumnDisplay={false}
            isDownload={false}
            hidePagination={venues.length <= 10}
            getRowClassName={() => "group border-b border-[#333333] hover:bg-white/5 transition-colors font-sans cursor-pointer relative"}
            onRowClick={(row) => router.push(`/dashboard/venues/${row.id}`)}
          />
        </div>
      ) : (
        /* Premium Cards Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((venue) => (
            <div
              key={venue.id}
              onClick={() => router.push(`/dashboard/venues/${venue.id}`)}
              className="group relative flex flex-col bg-[#222222] hover:bg-[#282828] border border-[#333333] hover:border-primary/40 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Image Cover */}
              <div className="relative h-44 w-full bg-[#171717] overflow-hidden border-b border-[#333333]">
                {venue.image ? (
                  <img
                    src={venue.image}
                    alt={venue.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#1e1e1e] relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                    <IconBuilding className="h-8 w-8 text-primary/40 mb-2 relative z-10" />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest relative z-10">No Image</span>
                  </div>
                )}

                {/* ID badge overlay */}
                {/* <span className="absolute top-3 right-3 text-[10px] font-extrabold text-white bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded border border-white/10 uppercase tracking-widest font-mono z-20">
                  {venue.name}
                </span> */}

                {/* Status badge top left overlay */}
                <div className={`absolute top-3 left-3 px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider border backdrop-blur-md z-20 ${
                  venue.status === 'Available'
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                    : venue.status === 'Occupied'
                    ? 'bg-amber-950/80 text-amber-400 border-amber-800/80'
                    : 'bg-zinc-900/80 text-zinc-400 border-zinc-700/80'
                }`}>
                  {venue.status}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Title & Manager */}
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors truncate">
                      {venue.name}
                    </h3>
                  </div>

                  {/* Location Info */}
                  <div className="bg-[#171717] border border-[#2a2a2a] p-3 rounded-lg flex items-center gap-4">
                    <span className="text-xs text-muted-foreground/85 leading-relaxed truncate block">
                      {venue.location}
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between border-t border-[#333333] pt-4 mt-5">
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Venue Details
                  </span>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-8 px-3 font-semibold text-xs rounded-lg bg-[#171717] hover:bg-[#333333] border border-[#333333] hover:border-primary/50 text-primary transition-colors flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/venues/${venue.id}?edit=true`);
                      }}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50 transition-colors flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (venue.id) handleDelete(venue.id);
                      }}
                    >
                      <IconTrash size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VenuesPage;
