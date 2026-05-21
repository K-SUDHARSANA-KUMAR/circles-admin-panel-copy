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
import { IconPlus, IconTrash, IconChevronRight } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { initialVenues } from "./constants";

const VenuesPage = () => {
  const router = useRouter();
  const [venues, setVenues] = useState(initialVenues);

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this venue?")) {
      setVenues(prev => prev.filter(v => v.id !== id));
    }
  };

  return (
    <div className="flex flex-col p-4 gap-5 w-full max-w-[1400px] mx-auto animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-glow">Venues</h1>
            <div className="hidden sm:inline-flex text-[10px] font-bold text-primary/70 bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10 tracking-widest uppercase">
              {venues.length} Total Spaces
            </div>
          </div>
          <p className="text-muted-foreground text-xs font-medium">Manage your event spaces and locations</p>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="default" 
            className="flex items-center gap-2 h-9 px-4 shadow-xl shadow-primary/20 text-xs font-bold uppercase tracking-wider"
            onClick={() => router.push("/dashboard/venues/create")}
          >
            <IconPlus size={16} />
            <span>Add New Venue</span>
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-card overflow-hidden shadow-2xl border-primary/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50 bg-muted/30">
              <TableHead className="w-[80px] text-primary font-bold uppercase tracking-widest text-xs">ID</TableHead>
              <TableHead className="text-primary font-bold uppercase tracking-widest text-xs">Venue Information</TableHead>
              <TableHead className="text-primary font-bold uppercase tracking-widest text-xs">Location</TableHead>
              <TableHead className="text-right text-primary font-bold uppercase tracking-widest text-xs px-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {venues.map((venue) => (
              <TableRow 
                key={venue.id} 
                className="group border-border/40 hover:bg-primary/5 smooth-transition cursor-pointer relative"
                onClick={() => router.push(`/dashboard/venues/${venue.id}`)}
              >
                <TableCell className="text-xs font-extrabold text-foreground/40 group-hover:text-primary transition-colors">{venue.id}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{venue.name}</span>
                    <span className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                      Managed by <span className="text-foreground/80 font-semibold">{venue.manager}</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-foreground/80 font-medium">{venue.location}</TableCell>
                <TableCell className="text-right px-4">
                  <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-7 px-3 font-bold text-[10px] uppercase tracking-wider rounded-full hover:bg-primary hover:text-white transition-all"
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
                      className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (venue.id) handleDelete(venue.id);
                      }}
                    >
                      <IconTrash size={14} />
                    </Button>
                    <div className="flex items-center text-primary ml-1">
                      <IconChevronRight size={14} />
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default VenuesPage;
