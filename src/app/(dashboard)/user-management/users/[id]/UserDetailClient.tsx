'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCustomerById } from '@/services/user.service';
import { fetchInterestGroups } from '@/services/interest.service';
import { fetchCities } from '@/services/cities.service';
import { IconLoader, IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import UserDetailsView, { type DetailedUser } from '@/components/shared/UserDetailsView';

type UserDetailClientProps = {
  userId: string;
};

export default function UserDetailClient({ userId }: UserDetailClientProps) {
  const router = useRouter();

  const [user, setUser] = useState<DetailedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [interestMap, setInterestMap] = useState<Record<string, string>>({});
  const [cityMap, setCityMap] = useState<Record<string, string>>({});

  const loadCities = async () => {
    try {
      const cities = await fetchCities();
      const mapping: Record<string, string> = {};
      cities.forEach(city => {
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
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerById(userId);
      setUser(data as DetailedUser);
    } catch (err: any) {
      console.error('Error fetching user details:', err);
      setError(err.message || 'Failed to fetch user details. Please try again.');
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

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto min-h-[60vh] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300 font-sans">
        <IconLoader className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Fetching complete user profile details...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-[1400px] mx-auto min-h-[60vh] flex items-center justify-center font-sans">
        <Card className="w-full max-w-md border-destructive/20 bg-[#222222] p-6 shadow-2xl space-y-4 rounded-lg text-center animate-in zoom-in-95 duration-200">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-lg bg-destructive/10 border border-destructive/20">
            <IconAlertCircle size={24} className="text-destructive" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base font-bold text-white">Failed to Load User Profile</CardTitle>
            <CardDescription className="text-[12px] text-muted-foreground mt-0.5">
              {error || 'No customer data was returned by the user-service.'}
            </CardDescription>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <Button
              onClick={() => router.push('/user-management/users')}
              variant="ghost"
              className="h-9 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white"
            >
              Back to List
            </Button>
            <Button
              onClick={loadUserDetails}
              className="h-9 text-xs font-bold uppercase tracking-wider px-5 flex items-center gap-1.5"
            >
              <IconRefresh size={12} />
              <span>Retry</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <UserDetailsView
      user={user}
      copiedId={copiedId}
      copiedCode={copiedCode}
      onCopyId={() => handleCopy(user.id, true)}
      onCopyCode={() => handleCopy(user.referralCode || '', false)}
      interestMap={interestMap}
      cityMap={cityMap}
      onBack={() => router.push('/user-management/users')}
      onReload={loadUserDetails}
    />
  );
}
