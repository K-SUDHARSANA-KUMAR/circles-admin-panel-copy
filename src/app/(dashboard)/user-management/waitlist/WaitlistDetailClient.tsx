'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchCustomerById } from '@/services/user.service';
import { fetchInterestGroups } from '@/services/interest.service';
import { fetchCities } from '@/services/cities.service';
import { IconShieldCheck } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import UserDetailsView, { type DetailedUser } from '@/components/shared/UserDetailsView';
import {
  DetailLoadingPanel,
  DetailPageContainer,
  DetailPageHeader,
  ListingErrorPanel,
  listingStyles,
} from '@/components/shared/listing-page';

type WaitlistStatus = 'approved' | 'rejected' | 'pending';

const getWaitlistStatus = (waitlistStatus?: string | null): WaitlistStatus => {
  const normalized = waitlistStatus?.toLowerCase() || '';
  if (normalized === 'approved') return 'approved';
  if (normalized === 'rejected') return 'rejected';
  return 'pending';
};

const WAITLIST_STATUS_BADGE: Record<
  WaitlistStatus,
  { label: string; className: string; dotClassName: string }
> = {
  approved: {
    label: 'Approved',
    className: 'bg-[#1c122c]/60 border border-[#3b1a60]/50 text-[#d8b4fe]',
    dotClassName: 'bg-[#c084fc]',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-950/20 border border-red-900/30 text-rose-400',
    dotClassName: 'bg-rose-500',
  },
  pending: {
    label: 'Pending',
    className: 'bg-[#2d1f10]/60 border border-[#5f3e15]/50 text-amber-400',
    dotClassName: 'bg-amber-400',
  },
};

export default function WaitlistDetailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('id');

  const [user, setUser] = useState<DetailedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [interestMap, setInterestMap] = useState<Record<string, string>>({});
  const [cityMap, setCityMap] = useState<Record<string, string>>({});

  const loadCities = async () => {
    try {
      const cities = await fetchCities();
      const mapping: Record<string, string> = {};
      cities.forEach((city) => {
        const id = city.cityId || city.city_id || city.id;
        if (id) {
          mapping[id] = city.name;
        }
      });
      setCityMap(mapping);
    } catch (err) {
      console.error('Failed to load cities list:', err);
    }
  };

  const loadInterests = async () => {
    try {
      const groups = await fetchInterestGroups();
      const map: Record<string, string> = {};
      groups.forEach((group) => {
        group.subInterests?.forEach((sub) => {
          if (sub.id) {
            map[sub.id] = sub.name;
          }
        });
      });
      setInterestMap(map);
    } catch (err) {
      console.error('Failed to load interests list:', err);
    }
  };

  const loadUserDetails = async () => {
    if (!userId) {
      setLoading(false);
      setError('User ID is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerById(userId);
      setUser(data as DetailedUser);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user details. Please try again.';
      console.error('Error fetching user details:', err);
      setError(message);
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadUserDetails();
      loadInterests();
      loadCities();
    }
  }, [userId]);

  const handleCopyCode = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    toast.success('Referral code copied');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleBack = () => {
    const params = new URLSearchParams();
    if (searchParams.get('tab') === 'approved') {
      params.set('tab', 'approved');
    }
    const query = params.toString();
    router.push(query ? `/user-management/waitlist?${query}` : '/user-management/waitlist');
  };

  const waitlistStatus = getWaitlistStatus(user?.waitlistStatus);
  const statusBadge = WAITLIST_STATUS_BADGE[waitlistStatus];

  const headerActions = (
    <span
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-semibold select-none ${statusBadge.className}`}
      aria-label={`Applicant status: ${statusBadge.label}`}
      role="status"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotClassName}`} aria-hidden />
      {statusBadge.label}
    </span>
  );

  if (!userId) {
    return (
      <DetailPageContainer className="min-h-[60vh] flex items-center justify-center">
        <div className={`${listingStyles.tableWrapper} w-full max-w-md p-6 text-center space-y-4`}>
          <h2 className={listingStyles.title}>
            <IconShieldCheck className={listingStyles.titleIcon} size={22} aria-hidden />
            Missing User ID
          </h2>
          <p className={listingStyles.subtitle}>Open an applicant from the waitlist to review their profile.</p>
          <Button onClick={handleBack} className={listingStyles.primaryButton}>
            Back to List
          </Button>
        </div>
      </DetailPageContainer>
    );
  }

  if (loading) {
    return <DetailLoadingPanel message="Fetching waitlist profile details..." />;
  }

  if (error || !user) {
    return (
      <DetailPageContainer className="min-h-[60vh] flex flex-col justify-center gap-4">
        <DetailPageHeader
          icon={IconShieldCheck}
          title="Waitlist Applicant"
          subtitle="Profile could not be loaded"
          onBack={handleBack}
          backLabel="Back to Waitlist"
        />
        <ListingErrorPanel
          title="Failed to Load User Profile"
          message={error || 'No waitlist user data was returned.'}
          onRetry={loadUserDetails}
        />
      </DetailPageContainer>
    );
  }

  return (
    <UserDetailsView
      user={user}
      copiedCode={copiedCode}
      onCopyCode={() => handleCopyCode(user.referralCode || '')}
      interestMap={interestMap}
      cityMap={cityMap}
      headerActions={headerActions}
      onBack={handleBack}
      onReload={loadUserDetails}
      pageTitle="Waitlist Applicant"
      pageSubtitle="Review and verify waitlist applicant"
      backLabel="Back to Waitlist"
    />
  );
}
