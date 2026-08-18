'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { VenueForm } from './venue-form';
import { fetchVenueById, type Venue } from '@/services/venue.service';
import { IconBuilding } from '@tabler/icons-react';
import {
  DetailLoadingPanel,
  DetailPageContainer,
  DetailPageHeader,
  ListingErrorPanel,
} from '@/components/shared/listing-page';

export default function VenueDetailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const venueId = searchParams.get('id');
  const editMode = searchParams.get('edit') === 'true';
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVenue = async () => {
    if (!venueId) {
      setLoading(false);
      setError('Venue ID is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVenueById(venueId);
      setVenue(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load venue details';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVenue();
  }, [venueId]);

  const handleBack = () => router.push('/dashboard/venues');

  if (!venueId) {
    return null;
  }

  if (loading) {
    return <DetailLoadingPanel message="Retrieving venue configurations..." />;
  }

  if (error || !venue) {
    return (
      <DetailPageContainer className="min-h-[60vh] flex flex-col justify-center gap-4">
        <DetailPageHeader
          icon={IconBuilding}
          title="Venue Details"
          subtitle="Venue could not be loaded"
          onBack={handleBack}
          backLabel="Back to Venues"
        />
        <ListingErrorPanel
          title="Venue Not Found"
          message={error || "The venue you're looking for doesn't exist or has been removed."}
          onRetry={loadVenue}
        />
      </DetailPageContainer>
    );
  }

  return <VenueForm initialData={venue} mode={editMode ? 'edit' : 'view'} />;
}
