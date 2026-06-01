'use client';

import React, { useState, useEffect } from "react";
import { VenueForm } from "../venue-form";
import { fetchVenueById, type Venue } from "@/services/venue.service";
import { IconRefresh, IconAlertCircle } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

interface VenueDetailClientProps {
  venueId: string;
  editMode?: boolean;
}

export default function VenueDetailClient({ venueId, editMode }: VenueDetailClientProps) {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVenue = async () => {
    if (!venueId || venueId === 'placeholder') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVenueById(venueId);
      setVenue(data);
    } catch (err: any) {
      setError(err.message || "Failed to load venue details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVenue();
  }, [venueId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 bg-[#222222] border border-[#333333] p-12 rounded-lg min-h-[400px] max-w-[1400px] mx-auto animate-in fade-in duration-300">
        <IconRefresh size={32} className="animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Retrieving venue configurations...</p>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 bg-[#222222] border border-[#333333] p-12 rounded-lg min-h-[400px] max-w-[1400px] mx-auto animate-in fade-in duration-300">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
          <IconAlertCircle size={24} className="text-destructive" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white text-center">Venue Not Found</h3>
          <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto mt-1 text-center">
            {error || "The venue you're looking for doesn't exist or has been removed."}
          </p>
        </div>
        <Button
          onClick={loadVenue}
          variant="outline"
          size="sm"
          className="mt-2 h-9 px-4 border-[#333333]"
        >
          Retry Load
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300">
      <VenueForm 
        initialData={venue} 
        mode={editMode ? "edit" : "view"} 
      />
    </div>
  );
}
