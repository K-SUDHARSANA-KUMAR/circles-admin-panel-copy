'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCustomerById, type Customer } from '@/services/user.service';
import { fetchInterestGroups } from '@/services/interest.service';
import { 
  IconArrowLeft,
  IconUser,
  IconMail,
  IconPhone,
  IconCalendar,
  IconAward,
  IconAlertCircle,
  IconRefresh,
  IconCheck,
  IconCopy,
  IconWorld,
  IconHeart,
  IconLanguage,
  IconEye,
  IconLoader,
  IconCalendarTime,
  IconInfoCircle,
  IconShieldCheck
} from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Type mapping to allow accessing extended properties beyond basic Customer
interface DetailedUser extends Customer {
  role?: string;
  referralCode?: string;
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

type UserDetailClientProps = {
  params: Promise<{ id: string }>;
};

export default function UserDetailClient({ params }: UserDetailClientProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const userId = resolvedParams.id;

  const [user, setUser] = useState<DetailedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [interestMap, setInterestMap] = useState<Record<string, string>>({});
 
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

  const displayName = `${user.name || ''} ${user.lastName || ''}`.trim() || 'Unnamed User';
  const interestsList = parseArrayField(user.interests);
  const languagesList = parseArrayField(user.languages);
  const score = user.reliabilityScore !== undefined ? user.reliabilityScore : 100;

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 font-sans space-y-6 pb-12">
      
      {/* Back navigation & primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => router.push('/user-management/users')}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white transition-colors w-fit group"
        >
          <IconArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Back to Users List</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadUserDetails}
            className="h-8 text-xs border-[#333333] hover:bg-[#333333] flex items-center gap-1"
          >
            <IconRefresh size={12} />
            <span>Reload Data</span>
          </Button>
        </div>
      </div>

      {/* Main Profile Summary Header Card */}
      <div className="bg-[#222222] border border-[#333333] rounded-lg overflow-hidden relative shadow-lg">
        {/* Profile Details Block */}
        <div className="px-6 pb-6 pt-6 flex flex-col md:flex-row md:items-end gap-6 relative">
          {/* Avatar Container */}
          <div className="w-28 h-28 rounded-full border-4 border-[#222222] bg-[#171717] overflow-hidden z-10 shrink-0 shadow-xl flex items-center justify-center font-bold text-3xl text-primary select-none">
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

          {/* User Primary Meta Info */}
          <div className="flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold text-white tracking-tight">{displayName}</h1>
              
              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                  (user.status || 'active').toLowerCase() === 'active' 
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {user.status || 'Active'}
                </span>
                
                <span className="inline-flex text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  {user.role || 'User'}
                </span>

                {user.profileVerified ? (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <IconShieldCheck size={10} />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <IconAlertCircle size={10} />
                    <span>{user.profileVerificationStatus || 'Pending'}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <IconMail size={13} className="text-muted-foreground/60" />
                <span>{user.email}</span>
              </span>
              {user.phone && (
                <span className="flex items-center gap-1">
                  <IconPhone size={13} className="text-muted-foreground/60" />
                  <span>{user.phone}</span>
                </span>
              )}
              <span className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors" onClick={() => handleCopy(user.id, true)}>
                <IconInfoCircle size={13} className="text-muted-foreground/60" />
                <span>ID: {user.id}</span>
                {copiedId ? (
                  <IconCheck size={11} className="text-emerald-400" />
                ) : (
                  <IconCopy size={11} className="text-muted-foreground/40 opacity-0 group-hover:opacity-100" />
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Fast Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Reliability Score Card */}
        <Card className="border-[#333333] bg-[#222222]">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
              <span>Reliability Score</span>
              <IconAward size={14} className="text-primary/70" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <h2 className="text-2xl font-black text-white">{score}%</h2>
            <div className="w-full bg-[#171717] h-1.5 rounded-full overflow-hidden border border-[#333333]">
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
        <Card className="border-[#333333] bg-[#222222]">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
              <span>Referral Code</span>
              <IconCopy size={14} className="text-primary/70" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {user.referralCode ? (
              <div className="flex items-center justify-between bg-[#171717] border border-[#333333] px-3 py-1.5 rounded-md">
                <code className="text-sm font-mono font-bold text-white">{user.referralCode}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-white"
                  onClick={() => handleCopy(user.referralCode || '')}
                >
                  {copiedCode ? <IconCheck size={12} className="text-emerald-400" /> : <IconCopy size={12} />}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic py-1.5">No Referral Code</p>
            )}
          </CardContent>
        </Card>

        {/* Verification Status Card */}
        <Card className="border-[#333333] bg-[#222222]">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
              <span>Profile Verification</span>
              <IconEye size={14} className="text-primary/70" />
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
        <Card className="border-[#333333] bg-[#222222]">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
              <span>Subscription Status</span>
              <IconWorld size={14} className="text-primary/70" />
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

      {/* Main Profile Info Details Grid (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Column 1: Personal & General Details */}
        <Card className="border-[#333333] bg-[#222222] shadow-md">
          <CardHeader className="border-b border-[#333333]/60 px-5 py-4">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <IconUser size={16} className="text-primary" />
              <span>Personal Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            
            {/* Bio Block */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Biography</label>
              <div className="bg-[#171717] border border-[#333333] p-3.5 rounded-lg">
                {user.bio ? (
                  <p className="text-xs text-foreground/90 leading-relaxed italic">"{user.bio}"</p>
                ) : (
                  <p className="text-xs text-muted-foreground/50 italic">No biographical information provided.</p>
                )}
              </div>
            </div>

            {/* Structured details list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Date of Birth</label>
                <div className="flex items-center gap-1.5 text-xs text-white">
                  <IconCalendar size={13} className="text-muted-foreground/60" />
                  <span>{formatDate(user.dob, false)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Gender</label>
                <div className="flex items-center gap-1.5 text-xs text-white capitalize">
                  <IconHeart size={13} className="text-muted-foreground/60" />
                  <span>{user.gender || 'Not Specified'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">City ID</label>
                <div className="text-xs text-white">
                  <span>{user.cityId || '—'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Location</label>
                <div className="text-xs text-white">
                  <span>{user.location || '—'}</span>
                </div>
              </div>

            </div>

            {/* Taxonomy / Arrays Row (Interests & Languages) */}
            <div className="space-y-4 pt-2 border-t border-[#333333]/50">
              
              <div className="space-y-2">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <IconLanguage size={11} />
                  <span>Spoken Languages</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {languagesList.length > 0 ? (
                    languagesList.map((lang, i) => (
                      <span key={i} className="text-[10px] font-bold bg-[#171717] border border-[#333333] text-foreground/80 px-2 py-0.5 rounded uppercase tracking-wider">
                        {lang}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground/40 italic">None listed</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <IconHeart size={11} />
                  <span>User Interests</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {interestsList.length > 0 ? (
                    interestsList.map((interestId, i) => {
                      const name = interestMap[interestId] || interestId;
                      return (
                        <span key={i} className="text-[10px] font-bold bg-[#171717] border border-[#333333] text-foreground/80 px-2 py-0.5 rounded capitalize">
                          {name}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-muted-foreground/40 italic">None listed</span>
                  )}
                </div>
              </div>

            </div>

          </CardContent>
        </Card>

        {/* Column 2: Account Preferences & Dates */}
        <Card className="border-[#333333] bg-[#222222] shadow-md">
          <CardHeader className="border-b border-[#333333]/60 px-5 py-4">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <IconCalendarTime size={16} className="text-primary" />
              <span>System & Security Meta</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            
            {/* Visibility & Security */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Account Visibility</label>
                <div className="flex items-center gap-1.5 text-xs text-white capitalize">
                  <IconEye size={13} className="text-muted-foreground/60" />
                  <span>{user.visibility || 'Public'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Social Links</label>
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

            {/* Time Stamp Log Cards */}
            <div className="bg-[#171717] border border-[#333333] p-3.5 rounded-lg space-y-2.5 pt-2">
              <label className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground block border-b border-[#333333] pb-1.5">Audit Lifecycle</label>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Joined / Created At</span>
                <span className="font-semibold text-white font-sans">{formatDate(user.createdAt)}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Last Profile Update</span>
                <span className="font-semibold text-white font-sans">{formatDate(user.updatedAt)}</span>
              </div>
            </div>



          </CardContent>
        </Card>

      </div>



    </div>
  );
}
