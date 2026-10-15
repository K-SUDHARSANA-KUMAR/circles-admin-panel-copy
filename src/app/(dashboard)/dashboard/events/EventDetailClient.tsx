'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconCalendarEvent } from '@tabler/icons-react';
import { EventForm } from './event-form';
import { fetchAdminEventById, type AdminEvent } from '@/services/admin-event.service';
import {
  DetailLoadingPanel,
  DetailPageContainer,
  DetailPageHeader,
  ListingErrorPanel,
} from '@/components/shared/listing-page';

export default function EventDetailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('id');
  const editMode = searchParams.get('edit') === 'true';
  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvent = async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      setEvent(await fetchAdminEventById(eventId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  if (!eventId) return null;

  if (loading) return <DetailLoadingPanel message="Loading event..." />;

  if (error || !event) {
    return (
      <DetailPageContainer className="min-h-[60vh] flex flex-col justify-center gap-4">
        <DetailPageHeader
          icon={IconCalendarEvent}
          title="Event Details"
          subtitle="Event could not be loaded"
          onBack={() => router.push('/dashboard/events')}
          backLabel="Back to Events"
        />
        <ListingErrorPanel title="Event Not Found" message={error || undefined} onRetry={loadEvent} />
      </DetailPageContainer>
    );
  }

  // key: remount the form when switching view ↔ edit so its state re-seeds from the fetched row.
  return <EventForm key={`${event.id}-${editMode}`} initialData={event} mode={editMode ? 'edit' : 'view'} />;
}
