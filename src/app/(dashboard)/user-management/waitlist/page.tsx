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
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@tanstack/react-table';

// Obsolete TableSkeleton removed

export default function WaitlistPage() {
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [processing, setProcessing] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const handleApprove = async (id: string, name: string) => {
    setProcessing({ id, action: 'approve' });
    try {
      await approveWaitlistUser(id);
      toast.success(`Successfully approved ${name}`);
      await loadWaitlist(debouncedSearch, currentPage);
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
      await rejectWaitlistUser(id);
      toast.success(`Successfully rejected ${name}`);
      await loadWaitlist(debouncedSearch, currentPage);
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

  // TanStack columns definition for generic DataTable
  const columns: ColumnDef<WaitlistUser>[] = [
    {
      id: 'sNo',
      header: 'S.No',
      cell: ({ row }) => (
        <span className="text-xs font-extrabold text-white group-hover:text-primary transition-colors">
          {(currentPage - 1) * itemsPerPage + row.index + 1}
        </span>
      ),
    },
    {
      id: 'applicant',
      accessorKey: 'name',
      header: 'Applicant',
      cell: ({ row }) => {
        const displayName = row.original.name ? `${row.original.name} ${row.original.lastName || ''}`.trim() : 'Unnamed Applicant';
        const profileImg = row.original.profilePictureUrl;
        return (
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
        );
      },
    },
    {
      id: 'email',
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconMail size={12} className="shrink-0 text-muted-foreground/60" />
          <span className="truncate max-w-[240px]">{row.original.email}</span>
        </div>
      ),
    },
    {
      id: 'phone',
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconPhone size={12} className="shrink-0 text-muted-foreground/60" />
          <span>{row.original.phone}</span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground/40">—</span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const statusStyle = getStatusStyle(row.original.status);
        return (
          <span
            className="inline-flex text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{
              background: statusStyle.bg,
              color: statusStyle.color,
              border: statusStyle.border,
            }}
          >
            {row.original.status || 'Pending'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right pr-6">Actions</div>,
      cell: ({ row }) => {
        const displayName = row.original.name ? `${row.original.name} ${row.original.lastName || ''}`.trim() : 'Unnamed Applicant';
        const isProcessingThis = processing?.id === row.original.id;
        const isApproving = isProcessingThis && processing?.action === 'approve';
        const isRejecting = isProcessingThis && processing?.action === 'reject';
        const isAnyProcessing = processing !== null;

        return (
          <div className="flex justify-end gap-2.5 opacity-90 group-hover:opacity-100 transition-all duration-300">
            {/* Approve Tick Button */}
            <Button
              variant="secondary"
              size="sm"
              disabled={isAnyProcessing}
              className="h-8 w-8 rounded-full bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-emerald-400 p-0 flex items-center justify-center smooth-transition hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50"
              onClick={(e) => {
                e.stopPropagation();
                handleApprove(row.original.id, displayName);
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
                handleReject(row.original.id, displayName);
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
        );
      },
    },
  ];

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
          <Link href="/user-management/waitlist/rejected">
            <Button
              variant="outline"
              className="h-9 text-xs border-[#333333] hover:bg-[#333333] text-rose-400 hover:text-rose-300 transition-colors"
            >
              View Rejected Users
            </Button>
          </Link>
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
      {error ? (
        <div className="flex flex-col items-center justify-center gap-4 py-8 bg-[#222222] border border-[#333333] rounded-lg">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
            <IconAlertCircle size={28} className="text-destructive" />
          </div>
          <div className="space-y-1 text-center">
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
      ) : (
        <div className="glass-card overflow-hidden shadow-2xl border-[#333333] p-4 bg-[#222222]">
          <DataTable
            tableId="active_waitlist_table"
            columns={columns}
            data={users}
            isLoading={loading}
            isColumnDisplay={false}
            isDownload={false}
            manualPagination={true}
            pageCount={Math.ceil(total / itemsPerPage)}
            totalItems={total}
            initialPagination={{ pageIndex: currentPage - 1, pageSize: itemsPerPage }}
            onPaginationChange={(paginationState) => {
              setCurrentPage(paginationState.pageIndex + 1);
            }}
            getRowClassName={() => "group border-border/40 hover:bg-primary/5 smooth-transition"}
          />
        </div>
      )}
    </div>
  );
}
