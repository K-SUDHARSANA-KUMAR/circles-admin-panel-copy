'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchWaitlist, approveWaitlistUser, rejectWaitlistUser, type WaitlistUser } from '@/services/user.service';
import {
  IconSearch,
  IconRefresh,
  IconAlertCircle,
  IconUser,
  IconPhone,
  IconMail,
  IconCheck,
  IconX,
  IconLoader
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import Image from 'next/image';

// ─── Table Loading Skeleton ──────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <TableRow key={i} className="hover:bg-transparent border-border/40">
          <TableCell className="py-4 w-[80px]">
            <div className="h-4 w-8 rounded bg-white/5 animate-pulse" />
          </TableCell>
          <TableCell className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse shrink-0" />
              <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
            </div>
          </TableCell>
          <TableCell className="py-4">
            <div className="h-4 w-40 rounded bg-white/5 animate-pulse" />
          </TableCell>
          <TableCell className="py-4">
            <div className="h-4 w-28 rounded bg-white/5 animate-pulse" />
          </TableCell>
          <TableCell className="py-4">
            <div className="h-6 w-16 rounded-full bg-white/5 animate-pulse" />
          </TableCell>
          <TableCell className="py-4 text-right">
            <div className="h-7 w-20 ml-auto rounded bg-white/5 animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VerificationPage() {
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [processing, setProcessing] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);

  // Debounce search query to prevent excessive API requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const loadWaitlist = useCallback(async (searchVal = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWaitlist({ search: searchVal, limit: 50, skip: 0 });
      setUsers(response.users);
      setTotal(response.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch waitlist users. Please try again.';
      setError(msg);
      toast.error('Failed to load waitlist users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWaitlist(debouncedSearch);
  }, [debouncedSearch, loadWaitlist]);

  const handleRefresh = () => {
    loadWaitlist(searchQuery);
  };

  const handleApprove = async (id: string, name: string) => {
    setProcessing({ id, action: 'approve' });
    try {
      const response = await approveWaitlistUser(id);
      // console.log("response ::::::", response);
      toast.success(`Successfully approved ${name}`);
      await loadWaitlist(debouncedSearch);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve waitlist user.';
      toast.error(msg);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    setProcessing({ id, action: 'reject' });
    try {
      const response = await rejectWaitlistUser(id);

      // console.log("response ::::::", response);

      toast.success(`Successfully rejected ${name}`);
      await loadWaitlist(debouncedSearch);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject waitlist user.';
      toast.error(msg);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusStyle = (status: string) => {
    const s = status ? status.toLowerCase() : 'pending';
    if (s === 'approved' || s === 'verified' || s === 'active') {
      return {
        bg: 'rgba(16, 185, 129, 0.1)',
        color: '#10B981',
        border: '1px solid rgba(16, 185, 129, 0.2)',
      };
    } else if (s === 'rejected' || s === 'declined' || s === 'inactive') {
      return {
        bg: 'rgba(239, 68, 68, 0.1)',
        color: '#EF4444',
        border: '1px solid rgba(239, 68, 68, 0.2)',
      };
    }
    return {
      bg: 'rgba(245, 158, 11, 0.1)',
      color: '#F59E0B',
      border: '1px solid rgba(245, 158, 11, 0.2)',
    };
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-700 font-figtree">

      {/* Actions / Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#222222] border border-[#333333] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          {!loading && !error && (
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 tracking-wider uppercase">
              {total} Pending Verification
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            className="h-9 w-9 shrink-0 border-[#333333] hover:bg-[#333333]"
            title="Refresh List"
          >
            <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Main Table Layout */}
      <div className="glass-card overflow-hidden shadow-2xl border-primary/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50 bg-muted/30 font-figtree">
              <TableHead className="w-[80px] text-white font-bold text-[14px]">
                S.No
              </TableHead>
              <TableHead className="text-white font-bold text-[14px]">
                Applicant
              </TableHead>
              <TableHead className="text-white font-bold text-[14px]">
                Email
              </TableHead>
              <TableHead className="text-white font-bold text-[14px]">
                Phone
              </TableHead>
              <TableHead className="text-white font-bold text-[14px]">
                Status
              </TableHead>
              <TableHead className="text-right text-white font-bold text-[14px] px-6">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton />
            ) : error ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-4 py-8 animate-in fade-in duration-300">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
                      <IconAlertCircle size={28} className="text-destructive" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Failed to load verification queue</p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">{error}</p>
                    </div>
                    <Button
                      onClick={handleRefresh}
                      variant="outline"
                      className="gap-2 text-xs font-bold uppercase tracking-wider border-white/10 hover:bg-white/5"
                    >
                      <IconRefresh size={14} />
                      Try Again
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 py-8 animate-in fade-in duration-300">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                      <IconUser size={24} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {searchQuery ? 'No matching applicants found' : 'Queue is currently empty'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {searchQuery ? 'Try refinement of your search terms.' : 'New applications will appear here for verification.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user, index) => {
                const statusStyle = getStatusStyle(user.status);
                const displayName = user.name ? `${user.name} ${user.lastName || ''}`.trim() : 'Unnamed Applicant';
                const profileImg = user?.profilePictureUrl;
                const isProcessingThis = processing?.id === user.id;
                const isApproving = isProcessingThis && processing?.action === 'approve';
                const isRejecting = isProcessingThis && processing?.action === 'reject';
                const isAnyProcessing = processing !== null;

                return (
                  <TableRow
                    key={user.id || index}
                    className="group border-border/40 hover:bg-primary/5 smooth-transition font-figtree"
                  >
                    {/* Index */}
                    <TableCell className="text-xs font-extrabold text-foreground/40 group-hover:text-primary transition-colors">
                      {index + 1}
                    </TableCell>

                    {/* Applicant Profile Name */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 smooth-transition group-hover:scale-105"
                          style={{
                            background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
                            boxShadow: "0 0 12px rgba(124, 58, 237, 0.3)",
                          }}
                        >
                          {profileImg ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-muted shrink-0">
                              <Image
                                src={profileImg}
                                alt="Profile"
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-foreground/90">
                                {displayName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-bold text-foreground/90 group-hover:text-primary transition-colors truncate max-w-[200px]">
                          {displayName}
                        </span>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <IconMail size={12} className="shrink-0 text-muted-foreground/60" />
                        <span className="truncate max-w-[240px]">{user.email}</span>
                      </div>
                    </TableCell>

                    {/* Phone Number */}
                    <TableCell>
                      {user.phone ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <IconPhone size={12} className="shrink-0 text-muted-foreground/60" />
                          <span>{user.phone}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <span
                        className="inline-flex text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          border: statusStyle.border,
                        }}
                      >
                        {user.status || 'Pending'}
                      </span>
                    </TableCell>

                    {/* Action buttons (Approve / Reject) */}
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-2.5 opacity-90 group-hover:opacity-100 transition-all duration-300">
                        {/* Approve Tick Button */}
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isAnyProcessing}
                          className="h-8 w-8 rounded-full bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-emerald-400 p-0 flex items-center justify-center smooth-transition hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(user.id, displayName);
                          }}
                          title="Approve User"
                        >
                          {isApproving ? (
                            <IconLoader size={15} className="animate-spin" />
                          ) : (
                            <IconCheck size={16} />
                          )}
                        </Button>

                        {/* Reject Cross Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isAnyProcessing}
                          className="h-8 w-8 rounded-full bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-400 p-0 flex items-center justify-center smooth-transition hover:shadow-lg hover:shadow-rose-500/20 disabled:opacity-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(user.id, displayName);
                          }}
                          title="Reject User"
                        >
                          {isRejecting ? (
                            <IconLoader size={15} className="animate-spin" />
                          ) : (
                            <IconX size={16} />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

    </div>
  );
}
