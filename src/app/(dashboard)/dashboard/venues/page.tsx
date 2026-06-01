'use client';

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IconPlus, IconTrash, IconLayoutGrid, IconList, IconBuilding, IconUser, IconPencil } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { initialVenues } from "./constants";
import PageHeader from "@/components/shared/page-header";

const VenuesPage = () => {
  const router = useRouter();
  const [venues, setVenues] = useState(initialVenues);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this venue?")) {
      setVenues(prev => prev.filter(v => v.id !== id));
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 font-sans space-y-6">
      
      {/* Actions / Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#09090b] border border-[#18181b] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#d8b4fe] bg-[#1c122c] px-3 py-1.5 rounded-md border border-[#3b1a60] tracking-wider uppercase flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d8b4fe] inline-block"></span>
            {venues.length} Total Spaces
          </span>
        </div>

        <div className="flex items-center gap-3 ml-auto sm:ml-0">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#030303] border border-[#18181b] rounded-lg p-0.5 mr-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-zinc-800 text-white shadow-md'
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
                  ? 'bg-zinc-800 text-white shadow-md'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              <IconLayoutGrid size={14} />
            </button>
          </div>

          <Button 
            variant="default" 
            className="flex items-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wider bg-[#d8b4fe] hover:bg-[#c084fc] text-[#3b0764] transition-all rounded-lg border-none shadow-lg shadow-purple-500/10"
            onClick={() => router.push("/dashboard/venues/create")}
          >
            <IconPlus size={16} className="text-[#3b0764]" />
            <span>Add New Venue</span>
          </Button>
        </div>
      </div>

      {viewMode === 'table' ? (
        /* Main Table Layout */
        <div className="bg-[#09090b] border border-[#18181b] rounded-xl overflow-hidden shadow-xl">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-[#18181b] bg-transparent font-sans">
                <TableHead className="w-[100px] bg-transparent text-muted-foreground/60 font-semibold text-[11px] uppercase tracking-wider py-4 pl-12 pr-4 border-b border-[#18181b]">ID</TableHead>
                <TableHead className="bg-transparent text-muted-foreground/60 font-semibold text-[11px] uppercase tracking-wider py-4 px-6 border-b border-[#18181b]">Venue Information</TableHead>
                <TableHead className="bg-transparent text-muted-foreground/60 font-semibold text-[11px] uppercase tracking-wider py-4 px-6 border-b border-[#18181b]">Location</TableHead>
                <TableHead className="text-right bg-transparent text-muted-foreground/60 font-semibold text-[11px] uppercase tracking-wider py-4 pl-4 pr-12 border-b border-[#18181b]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venues.map((venue) => (
                <TableRow 
                  key={venue.id} 
                  className="group border-b border-zinc-800/60 hover:bg-zinc-900/30 transition-colors font-sans cursor-pointer relative"
                  onClick={() => router.push(`/dashboard/venues/${venue.id}`)}
                >
                  <TableCell className="text-xs font-semibold text-purple-400 pl-12 pr-4 py-5">
                    {venue.id}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-zinc-100 group-hover:text-primary transition-colors">{venue.name}</span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1.5 mt-1 font-normal">
                        <IconUser size={13} className="text-zinc-500 shrink-0" />
                        Managed by <span className="text-zinc-300 font-medium">{venue.manager}</span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-zinc-400 font-normal px-6 py-4">{venue.location}</TableCell>
                  <TableCell className="text-right pl-4 pr-12 py-4">
                    <div className="flex justify-end gap-2.5 opacity-90 group-hover:opacity-100 transition-all duration-200">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-8 px-3.5 py-1 font-semibold text-xs rounded-md bg-transparent border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all flex items-center gap-1.5"
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
                        className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive text-zinc-500 hover:text-zinc-300 transition-all flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (venue.id) handleDelete(venue.id);
                        }}
                      >
                        <IconTrash size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Premium Cards Layout — Figma Style */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {venues.map((venue) => {
            const category = venue.interests && venue.interests[0] ? venue.interests[0] : "Venue";
            const city = venue.city || "Location";

            // Badge mapping to match Figma
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
                onClick={() => router.push(`/dashboard/venues/${venue.id}`)}
                className="group relative flex flex-col bg-[#0c0c0e] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/60"
              >
                {/* Image Cover with title overlay */}
                <div className="relative w-full overflow-hidden" style={{height: '260px'}}>
                  {venue.image ? (
                    <img
                      src={venue.image}
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                      <IconBuilding className="h-8 w-8 text-primary/40 mb-2 relative z-10" />
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest relative z-10">No Image</span>
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
                        router.push(`/dashboard/venues/${venue.id}?edit=true`);
                      }}
                    >
                      <IconPencil size={13} />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 bg-transparent border border-zinc-800 text-red-400 hover:text-red-300 hover:border-red-900/50 rounded-lg flex items-center justify-center transition-all shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (venue.id) handleDelete(venue.id);
                      }}
                    >
                      <IconTrash size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination component (mockup style) */}
      <div className="flex items-center justify-between pt-4 px-1 text-xs">
        <span className="text-zinc-500">
          Showing 1 to {venues.length} of {venues.length} entries
        </span>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-[#18181b] bg-zinc-950 text-zinc-400 hover:bg-zinc-900 transition-all font-semibold"
            disabled
          >
            &lt;
          </button>
          <button 
            type="button"
            className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#8b5cf6] text-white font-bold transition-all shadow-md shadow-primary/20"
          >
            1
          </button>
          <button 
            type="button"
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-[#18181b] bg-zinc-950 text-zinc-400 hover:bg-zinc-900 transition-all font-semibold"
            disabled
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
};

export default VenuesPage;
