'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWaitlist, approveWaitlistUser, rejectWaitlistUser, type WaitlistUser } from '@/services/user.service';
import { fetchCities } from '@/services/cities.service';
import {
  IconSearch,
  IconRefresh,
  IconAlertCircle,
  IconUser,
  IconPhone,
  IconMapPin,
  IconAward,
  IconShieldCheck
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Link from 'next/link';

export default function WaitlistPage() {
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [processing, setProcessing] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const router = useRouter();
  const [cityMap, setCityMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadCities() {
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
    }
    loadCities();
  }, []);

  // Debounce search query to prevent excessive API requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const loadWaitlist = useCallback(async (searchVal = '', page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * itemsPerPage;
      const response = await fetchWaitlist({ search: searchVal, limit: itemsPerPage, skip });
      setUsers(response.users);
      setTotal(response.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch waitlist users. Please try again.';
      setError(msg);
      toast.error('Failed to load waitlist users');
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage]);

  useEffect(() => {
    loadWaitlist(debouncedSearch, currentPage);
  }, [debouncedSearch, currentPage, loadWaitlist]);

  const handleRefresh = () => {
    loadWaitlist(searchQuery, currentPage);
  };

  const getScoreStyle = (score: number) => {
    if (score >= 80) {
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    } else if (score >= 50) {
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    }
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-700">

      {/* Actions / Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#09090b] border border-[#18181b] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          {!loading && !error && (
            <span className="text-[10px] font-bold text-[#d8b4fe] bg-[#1c122c] px-2.5 py-1 rounded-md border border-[#3b1a60] tracking-wider uppercase select-none">
              {total} Pending Verification
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link href="/user-management/waitlist/rejected">
            <Button
              variant="outline"
              className="h-8 text-xs border-[#18181b] bg-[#09090b] hover:bg-[#18181b] text-rose-400 hover:text-rose-300 rounded-lg transition-colors"
            >
              View Rejected Users
            </Button>
          </Link>
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 rounded-lg"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            className="h-8 w-8 shrink-0 border-[#18181b] bg-[#09090b] hover:bg-[#18181b] rounded-lg"
            title="Refresh List"
          >
            <IconRefresh size={12} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Main Table Layout */}
      {error ? (
        <div className="flex flex-col items-center justify-center gap-4 py-8 bg-[#09090b] border border-[#18181b] rounded-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
            <IconAlertCircle size={28} className="text-destructive" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-sm font-semibold text-white">Failed to load verification queue</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">{error}</p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="gap-2 text-xs font-bold uppercase tracking-wider border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800 h-8"
          >
            <IconRefresh size={12} />
            Try Again
          </Button>
        </div>
      ) : (
        <div className="bg-[#09090b] border border-[#18181b] rounded-xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#18181b]">
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-8 select-none w-[20%]">
                    Name
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-8 select-none w-[15%]">
                    Phone No
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-8 select-none w-[12%]">
                    Status
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-8 select-none w-[13%]">
                    City
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-8 select-none w-[12%]">
                    Referral Code
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-8 select-none w-[13%]">
                    Medium
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-8 select-none w-[10%]">
                    Score
                  </th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-8 select-none w-[5%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181b]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400" />
                      <p className="text-xs text-zinc-500 mt-2 font-medium">Loading waitlist users...</p>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <IconUser size={32} className="text-zinc-600" />
                        <p className="text-xs font-semibold text-zinc-400">No waitlisted users found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const displayName = user.name ? `${user.name} ${user.lastName || ''}`.trim() : 'Unnamed Applicant';
                    const profilePictureUrl = user.profilePictureUrl;
                    const cityId = (user as any).cityId || (user as any).city_id;
                    const cityName = (cityId && cityMap[cityId]) || (user as any).city?.name || (user as any).city || cityId;
                    const code = (user as any).referralCode;
                    const medium = (user as any).referralMedium;
                    const score = (user as any).reliabilityScore !== undefined ? (user as any).reliabilityScore : 100;
                    const status = (user.status || 'pending').toLowerCase();

                    return (
                      <tr
                        key={user.id}
                        onClick={() => router.push(`/user-management/waitlist/${user.id}`)}
                        className="group hover:bg-[#0c0c0e] transition-colors duration-200 cursor-pointer"
                      >
                        {/* Name */}
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-purple-950/20 text-[#d8b4fe] border border-purple-900/40 overflow-hidden">
                              {profilePictureUrl ? (
                                <img 
                                  src={profilePictureUrl} 
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
                            <span className="text-sm font-semibold text-white truncate max-w-[160px]">
                              {displayName}
                            </span>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-5 px-8">
                          {user.phone ? (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                              <IconPhone size={12} className="shrink-0 text-zinc-600" />
                              <span>{user.phone}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600 select-none">—</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-5 px-8">
                          {status === 'approved' || status === 'verified' || status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1c122c]/60 border border-[#3b1a60]/50 text-[#d8b4fe] text-[11px] font-semibold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc]" />
                              Approved
                            </span>
                          ) : status === 'rejected' || status === 'declined' || status === 'inactive' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/20 border border-red-900/30 text-rose-400 text-[11px] font-semibold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2d1f10]/60 border border-[#5f3e15]/50 text-amber-400 text-[11px] font-semibold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Pending
                            </span>
                          )}
                        </td>

                        {/* City */}
                        <td className="py-5 px-8">
                          {cityName ? (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                              <IconMapPin size={12} className="shrink-0 text-zinc-600" />
                              <span className="truncate max-w-[120px]">{cityName}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600 select-none">—</span>
                          )}
                        </td>

                        {/* Referral Code */}
                        <td className="py-5 px-8">
                          {code ? (
                            <code className="text-xs font-mono font-bold text-white bg-zinc-900 border border-zinc-800/80 px-2 py-0.5 rounded">
                              {code}
                            </code>
                          ) : (
                            <span className="text-xs text-zinc-600 select-none">—</span>
                          )}
                        </td>

                        {/* Referral Medium */}
                        <td className="py-5 px-8">
                          {medium ? (
                            <span className="inline-flex text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 select-none">
                              {medium}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600 select-none">—</span>
                          )}
                        </td>

                        {/* Reliability Score */}
                        <td className="py-5 px-8">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md border ${getScoreStyle(score)} select-none`}>
                            <IconAward size={12} className="shrink-0" />
                            <span>{score}%</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-5 px-8 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => router.push(`/user-management/waitlist/${user.id}`)}
                              className="text-[#c084fc] hover:text-[#d8b4fe] hover:scale-110 active:scale-95 transition-all p-1"
                              title="Review & Verify User"
                            >
                              <IconShieldCheck size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#18181b] px-8 py-4">
              <div className="text-[11px] text-zinc-500 text-left">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="h-7 px-3 text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 hover:text-white rounded-lg transition-all"
                >
                  Previous
                </Button>
                <div className="text-[11px] text-zinc-400 px-1 font-semibold select-none">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="h-7 px-3 text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 hover:text-white rounded-lg transition-all"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
