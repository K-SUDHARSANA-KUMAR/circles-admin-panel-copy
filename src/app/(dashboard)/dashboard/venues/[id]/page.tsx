import React from "react";
import { VenueForm, Venue } from "../venue-form";
import { initialVenues } from "../constants";

type Props = {
  params: Promise<{ id: string }>;
};

const VenueDetailsPage = async ({ params }: Props) => {
  const { id } = await params;
  
  const venue = initialVenues.find(v => v.id === id);

  if (!venue) {
    return (
      <div className="text-center py-12 animate-in fade-in duration-300">
        <h3 className="text-sm font-semibold text-white">Venue Not Found</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">The venue you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300">
      <VenueForm 
        initialData={venue} 
        mode="view" // Default mode, VenueForm will check searchParams
      />
    </div>
  );
};

export async function generateStaticParams() {
  return initialVenues.map((venue) => ({
    id: venue.id,
  }));
}

export default VenueDetailsPage;
