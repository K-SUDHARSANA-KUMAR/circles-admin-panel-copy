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
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { initialVenues } from "./constants";
import PageHeader from "@/components/shared/page-header";

const VenuesPage = () => {
  const router = useRouter();
  const [venues, setVenues] = useState(initialVenues);

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

          <div className="flex items-center gap-4 ml-auto sm:ml-0">
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

        {/* Main Table Layout */}
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
      </div>
  );
};

export default VenuesPage;
