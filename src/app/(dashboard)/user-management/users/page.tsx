'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchCustomers, updateCustomerStatus, type Customer } from '@/services/user.service';
import { 
  IconSearch, 
  IconRefresh, 
  IconAlertCircle, 
  IconUser, 
  IconPhone, 
  IconMail, 
  IconAward,
  IconPencil,
  IconX,
  IconLoader
} from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
          <TableCell className="py-4">
            <div className="h-5 w-12 rounded bg-white/5 animate-pulse" />
          </TableCell>
          <TableCell className="py-4 text-right pr-6">
            <div className="h-8 w-8 ml-auto rounded-full bg-white/5 animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal and status update states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    status: 'active'
  });
  const [saving, setSaving] = useState(false);

  // Debounce search query to prevent excessive API requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const loadCustomers = useCallback(async (searchVal = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCustomers({ search: searchVal, limit: 50, skip: 0 });
      setCustomers(response.customers);
      setTotal(response.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch users. Please try again.';
      setError(msg);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers(debouncedSearch);
  }, [debouncedSearch, loadCustomers]);

  const handleRefresh = () => {
    loadCustomers(searchQuery);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      status: customer.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setFormData({
      status: 'active'
    });
    setEditingCustomer(null);
    setIsModalOpen(false);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    setSaving(true);
    try {
      await updateCustomerStatus(editingCustomer.id, formData.status as 'active' | 'inactive');
      const displayName = editingCustomer.name ? `${editingCustomer.name} ${editingCustomer.lastName || ''}`.trim() : 'User';
      toast.success(`Successfully updated ${displayName}'s status to ${formData.status}`);
      handleCloseModal();
      await loadCustomers(debouncedSearch);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user status.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
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

  const getScoreStyle = (score: number) => {
    if (score >= 80) {
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    } else if (score >= 50) {
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    }
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-700 font-figtree">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-figtree font-black tracking-tight text-glow">Users</h1>
            {!loading && !error && (
              <span className="text-[10px] font-bold text-primary/70 bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10 tracking-widest uppercase">
                {total} Total
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            View and manage system customers, check operational statuses, and view user reliability metrics
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

      {/* Main Table Layout */}
      <div className="glass-card overflow-hidden shadow-2xl border-primary/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50 bg-muted/30 font-figtree">
              <TableHead className="w-[80px] text-white font-bold text-[14px]">
                S.No
              </TableHead>
              <TableHead className="text-white font-bold text-[14px]">
                Name
              </TableHead>
              <TableHead className="text-white font-bold text-[14px]">
                Email
              </TableHead>
              <TableHead className="text-white font-bold text-[14px]">
                Phone No
              </TableHead>
              <TableHead className="text-white font-bold text-[14px]">
                Status
              </TableHead>
              <TableHead className="text-white font-bold text-[14px]">
                Reliability Score
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
                <TableCell colSpan={7} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-4 py-8 animate-in fade-in duration-300">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
                      <IconAlertCircle size={28} className="text-destructive" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Failed to load users</p>
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
            ) : customers.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 py-8 animate-in fade-in duration-300">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                      <IconUser size={24} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {searchQuery ? 'No matching users found' : 'No registered users found'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {searchQuery ? 'Try refinement of your search terms.' : 'Customers will appear here once registered.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer, index) => {
                const statusStyle = getStatusStyle(customer.status);
                const displayName = customer.name ? `${customer.name} ${customer.lastName || ''}`.trim() : 'Unnamed User';
                const score = customer.reliabilityScore !== undefined ? customer.reliabilityScore : 100;
                
                return (
                  <TableRow
                    key={customer.id || index}
                    className="group border-border/40 hover:bg-primary/5 smooth-transition font-figtree"
                  >
                    {/* Index */}
                    <TableCell className="text-xs font-extrabold text-foreground/40 group-hover:text-primary transition-colors">
                      {index + 1}
                    </TableCell>

                    {/* Customer Profile Name */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 smooth-transition group-hover:scale-105"
                          style={{
                            background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
                            boxShadow: "0 0 12px rgba(124, 58, 237, 0.3)",
                          }}
                        >
                          {customer.name ? customer.name.charAt(0).toUpperCase() : 'U'}
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
                        <span className="truncate max-w-[240px]">{customer.email}</span>
                      </div>
                    </TableCell>

                    {/* Phone Number */}
                    <TableCell>
                      {customer.phone ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <IconPhone size={12} className="shrink-0 text-muted-foreground/60" />
                          <span>{customer.phone}</span>
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
                        {customer.status || 'Active'}
                      </span>
                    </TableCell>

                    {/* Reliability Score */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-md border ${getScoreStyle(score)}`}>
                          <IconAward size={12} className="shrink-0" />
                          <span>{score}%</span>
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-2.5 opacity-90 group-hover:opacity-100 transition-all duration-300">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-8 px-3.5 font-bold text-[10px] uppercase tracking-wider rounded-full hover:bg-primary hover:text-white transition-all flex items-center gap-1.5 hover:shadow-lg hover:shadow-primary/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(customer);
                          }}
                          title="Edit User Status"
                        >
                          <IconPencil size={13} />
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

      {/* Slide-out / Modal Dialog for Editing Customer Status */}
      {isModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-white/10 bg-zinc-950/95 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <IconUser size={18} />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white">
                    Edit User Status
                  </CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                    Modify the operational access status for this user
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseModal}
                className="h-8 w-8 text-muted-foreground hover:text-white rounded-lg"
              >
                <IconX size={16} />
              </Button>
            </div>

            <form onSubmit={handleSaveStatus} className="space-y-5">
              
              {/* User Details Readonly */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
                    }}
                  >
                    {editingCustomer.name ? editingCustomer.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {editingCustomer.name ? `${editingCustomer.name} ${editingCustomer.lastName || ''}`.trim() : 'Unnamed User'}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">{editingCustomer.email}</p>
                  </div>
                </div>
              </div>

              {/* Status Toggle Button Group */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  Operational Status <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ status: 'active' })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-bold transition-all ${
                      formData.status === 'active'
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-500/10'
                        : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${formData.status === 'active' ? 'bg-cyan-400 animate-pulse' : 'bg-muted-foreground'}`} />
                    <span>Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ status: 'inactive' })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-bold transition-all ${
                      formData.status === 'inactive'
                        ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/10'
                        : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${formData.status === 'inactive' ? 'bg-rose-400 animate-pulse' : 'bg-muted-foreground'}`} />
                    <span>Inactive</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseModal}
                  className="h-9 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-9 text-xs font-bold uppercase tracking-wider px-5 shadow-xl shadow-primary/20 flex items-center gap-1.5"
                >
                  {saving && <IconLoader size={12} className="animate-spin" />}
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </div>

            </form>
          </Card>
        </div>
      )}

    </div>
  );
}
