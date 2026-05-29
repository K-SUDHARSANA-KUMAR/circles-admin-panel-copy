'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchAdminUsers, updateAdminUser, deleteAdminUser, createAdminUser, type AdminUser } from '@/services/adminuser.service';
import { 
  IconSearch, 
  IconRefresh, 
  IconAlertCircle, 
  IconUser, 
  IconPhone, 
  IconMail, 
  IconShield,
  IconGenderMale,
  IconGenderFemale,
  IconPencil,
  IconTrash,
  IconX,
  IconPlus
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@tanstack/react-table';

// Obsolete TableSkeleton removed

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal & Action states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    status: 'active'
  });
  const [addFormData, setAddFormData] = useState({
    email: '',
    name: '',
    lastName: '',
    password: ''
  });
  const [saving, setSaving] = useState(false);

  // TanStack columns definition for generic DataTable
  const columns: ColumnDef<AdminUser>[] = [
    {
      id: 'sNo',
      header: 'S.No',
      cell: ({ row }) => (
        <span className="text-xs font-extrabold text-white group-hover:text-primary transition-colors">
          {row.index + 1}
        </span>
      ),
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Admin User',
      cell: ({ row }) => {
        const displayName = row.original.name ? `${row.original.name} ${row.original.lastName || ''}`.trim() : 'Unnamed Admin';
        return (
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 smooth-transition group-hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
                boxShadow: "0 0 12px rgba(124, 58, 237, 0.3)",
              }}
            >
              {row.original.name ? row.original.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <span className="text-sm font-bold text-foreground/90 group-hover:text-primary transition-colors truncate max-w-[180px]">
              {displayName}
            </span>
          </div>
        );
      },
    },
    {
      id: 'email',
      accessorKey: 'email',
      header: 'Contact Info',
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconMail size={12} className="shrink-0 text-muted-foreground/60" />
            <span className="truncate max-w-[200px]">{row.original.email}</span>
          </div>
          {row.original.phone && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
              <IconPhone size={11} className="shrink-0 text-muted-foreground/50" />
              <span className="truncate">{row.original.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'role',
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const roleStyle = getRoleStyle(row.original.role);
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full"
            style={{
              background: roleStyle.bg,
              color: roleStyle.color,
              border: roleStyle.border,
            }}
          >
            <IconShield size={9} className="shrink-0" />
            <span>{row.original.role || 'Admin'}</span>
          </span>
        );
      },
    },
    {
      id: 'gender',
      accessorKey: 'gender',
      header: 'Gender',
      cell: ({ row }) => row.original.gender ? (
        <div 
          className="inline-flex items-center p-1 rounded bg-white/5 text-muted-foreground/85 border border-white/5" 
          title={`Gender: ${row.original.gender}`}
        >
          {row.original.gender.toLowerCase() === 'male' ? (
            <IconGenderMale size={13} className="text-cyan-400" />
          ) : (
            <IconGenderFemale size={13} className="text-pink-400" />
          )}
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
            {row.original.status || 'Active'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right pr-6">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 pr-4">
          <Button 
            variant="secondary" 
            size="sm" 
            className="h-7 px-3 font-bold text-[10px] uppercase tracking-wider rounded-full hover:bg-primary hover:text-white transition-all flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(row.original);
            }}
          >
            <IconPencil size={12} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50 transition-colors flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row.original);
            }}
            title="Delete Admin"
          >
            <IconTrash size={13} />
          </Button>
        </div>
      ),
    }
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
      toast.error('Failed to load admin users');
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

  // ─── Create Admin User (Bootstrap) ──────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.email.trim() || !addFormData.name.trim() || !addFormData.password.trim()) {
      toast.warning('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        email: addFormData.email.trim(),
        name: addFormData.name.trim(),
        lastName: addFormData.lastName.trim(),
        password: addFormData.password.trim(),
        cognitoUsername: addFormData.email.trim()
      };

      await createAdminUser(payload);
      toast.success(`Successfully added administrator: ${payload.name}`);
      handleCloseAddModal();
      await loadAdminUsers(debouncedSearch);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create admin user.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseAddModal = () => {
    setAddFormData({
      email: '',
      name: '',
      lastName: '',
      password: ''
    });
    setIsAddModalOpen(false);
  };

  // ─── Save User Details (Update) ─────────────────────────────────────────────
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning('Please fill in the first name');
      return;
    }

    if (!editingUser) return;

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        lastName: formData.lastName.trim(),
        status: formData.status
      };

      await updateAdminUser(editingUser.id, payload);
      toast.success(`Successfully updated user: ${formData.name}`);
      handleCloseModal();
      await loadAdminUsers(debouncedSearch);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save admin user.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete Admin User ──────────────────────────────────────────────────────
  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    try {
      await deleteAdminUser(deleteTarget.id);
      toast.success(`Successfully deleted user: ${deleteTarget.name || 'Admin User'}`);
      setDeleteTarget(null);
      await loadAdminUsers(debouncedSearch);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete admin user.';
      toast.error(msg);
    }
  };

  // ─── Close modal and reset form helper ─────────────────────────────────────
  const handleCloseModal = () => {
    setFormData({
      name: '',
      lastName: '',
      status: 'active'
    });
    setEditingUser(null);
    setIsModalOpen(false);
  };

  // ─── Open modal for edit helper ────────────────────────────────────────────
  const handleOpenEdit = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      lastName: user.lastName || '',
      status: user.status || 'active'
    });
    setIsModalOpen(true);
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
      };
    }
    return {
      bg: 'rgba(124, 58, 237, 0.15)',
      color: '#a78bfa',
      border: '1px solid rgba(124, 58, 237, 0.3)',
    };
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-700">
      
      {/* Actions / Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#222222] border border-[#333333] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          {!loading && !error && (
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 tracking-wider uppercase">
              {total} Admin Users
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
            title="Refresh"
          >
            <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wider shrink-0"
          >
            <IconPlus size={16} />
            <span>Add Admin</span>
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
            <p className="text-sm font-semibold text-foreground">Failed to load admin users</p>
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
            tableId="admin_users_table"
            columns={columns}
            data={users}
            isLoading={loading}
            isColumnDisplay={true}
            isDownload={true}
            getRowClassName={() => "group border-border/40 hover:bg-primary/5 smooth-transition"}
          />
        </div>
      )}

      {/* Slide-out / Modal Dialog for Editing Admin User */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-white/10 bg-zinc-950/95 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <IconUser size={18} />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white">
                    Edit Admin User
                  </CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                    Modify operational permissions and details for this administrator
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

            <form onSubmit={handleSaveUser} className="space-y-4">
              
              {/* Name Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    First Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="First Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-9 text-xs bg-white/5 border-white/10 focus:border-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    Last Name
                  </label>
                  <Input
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="h-9 text-xs bg-white/5 border-white/10 focus:border-primary/50"
                  />
                </div>
              </div>

              {/* Status Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  Status <span className="text-destructive">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-1 text-xs text-white focus:outline-none focus:border-primary/50"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
                  disabled={saving || !formData.name.trim()}
                  className="h-9 text-xs font-bold uppercase tracking-wider px-5 shadow-xl shadow-primary/20"
                >
                  {saving ? 'Saving...' : 'Update Details'}
                </Button>
              </div>

            </form>
          </Card>
        </div>
      )}

      {/* Slide-out / Modal Dialog for Bootstrapping New Admin User */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-white/10 bg-zinc-950/95 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <IconPlus size={18} />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white">
                    Add New Admin User
                  </CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                    Register a new administrator and create their system credentials
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseAddModal}
                className="h-8 w-8 text-muted-foreground hover:text-white rounded-lg"
              >
                <IconX size={16} />
              </Button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              
              {/* Name Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    First Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="First Name"
                    value={addFormData.name}
                    onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                    className="h-9 text-xs bg-white/5 border-white/10 focus:border-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    Last Name
                  </label>
                  <Input
                    placeholder="Last Name"
                    value={addFormData.lastName}
                    onChange={(e) => setAddFormData({ ...addFormData, lastName: e.target.value })}
                    className="h-9 text-xs bg-white/5 border-white/10 focus:border-primary/50"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  type="email"
                  placeholder="name@company.com"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                  className="h-9 text-xs bg-white/5 border-white/10 focus:border-primary/50"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  Password <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  type="password"
                  placeholder="Minimum 8 characters with numbers & symbols"
                  value={addFormData.password}
                  onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                  className="h-9 text-xs bg-white/5 border-white/10 focus:border-primary/50"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseAddModal}
                  className="h-9 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !addFormData.name.trim() || !addFormData.email.trim() || !addFormData.password.trim()}
                  className="h-9 text-xs font-bold uppercase tracking-wider px-5 shadow-xl shadow-primary/20"
                >
                  {saving ? 'Creating...' : 'Create Admin'}
                </Button>
              </div>

            </form>
          </Card>
        </div>
      )}

      {/* Custom Gorgeous Deletion Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border-white/10 bg-zinc-950/95 p-5 shadow-2xl space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                <IconAlertCircle size={18} />
                <span>Confirm Deletion</span>
              </CardTitle>
              <CardDescription className="text-xs pt-1">
                Are you sure you want to delete admin user <strong className="text-white font-semibold">"{deleteTarget.name} {deleteTarget.lastName || ''}"</strong>? This administrator will immediately lose access to the system.
              </CardDescription>
            </CardHeader>
            <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
              <Button
                variant="ghost"
                onClick={() => setDeleteTarget(null)}
                className="h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                className="h-8 text-xs font-bold uppercase tracking-wider px-4"
              >
                Confirm Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
