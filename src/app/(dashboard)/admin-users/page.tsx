'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchAdminUsers, updateAdminUser, deleteAdminUser, type AdminUser } from '@/services/adminuser.service';
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
  IconX
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
            <div className="space-y-1.5">
              <div className="h-3 w-40 rounded bg-white/5 animate-pulse" />
              <div className="h-3 w-28 rounded bg-white/5 animate-pulse" />
            </div>
          </TableCell>
          <TableCell className="py-4">
            <div className="h-6 w-20 rounded-full bg-white/5 animate-pulse" />
          </TableCell>
          <TableCell className="py-4">
            <div className="h-5 w-10 rounded bg-white/5 animate-pulse" />
          </TableCell>
          <TableCell className="py-4">
            <div className="h-6 w-16 rounded-full bg-white/5 animate-pulse" />
          </TableCell>
          <TableCell className="py-4 text-right">
            <div className="h-7 w-16 ml-auto rounded bg-white/5 animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
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

  // Modal & Action states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
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

      {/* Main Table Layout */}
      <div className="glass-card overflow-hidden shadow-2xl border-primary/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50 bg-muted/30">
              <TableHead className="w-[80px] text-primary font-bold uppercase tracking-widest text-[10px]">
                S.No
              </TableHead>
              <TableHead className="text-primary font-bold uppercase tracking-widest text-[10px]">
                Admin User
              </TableHead>
              <TableHead className="text-primary font-bold uppercase tracking-widest text-[10px]">
                Contact Info
              </TableHead>
              <TableHead className="text-primary font-bold uppercase tracking-widest text-[10px]">
                Role
              </TableHead>
              <TableHead className="text-primary font-bold uppercase tracking-widest text-[10px]">
                Gender
              </TableHead>
              <TableHead className="text-primary font-bold uppercase tracking-widest text-[10px]">
                Status
              </TableHead>
              <TableHead className="text-right text-primary font-bold uppercase tracking-widest text-[10px] px-6">
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
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 py-8 animate-in fade-in duration-300">
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
                </TableCell>
              </TableRow>
            ) : (
              users.map((user, index) => {
                const roleStyle = getRoleStyle(user.role);
                const statusStyle = getStatusStyle(user.status);
                const displayName = user.name ? `${user.name} ${user.lastName || ''}`.trim() : 'Unnamed Admin';
                
                return (
                  <TableRow
                    key={user.id}
                    className="group border-border/40 hover:bg-primary/5 smooth-transition"
                  >
                    {/* Index */}
                    <TableCell className="text-xs font-extrabold text-foreground/40 group-hover:text-primary transition-colors">
                      {index + 1}
                    </TableCell>

                    {/* Admin User Profile */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 smooth-transition group-hover:scale-105"
                          style={{
                            background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
                            boxShadow: "0 0 12px rgba(124, 58, 237, 0.3)",
                          }}
                        >
                          {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <span className="text-sm font-bold text-foreground/90 group-hover:text-primary transition-colors truncate max-w-[180px]">
                          {displayName}
                        </span>
                      </div>
                    </TableCell>

                    {/* Contact Details */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <IconMail size={12} className="shrink-0 text-muted-foreground/60" />
                          <span className="truncate max-w-[200px]">{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                            <IconPhone size={11} className="shrink-0 text-muted-foreground/50" />
                            <span className="truncate">{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Role Badge */}
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full"
                        style={{
                          background: roleStyle.bg,
                          color: roleStyle.color,
                          border: roleStyle.border,
                        }}
                      >
                        <IconShield size={9} className="shrink-0" />
                        <span>{user.role || 'Admin'}</span>
                      </span>
                    </TableCell>

                    {/* Gender */}
                    <TableCell>
                      {user.gender ? (
                        <div 
                          className="inline-flex items-center p-1 rounded bg-white/5 text-muted-foreground/85 border border-white/5" 
                          title={`Gender: ${user.gender}`}
                        >
                          {user.gender.toLowerCase() === 'male' ? (
                            <IconGenderMale size={13} className="text-cyan-400" />
                          ) : (
                            <IconGenderFemale size={13} className="text-pink-400" />
                          )}
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
                        {user.status || 'Active'}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-7 px-3 font-bold text-[10px] uppercase tracking-wider rounded-full hover:bg-primary hover:text-white transition-all flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(user);
                          }}
                        >
                          <IconPencil size={12} />
                        </Button>
                        {/* <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(user);
                          }}
                          title="Delete Admin"
                        >
                          <IconTrash size={13} />
                        </Button> */}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

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
