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
import { IconPlus, IconTrash, IconLayoutGrid, IconList } from "@tabler/icons-react";
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#222222] border border-[#333333] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 tracking-wider uppercase">
            {venues.length} Total Spaces
          </span>
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
              <span>Table</span>
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
              <span>Cards</span>
            </button>
          </div>

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

      {viewMode === 'table' ? (
        /* Main Table Layout */
        <div className="bg-[#222222] border border-[#333333] rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-[#333333] bg-[#171717] font-sans">
                <TableHead className="w-[100px] text-white font-bold text-[13px] py-3">ID</TableHead>
                <TableHead className="text-white font-bold text-[13px] py-3">Venue Information</TableHead>
                <TableHead className="text-white font-bold text-[13px] py-3">Location</TableHead>
                <TableHead className="text-right text-white font-bold text-[13px] px-6 py-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venues.map((venue) => (
                <TableRow 
                  key={venue.id} 
                  className="group border-b border-[#333333] hover:bg-white/5 transition-colors font-sans cursor-pointer relative"
                  onClick={() => router.push(`/dashboard/venues/${venue.id}`)}
                >
                  <TableCell className="text-xs font-bold text-muted-foreground/50 group-hover:text-primary transition-colors">
                    {venue.id}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground/90 group-hover:text-primary transition-colors">{venue.name}</span>
                      <span className="text-xs text-muted-foreground/60 flex items-center gap-1 mt-0.5 font-normal">
                        Managed by <span className="text-foreground/80 font-medium">{venue.manager}</span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-normal">{venue.location}</TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex justify-end gap-2.5 opacity-90 group-hover:opacity-100 transition-all duration-200">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-8 px-3 font-medium text-xs rounded-md bg-[#171717] hover:bg-[#333333] border border-[#333333] hover:border-primary/50 text-primary transition-colors flex items-center gap-1.5"
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
                        className="h-8 w-8 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50 transition-colors"
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
        /* Premium Cards Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((venue) => (
            <div
              key={venue.id}
              onClick={() => router.push(`/dashboard/venues/${venue.id}`)}
              className="group relative flex flex-col justify-between bg-[#222222] hover:bg-[#282828] border border-[#333333] hover:border-primary/40 rounded-xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* ID badge top right */}
              <span className="absolute top-4 right-4 text-[10px] font-extrabold text-muted-foreground/45 group-hover:text-primary transition-colors bg-white/5 group-hover:bg-primary/10 px-2.5 py-0.5 rounded border border-white/5 group-hover:border-primary/10 uppercase tracking-widest font-mono">
                {venue.id}
              </span>

              <div className="space-y-4">
                {/* Title & Manager */}
                <div className="space-y-1 pr-12">
                  <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors truncate">
                    {venue.name}
                  </h3>
                  <p className="text-xs text-muted-foreground/60 font-medium">
                    Managed by <span className="text-foreground/80 font-bold">{venue.manager}</span>
                  </p>
                </div>

                {/* Location Info */}
                <div className="bg-[#171717] border border-[#2a2a2a] p-3 rounded-lg">
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
          ))}
        </div>
      )}
    </div>
  );
};

export default VenuesPage;
