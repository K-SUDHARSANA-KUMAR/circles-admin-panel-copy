import React from "react";
import VenueDetailClient from "./VenueDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

const VenueDetailsPage = async ({ params }: Props) => {
  const { id } = await params;
  
  return <VenueDetailClient venueId={id} />;
};

export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default VenueDetailsPage;
