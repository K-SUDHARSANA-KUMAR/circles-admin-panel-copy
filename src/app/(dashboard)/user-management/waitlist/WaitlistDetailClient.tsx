'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchCustomerById, approveWaitlistUser, rejectWaitlistUser } from '@/services/user.service';
import { fetchInterestGroups } from '@/services/interest.service';
import { fetchCities } from '@/services/cities.service';
import { IconLoader, IconAlertCircle, IconRefresh, IconCheck, IconX } from '@tabler/icons-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import UserDetailsView, { type DetailedUser } from '@/components/shared/UserDetailsView';

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
      router.push('/user-management/waitlist');
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

  if (!userId) {
    return (
      <div className="max-w-[1400px] mx-auto min-h-[60vh] flex items-center justify-center font-sans">
        <Card className="w-full max-w-md border-destructive/20 bg-[#222222] p-6 shadow-2xl space-y-4 rounded-lg text-center">
          <CardTitle className="text-base font-bold text-white">Missing User ID</CardTitle>
          <CardDescription className="text-[12px] text-muted-foreground">
            Open an applicant from the waitlist to review their profile.
          </CardDescription>
          <Button onClick={handleBack} className="h-9 text-xs font-bold uppercase tracking-wider">
            Back to List
          </Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto min-h-[60vh] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300 font-sans">
        <IconLoader className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Fetching waitlist profile details...</p>
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
              {error || 'No waitlist user data was returned.'}
            </CardDescription>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <Button
              onClick={handleBack}
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

  const headerActions = (
    <div className="flex gap-3 shrink-0 md:ml-auto md:self-center pb-1">
      <Button
        variant="destructive"
        disabled={processing !== null}
        onClick={handleReject}
        className="h-9 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
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
        className="h-9 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
      >
        {processing === 'approve' ? (
          <IconLoader size={12} className="animate-spin" />
        ) : (
          <IconCheck size={14} />
        )}
        <span>Approve</span>
      </Button>
    </div>
  );

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
    />
  );
}
