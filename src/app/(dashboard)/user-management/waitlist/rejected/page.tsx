'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchRejectedWaitlist, type WaitlistUser } from '@/services/user.service';
import {
  IconUser,
  IconPhone,
  IconMail,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ListingPageContainer,
  ListingSectionHeader,
  ListingToolbar,
  ListingErrorPanel,
  listingStyles,
} from '@/components/shared/listing-page';
import { IconUserX } from '@tabler/icons-react';
import Image from 'next/image';
import Link from 'next/link';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@tanstack/react-table';

// Obsolete TableSkeleton removed

export default function RejectedWaitlistPage() {
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
      const response = await fetchRejectedWaitlist({ search: searchVal, limit: itemsPerPage, skip });

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
  ];

  return (
    <ListingPageContainer>
      <ListingSectionHeader
        icon={IconUserX}
        title="Rejected Waitlist"
        subtitle={`${total} rejected applicants`}
      />

      <ListingToolbar
        countLabel={`${total} Rejected Users`}
        showCount={!loading && !error}
        searchPlaceholder="Search by name or email..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={handleRefresh}
        refreshDisabled={loading}
        refreshLoading={loading}
        leadingActions={
          <Link href="/user-management/waitlist">
            <Button
              variant="outline"
              className="h-8 text-xs border-[#18181b] bg-[#09090b] hover:bg-[#18181b] text-zinc-300 hover:text-white rounded-lg transition-colors"
            >
              Back to Waitlist
            </Button>
          </Link>
        }
      />

      {error ? (
        <ListingErrorPanel
          title="Failed to load rejected users"
          message={error}
          onRetry={handleRefresh}
        />
      ) : (
        <div className={`${listingStyles.tableWrapper} p-4`}>
          <DataTable
            tableId="rejected_waitlist_table"
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
              if (paginationState.pageSize !== itemsPerPage) {
                setItemsPerPage(paginationState.pageSize);
                setCurrentPage(1);
              } else {
                setCurrentPage(paginationState.pageIndex + 1);
              }
            }}
            getRowClassName={() => "group border-border/40 hover:bg-primary/5 smooth-transition"}
          />
        </div>
      )}
    </ListingPageContainer>
  );
}
