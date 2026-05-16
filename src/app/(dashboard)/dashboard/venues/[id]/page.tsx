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
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold">Venue not found</h1>
        <p className="text-muted-foreground mt-2">The venue you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
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
