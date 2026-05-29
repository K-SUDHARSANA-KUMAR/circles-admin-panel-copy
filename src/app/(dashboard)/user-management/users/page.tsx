'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@tanstack/react-table';

// Obsolete TableSkeleton removed

export default function UsersPage() {
  const router = useRouter();
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

  // TanStack columns definition for generic DataTable
  const columns: ColumnDef<Customer>[] = [
    {
      id: 'sNo',
      header: 'S.No',
      cell: ({ row }) => (
        <span className="text-xs font-bold text-muted-foreground/50 group-hover:text-primary transition-colors">
          {row.index + 1}
        </span>
      ),
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const displayName = row.original.name ? `${row.original.name} ${row.original.lastName || ''}`.trim() : 'Unnamed User';
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-primary/20 text-primary border border-primary/30 transition-transform group-hover:scale-105">
              {row.original.name ? row.original.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="text-sm font-semibold text-foreground/90 group-hover:text-primary transition-colors truncate max-w-[200px]">
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
      header: 'Phone No',
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
            className="inline-flex text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{
              background: statusStyle.bg,
              color: statusStyle.color,
              border: statusStyle.border,
            }}
          >
            {row.original.status || 'Active'}
          </span>
        );
      },
    },
    {
      id: 'reliabilityScore',
      accessorKey: 'reliabilityScore',
      header: 'Reliability Score',
      cell: ({ row }) => {
        const score = row.original.reliabilityScore !== undefined ? row.original.reliabilityScore : 100;
        return (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-md border ${getScoreStyle(score)}`}>
              <IconAward size={12} className="shrink-0" />
              <span>{score}%</span>
            </span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right pr-6">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2.5 opacity-90 group-hover:opacity-100 transition-all duration-300">
          <Button 
            variant="secondary" 
            size="sm" 
            className="h-8 px-3 font-medium text-xs rounded-md bg-[#171717] hover:bg-[#333333] border border-[#333333] hover:border-primary/50 text-primary transition-colors flex items-center gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(row.original);
            }}
            title="Edit User Status"
          >
            <IconPencil size={13} />
            <span>Edit Status</span>
          </Button>
        </div>
      ),
    },
  ];

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

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 font-sans space-y-6">
      
      {/* Actions / Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#222222] border border-[#333333] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 tracking-wider uppercase">
            {total} Total Users
          </span>
        </div>

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
      {error ? (
        <div className="flex flex-col items-center justify-center gap-4 py-8 bg-[#222222] border border-[#333333] rounded-lg">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 border border-destructive/20">
            <IconAlertCircle size={24} className="text-destructive" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-sm font-semibold text-foreground">Failed to load users</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">{error}</p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="gap-2 text-xs font-bold uppercase tracking-wider border-[#333333] hover:bg-[#333333]"
          >
            <IconRefresh size={12} />
            Try Again
          </Button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden shadow-2xl border-[#333333] p-4 bg-[#222222]">
          <DataTable
            tableId="registered_users_table"
            columns={columns}
            data={customers}
            isLoading={loading}
            isColumnDisplay={true}
            isDownload={true}
            getRowClassName={() => "group border-b border-[#333333] hover:bg-white/5 transition-colors font-sans"}
            onRowClick={(row) => router.push(`/user-management/users/${row.id}`)}
          />
        </div>
      )}

      {/* Slide-out / Modal Dialog for Editing Customer Status */}
      {isModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-[#333333] bg-[#222222] p-6 shadow-2xl space-y-5 rounded-lg animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-[#333333] pb-3">
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
              <div className="bg-[#171717] border border-[#333333] rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-primary/20 text-primary border border-primary/30"
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
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-xs font-bold transition-all ${
                      formData.status === 'active'
                        ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10'
                        : 'bg-[#171717] border-[#333333] text-muted-foreground hover:bg-[#333333]/50 hover:text-white'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${formData.status === 'active' ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
                    <span>Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ status: 'inactive' })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-xs font-bold transition-all ${
                      formData.status === 'inactive'
                        ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/10'
                        : 'bg-[#171717] border-[#333333] text-muted-foreground hover:bg-[#333333]/50 hover:text-white'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${formData.status === 'inactive' ? 'bg-rose-400 animate-pulse' : 'bg-muted-foreground'}`} />
                    <span>Inactive</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2 border-t border-[#333333]">
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
                  className="h-9 text-xs font-bold uppercase tracking-wider px-5 flex items-center gap-1.5"
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
