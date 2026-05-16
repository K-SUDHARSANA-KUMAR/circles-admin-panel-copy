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
          <h1 className="text-4xl font-black tracking-tight text-glow">Venues</h1>
          <p className="text-muted-foreground text-sm font-medium">Manage your event spaces and locations</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex text-xs font-bold text-primary/70 bg-primary/5 px-4 py-2 rounded-full border border-primary/10 tracking-widest uppercase">
            {venues.length} Total Spaces
          </div>
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
              <TableHead className="w-[100px] text-primary font-bold uppercase tracking-widest text-[10px]">ID</TableHead>
              <TableHead className="text-primary font-bold uppercase tracking-widest text-[10px]">Venue Information</TableHead>
              <TableHead className="text-primary font-bold uppercase tracking-widest text-[10px]">Location</TableHead>
              <TableHead className="text-primary font-bold uppercase tracking-widest text-[10px] text-center">Capacity</TableHead>
              <TableHead className="text-primary font-bold uppercase tracking-widest text-[10px]">Status</TableHead>
              <TableHead className="text-right text-primary font-bold uppercase tracking-widest text-[10px] px-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {venues.map((venue) => (
              <TableRow 
                key={venue.id} 
                className="group border-border/40 hover:bg-primary/5 smooth-transition cursor-pointer relative"
                onClick={() => router.push(`/dashboard/venues/${venue.id}`)}
              >
                <TableCell className="font-black text-foreground/40 group-hover:text-primary transition-colors">{venue.id}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground group-hover:text-primary transition-colors">{venue.name}</span>
                    <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                      Managed by <span className="text-foreground/80 font-semibold">{venue.manager}</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-foreground/80 font-medium">{venue.location}</TableCell>
                <TableCell className="text-center">
                  <div className="inline-flex items-center justify-center bg-muted/50 w-12 h-8 rounded-lg border border-border/50 text-xs font-bold">
                    {venue.capacity}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-tighter font-black border ${
                    venue.status === 'Available' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                    venue.status === 'Occupied' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  }`}>
                    {venue.status}
                  </span>
                </TableCell>
                <TableCell className="text-right px-6">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-8 px-4 font-bold text-[11px] uppercase tracking-wider rounded-full hover:bg-primary hover:text-white transition-all"
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
                        handleDelete(venue.id);
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
