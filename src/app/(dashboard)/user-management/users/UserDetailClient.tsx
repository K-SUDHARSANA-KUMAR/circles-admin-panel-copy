'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchCustomerById } from '@/services/user.service';
import { fetchInterestGroups } from '@/services/interest.service';
import { fetchCities } from '@/services/cities.service';
import { IconUser } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import UserDetailsView, { type DetailedUser } from '@/components/shared/UserDetailsView';
import {
  DetailPageContainer,
  DetailPageHeader,
  DetailLoadingPanel,
  ListingErrorPanel,
  listingStyles,
} from '@/components/shared/listing-page';

export default function UserDetailClient() {
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

  const handleBack = () => router.push('/user-management/users');

  if (!userId) {
    return (
      <DetailPageContainer className="min-h-[60vh] flex items-center justify-center">
        <div className={`${listingStyles.tableWrapper} w-full max-w-md p-6 text-center space-y-4`}>
          <h2 className={listingStyles.title}>
            <IconUser className={listingStyles.titleIcon} size={22} aria-hidden />
            Missing User ID
          </h2>
          <p className={listingStyles.subtitle}>Open a user from the list to view their profile.</p>
          <Button onClick={handleBack} className={listingStyles.primaryButton}>
            Back to List
          </Button>
        </div>
      </DetailPageContainer>
    );
  }

  if (loading) {
    return <DetailLoadingPanel message="Fetching complete user profile details..." />;
  }

  if (error || !user) {
    return (
      <DetailPageContainer className="min-h-[60vh] flex flex-col justify-center gap-4">
        <DetailPageHeader
          icon={IconUser}
          title="User Details"
          subtitle="Profile could not be loaded"
          onBack={handleBack}
        />
        <ListingErrorPanel
          title="Failed to Load User Profile"
          message={error || 'No customer data was returned by the user-service.'}
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
      onBack={handleBack}
      onReload={loadUserDetails}
      pageTitle="User Details"
      pageSubtitle="Registered customer profile"
    />
  );
}
