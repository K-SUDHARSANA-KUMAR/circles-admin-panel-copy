'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchCustomerById, approveWaitlistUser, rejectWaitlistUser } from '@/services/user.service';
import { fetchInterestGroups } from '@/services/interest.service';
import { fetchCities } from '@/services/cities.service';
import { IconLoader, IconCheck, IconX, IconShieldCheck } from '@tabler/icons-react';
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

export default function WaitlistDetailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('id');

  const [user, setUser] = useState<DetailedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [interestMap, setInterestMap] = useState<Record<string, string>>({});
  const [cityMap, setCityMap] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<'approve' | 'reject' | null>(null);

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

  const handleCopy = (text: string, isId = false) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isId) {
      setCopiedId(true);
      toast.success('User ID copied to clipboard');
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedCode(true);
      toast.success('Referral code copied');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleApprove = async () => {
    if (!user) return;
    setProcessing('approve');
    try {
      await approveWaitlistUser(user.id);
      const name = `${user.name || ''} ${user.lastName || ''}`.trim() || 'User';
      toast.success(`Successfully approved ${name}`);
      await loadUserDetails();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve user.';
      toast.error(message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!user) return;
    setProcessing('reject');
    try {
      await rejectWaitlistUser(user.id);
      const name = `${user.name || ''} ${user.lastName || ''}`.trim() || 'User';
      toast.success(`Successfully rejected ${name}`);
      await loadUserDetails();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reject user.';
      toast.error(message);
    } finally {
      setProcessing(null);
    }
  };

  const handleBack = () => router.push('/user-management/waitlist');

  const headerActions = user ? (
    <div className="flex gap-3 shrink-0 flex-wrap">
      <Button
        variant="destructive"
        disabled={processing !== null}
        onClick={handleReject}
        className="h-8 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
      >
        {processing === 'reject' ? (
          <IconLoader size={12} className="animate-spin" />
        ) : (
          <IconX size={14} />
        )}
        <span>Reject</span>
      </Button>
      <Button
        disabled={processing !== null}
        onClick={handleApprove}
        className="h-8 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
      >
        {processing === 'approve' ? (
          <IconLoader size={12} className="animate-spin" />
        ) : (
          <IconCheck size={14} />
        )}
        <span>Approve</span>
      </Button>
    </div>
  ) : null;

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

  const displayName = `${user.name || ''} ${user.lastName || ''}`.trim() || 'Unnamed Applicant';

  return (
    <UserDetailsView
      user={user}
      copiedId={copiedId}
      copiedCode={copiedCode}
      onCopyId={() => handleCopy(user.id, true)}
      onCopyCode={() => handleCopy(user.referralCode || '', false)}
      interestMap={interestMap}
      cityMap={cityMap}
      headerActions={headerActions}
      onBack={handleBack}
      onReload={loadUserDetails}
      pageTitle={displayName}
      pageSubtitle="Review and verify waitlist applicant"
      backLabel="Back to Waitlist"
    />
  );
}
