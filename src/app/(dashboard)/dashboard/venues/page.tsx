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
    <div className="flex flex-col p-6 gap-8 w-full max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tight text-glow">Venues</h1>
            <div className="hidden sm:inline-flex text-xs font-bold text-primary/70 bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10 tracking-widest uppercase">
              {venues.length} Total Spaces
            </div>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Manage your event spaces and locations</p>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="default" 
            className="flex items-center gap-2 h-11 px-8 shadow-xl shadow-primary/20"
            onClick={() => router.push("/dashboard/venues/create")}
          >
            <IconPlus size={20} />
            <span className="font-bold">Add New Venue</span>
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-card overflow-hidden shadow-2xl border-primary/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50 bg-muted/30">
              <TableHead className="w-[100px] text-primary font-bold uppercase tracking-widest text-sm">ID</TableHead>
              <TableHead className="text-primary font-bold uppercase tracking-widest text-sm">Venue Information</TableHead>
              <TableHead className="text-primary font-bold uppercase tracking-widest text-sm">Location</TableHead>
              <TableHead className="text-right text-primary font-bold uppercase tracking-widest text-sm px-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {venues.map((venue) => (
              <TableRow 
                key={venue.id} 
                className="group border-border/40 hover:bg-primary/5 smooth-transition cursor-pointer relative"
                onClick={() => router.push(`/dashboard/venues/${venue.id}`)}
              >
                <TableCell className="text-base font-black text-foreground/40 group-hover:text-primary transition-colors">{venue.id}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{venue.name}</span>
                    <span className="text-sm text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                      Managed by <span className="text-foreground/80 font-semibold">{venue.manager}</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-base text-foreground/80 font-medium">{venue.location}</TableCell>
                <TableCell className="text-right px-6">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-8 px-4 font-bold text-sm uppercase tracking-wider rounded-full hover:bg-primary hover:text-white transition-all"
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
                      className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (venue.id) handleDelete(venue.id);
                      }}
                    >
                      <IconTrash size={16} />
                    </Button>
                    <div className="flex items-center text-primary ml-2">
                      <IconChevronRight size={18} />
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
