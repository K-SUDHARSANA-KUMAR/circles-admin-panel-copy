'use client';

import React from 'react';
import { 
  IconUser,
  IconMail,
  IconPhone,
  IconCalendar,
  IconAward,
  IconRefresh,
  IconCheck,
  IconCopy,
  IconWorld,
  IconHeart,
  IconEye,
  IconMapPin,
} from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type Customer } from '@/services/user.service';
import {
  DetailPageContainer,
  DetailPageHeader,
  detailStyles,
} from '@/components/shared/listing-page';

export interface DetailedUser extends Customer {
  role?: string;
  referralCode?: string;
  referralMedium?: string | null;
  subscriptionStatus?: string | null;
  profileVerificationStatus?: string;
  profileVerified?: boolean;
  bio?: string | null;
  dob?: string | null;
  gender?: string | null;
  cityId?: string | null;
  location?: string | null;
  profilePictureUrl?: string | null;
  coverPhotoUrl?: string | null;
  visibility?: string;
  socialLinks?: Record<string, string>;
  interests?: string;
  languages?: string;
}

interface UserDetailsViewProps {
  user: DetailedUser;
  copiedCode: boolean;
  onCopyCode: () => void;
  interestMap: Record<string, string>;
  cityMap?: Record<string, string>;
  headerActions?: React.ReactNode;
  onBack: () => void;
  onReload: () => void;
  pageTitle?: string;
  pageSubtitle?: string;
  backLabel?: string;
}

export default function UserDetailsView({
  user,
  copiedCode,
  onCopyCode,
  interestMap,
  cityMap = {},
  headerActions,
  onBack,
  onReload,
  pageTitle = 'User Details',
  pageSubtitle = 'View complete profile and verification data',
  backLabel = 'Back to List',
}: UserDetailsViewProps) {
  const displayName = `${user.name || ''} ${user.lastName || ''}`.trim() || 'Unnamed User';
  const score = user.reliabilityScore !== undefined ? user.reliabilityScore : 100;

  const parseArrayField = (fieldValue?: string): string[] => {
    if (!fieldValue) return [];
    try {
      const parsed = JSON.parse(fieldValue);
      if (Array.isArray(parsed)) return parsed;
      return [fieldValue];
    } catch (e) {
      if (fieldValue.startsWith('[') && fieldValue.endsWith(']')) {
        return fieldValue.slice(1, -1).split(',').map(s => s.replace(/['"]/g, '').trim()).filter(Boolean);
      }
      return [fieldValue];
    }
  };

  const formatDate = (dateStr?: string | null, includeTime = true) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', includeTime ? {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      } : {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const getScoreStyle = (s: number) => {
    if (s >= 80) {
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    } else if (s >= 50) {
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    }
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const interestsList = parseArrayField(user.interests);

  const cityValue = cityMap[user.cityId || ''] || user.location || '—';

  return (
    <DetailPageContainer className="pb-12">
      <DetailPageHeader
        icon={IconUser}
        title={pageTitle}
        subtitle={pageSubtitle}
        onBack={onBack}
        backLabel={backLabel}
        trailing={
          <>
            <Button
              variant="outline"
              onClick={onReload}
              className={`${detailStyles.outlineButton} flex items-center gap-1.5`}
            >
              <IconRefresh size={12} />
              <span>Reload</span>
            </Button>
            {headerActions}
          </>
        }
      />

      {/* Profile summary — name & photo live here, not in page header */}
      <div className={detailStyles.card}>
        <div className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-20 h-20 rounded-full border-2 border-[#18181b] bg-zinc-900 overflow-hidden shrink-0 shadow-lg flex items-center justify-center font-bold text-2xl text-[#d8b4fe] select-none">
            {user.profilePictureUrl ? (
              <img 
                src={user.profilePictureUrl} 
                alt={displayName} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              user.name ? user.name.charAt(0).toUpperCase() : 'U'
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight truncate">{displayName}</h2>
            <div className="flex flex-col gap-1.5 text-xs text-zinc-400">
              {user.email ? (
                <span className="flex items-center gap-1.5 min-w-0">
                  <IconMail size={13} className="text-zinc-600 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </span>
              ) : null}
              {user.phone ? (
                <span className="flex items-center gap-1.5">
                  <IconPhone size={13} className="text-zinc-600 shrink-0" />
                  <span>{user.phone}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Structured Fast Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Reliability Score Card */}
        <Card className={`${detailStyles.card} border-0 shadow-none`}>
          <CardHeader className="p-4 pb-2">
            <CardDescription className={`${detailStyles.sectionLabel} flex items-center justify-between`}>
              <span>Reliability Score</span>
              <IconAward size={14} className={detailStyles.cardTitleIcon} />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <h2 className={detailStyles.metricValue}>{score}%</h2>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Referral Code Card */}
        <Card className="border-[#18181b] bg-[#09090b]">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center justify-between">
              <span>Referral Code</span>
              <IconCopy size={14} className="text-[#d8b4fe]" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2.5">
            {user.referralCode ? (
              <div className="flex items-center justify-between bg-zinc-900/60 border border-[#18181b] px-3 py-1.5 rounded-md">
                <code className="text-sm font-mono font-bold text-white">{user.referralCode}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-white"
                  onClick={onCopyCode}
                >
                  {copiedCode ? <IconCheck size={12} className="text-emerald-400" /> : <IconCopy size={12} />}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic py-1.5">No Referral Code</p>
            )}

            <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-[#18181b]/40 pt-2 mt-1">
              <span>Referral Medium</span>
              <span className="font-bold text-white capitalize">{user.referralMedium || 'Direct / N/A'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Verification Status Card */}
        <Card className="border-[#18181b] bg-[#09090b]">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center justify-between">
              <span>Profile Verification</span>
              <IconEye size={14} className="text-[#d8b4fe]" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <h2 className="text-sm font-bold text-white capitalize">{user.profileVerificationStatus || 'Pending'}</h2>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${user.profileVerified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{user.profileVerified ? 'Profile Verified' : 'Awaiting Review'}</span>
            </p>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card className="border-[#18181b] bg-[#09090b]">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center justify-between">
              <span>Subscription Status</span>
              <IconWorld size={14} className="text-[#d8b4fe]" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <h2 className="text-sm font-bold text-white capitalize">{user.subscriptionStatus || 'Free Tier'}</h2>
            <p className="text-[10px] text-muted-foreground mt-1">
              {user.subscriptionStatus ? 'Active Subscription' : 'No active paid plan'}
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Personal & account details */}
      <Card className="border-[#18181b] bg-[#09090b] shadow-md">
        <CardHeader className={detailStyles.cardHeader}>
          <CardTitle className={detailStyles.cardTitle}>
            <IconUser size={16} className={detailStyles.cardTitleIcon} />
            <span>Personal Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Date of Birth</label>
              <div className="flex items-center gap-1.5 text-xs text-white">
                <IconCalendar size={13} className="text-muted-foreground/60" />
                <span>{formatDate(user.dob, false)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">City</label>
              <div className="flex items-center gap-1.5 text-xs text-white">
                <IconMapPin size={13} className="text-muted-foreground/60" />
                <span>{cityValue}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Location</label>
              <div className="text-xs text-white">
                <span>{user.location || '—'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-[#18181b]/50">
            <div className="space-y-1.5">
              <label className={`${detailStyles.fieldLabel} flex items-center gap-1`}>
                <IconHeart size={11} />
                <span>User Interests</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {interestsList.length > 0 ? (
                  interestsList
                    .map((interestId) => interestMap[interestId])
                    .filter((name): name is string => Boolean(name))
                    .map((name, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold bg-zinc-900/60 border border-[#18181b] text-foreground/80 px-2 py-0.5 rounded capitalize"
                      >
                        {name}
                      </span>
                    ))
                ) : (
                  <span className="text-xs text-muted-foreground/40 italic">None listed</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Social Links</label>
              <div className="text-xs text-muted-foreground/60">
                {user.socialLinks && Object.keys(user.socialLinks).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(user.socialLinks).map(([platform, handle]) => (
                      <div key={platform} className="text-white font-medium">
                        <span className="capitalize text-muted-foreground font-normal">{platform}:</span> {handle}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="italic">No linked social profiles</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </DetailPageContainer>
  );
}
