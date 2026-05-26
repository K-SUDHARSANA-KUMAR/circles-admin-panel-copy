'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchAdminUsers, type AdminUser } from '@/services/adminuser.service';
import { 
  IconSearch, 
  IconRefresh, 
  IconAlertCircle, 
  IconUser, 
  IconPhone, 
  IconMail, 
  IconShield,
  IconGenderMale,
  IconGenderFemale
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AdminUserSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="h-[180px] rounded-xl border border-white/5 bg-white/[0.02] animate-pulse p-6 space-y-4"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/5 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-white/10 rounded w-[60%]" />
              <div className="h-3 bg-white/5 rounded w-[45%]" />
            </div>
          </div>
          <div className="border-t border-white/5" />
          <div className="flex justify-between items-center">
            <div className="h-5 bg-white/10 rounded-full w-[80px]" />
            <div className="h-5 bg-white/5 rounded-full w-[60px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query to prevent excessive API requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const loadAdminUsers = useCallback(async (searchVal = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAdminUsers({ search: searchVal });
      setUsers(response.users);
      setTotal(response.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch admin users. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminUsers(debouncedSearch);
  }, [debouncedSearch, loadAdminUsers]);

  const handleRefresh = () => {
    loadAdminUsers(searchQuery);
  };

  const getStatusStyle = (status: string) => {
    const s = status ? status.toLowerCase() : 'active';
    if (s === 'active') {
      return {
        bg: 'rgba(6, 182, 212, 0.1)',
        color: '#06B6D4',
        border: '1px solid rgba(6, 182, 212, 0.2)',
      };
    }
    return {
      bg: 'rgba(239, 68, 68, 0.1)',
      color: '#EF4444',
      border: '1px solid rgba(239, 68, 68, 0.2)',
    };
  };

  const getRoleStyle = (role: string) => {
    const r = role ? role.toLowerCase() : 'admin';
    if (r === 'superadmin' || r === 'super_admin' || r === 'owner') {
      return {
        bg: 'rgba(236, 72, 153, 0.15)',
        color: '#ec4899',
        border: '1px solid rgba(236, 72, 153, 0.3)',
        dot: '#ec4899',
      };
    }
    return {
      bg: 'rgba(124, 58, 237, 0.15)',
      color: '#a78bfa',
      border: '1px solid rgba(124, 58, 237, 0.3)',
      dot: '#7C3AED',
    };
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-700">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-montserrat font-black tracking-tight text-glow">Admin Users</h1>
            {!loading && !error && (
              <span className="text-[10px] font-bold text-primary/70 bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10 tracking-widest uppercase">
                {total} Users
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            Manage and monitor system administrators and their operational status
          </p>
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
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            className="h-9 w-9 shrink-0 border border-white/5 hover:bg-white/5"
            title="Refresh List"
          >
            <IconRefresh size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && <AdminUserSkeleton />}

      {/* Error State */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center animate-in fade-in duration-300">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
            <IconAlertCircle size={28} className="text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Failed to load admin users</p>
            <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
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
      )}

      {/* Empty State */}
      {!loading && !error && users.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center animate-in fade-in duration-300">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
            <IconUser size={24} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {searchQuery ? 'No matching admin users found' : 'No admin users registered'}
          </p>
          <p className="text-xs text-muted-foreground">
            {searchQuery ? 'Try refinement of your search terms.' : 'Register new administrators to get started.'}
          </p>
        </div>
      )}

      {/* Grid Layout */}
      {!loading && !error && users.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => {
            const roleStyle = getRoleStyle(user.role);
            const statusStyle = getStatusStyle(user.status);
            const displayName = user.name ? `${user.name} ${user.lastName || ''}`.trim() : 'Unnamed Admin';

            return (
              <div
                key={user.id}
                className="glass-card p-6 flex flex-col gap-4 smooth-transition hover:glow-primary group cursor-pointer"
              >
                {/* Header Profile Section */}
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white flex-shrink-0 smooth-transition group-hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
                      boxShadow: "0 0 16px rgba(124, 58, 237, 0.4)",
                    }}
                  >
                    {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="space-y-0.5 overflow-hidden flex-1">
                    <p className="text-base font-semibold text-foreground truncate group-hover:text-primary smooth-transition">
                      {displayName}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                      <IconMail size={12} className="shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 truncate">
                        <IconPhone size={11} className="shrink-0" />
                        <span className="truncate">{user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/5" />

                {/* Footer Badges */}
                <div className="flex items-center justify-between mt-auto">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full"
                    style={{
                      background: roleStyle.bg,
                      color: roleStyle.color,
                      border: roleStyle.border,
                    }}
                  >
                    <IconShield size={10} className="shrink-0" />
                    <span>{user.role || 'Admin'}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    {user.gender && (
                      <span className="p-1 rounded-md bg-white/5 text-muted-foreground" title={`Gender: ${user.gender}`}>
                        {user.gender.toLowerCase() === 'male' ? <IconGenderMale size={13} /> : <IconGenderFemale size={13} />}
                      </span>
                    )}

                    <span
                      className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                      style={{
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        border: statusStyle.border,
                      }}
                    >
                      {user.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
