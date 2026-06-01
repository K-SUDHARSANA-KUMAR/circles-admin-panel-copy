import React from "react";
import VenueDetailClient from "./VenueDetailClient";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const VenueDetailsPage = async ({ params, searchParams }: Props) => {
  const { id } = await params;
  const sParams = await searchParams;
  const editMode = sParams?.edit === 'true';
  
  return <VenueDetailClient venueId={id} editMode={editMode} />;
};

export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default VenueDetailsPage;
