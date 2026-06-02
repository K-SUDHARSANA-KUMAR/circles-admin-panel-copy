'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchAdminUsers, updateAdminUser, deleteAdminUser, createAdminUser, type AdminUser } from '@/services/adminuser.service';
import { 
  IconRefresh, 
  IconUser, 
  IconPhone, 
  IconMail, 
  IconShield,
  IconGenderMale,
  IconGenderFemale,
  IconPencil,
  IconTrash,
  IconX,
  IconPlus,
  IconEye,
  IconEyeOff,
  IconAlertCircle,
} from '@tabler/icons-react';
import {
  ListingPageContainer,
  ListingSectionHeader,
  ListingToolbar,
  ListingErrorPanel,
  ListingPagination,
  listingStyles,
} from '@/components/shared/listing-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

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
  const [showPassword, setShowPassword] = useState(false);

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

  // Pagination state (client-side)
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

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

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
    setShowPassword(false);
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

  // Slice paginated items
  const filteredUsers = users;
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <ListingPageContainer>
      <ListingSectionHeader
        icon={IconShield}
        title="Admin User Management"
        subtitle={`${total} administrators registered`}
      />

      <ListingToolbar
        countLabel={`${total} Admin Users`}
        showCount={!loading && !error}
        searchPlaceholder="Search by name or email..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={handleRefresh}
        refreshDisabled={loading}
        refreshLoading={loading}
        primaryAction={
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className={listingStyles.primaryButton}
          >
            <IconPlus size={14} />
            <span>Add Admin</span>
          </Button>
        }
      />

      {error ? (
        <ListingErrorPanel
          title="Failed to load admin users"
          message={error}
          onRetry={handleRefresh}
        />
      ) : (
        <div className={listingStyles.tableWrapper}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#18181b]">
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[25%]">
                    Admin User
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[25%]">
                    Contact Info
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[15%]">
                    Role
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[10%]">
                    Gender
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[15%]">
                    Status
                  </th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[10%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181b]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400" />
                      <p className="text-xs text-zinc-500 mt-2 font-medium">Loading admin users...</p>
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <IconUser size={32} className="text-zinc-600" />
                        <p className="text-xs font-semibold text-zinc-400">No administrators found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const displayName = user.name ? `${user.name} ${user.lastName || ''}`.trim() : 'Unnamed Admin';
                    const role = (user.role || 'admin').toLowerCase();
                    const isSuper = role === 'superadmin' || role === 'super_admin' || role === 'owner';
                    const status = (user.status || 'active').toLowerCase();

                    return (
                      <tr
                        key={user.id}
                        className="group hover:bg-[#0c0c0e] transition-colors duration-200"
                      >
                        {/* Admin User */}
                        <td className="py-5 px-12">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                              style={{
                                background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
                              }}
                            >
                              {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <span className="text-sm font-semibold text-white truncate max-w-[180px]">
                              {displayName}
                            </span>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td className="py-5 px-12">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                              <IconMail size={12} className="shrink-0 text-zinc-600" />
                              <span className="truncate max-w-[200px]">{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                                <IconPhone size={11} className="shrink-0 text-zinc-600" />
                                <span className="truncate">{user.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-5 px-12">
                          {isSuper ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#2c1225]/60 border border-[#601a4f]/50 text-pink-400 text-[11px] font-semibold select-none">
                              <IconShield size={10} className="shrink-0" />
                              <span>{user.role || 'Super Admin'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1c122c]/60 border border-[#3b1a60]/50 text-[#d8b4fe] text-[11px] font-semibold select-none">
                              <IconShield size={10} className="shrink-0" />
                              <span>{user.role || 'Admin'}</span>
                            </span>
                          )}
                        </td>

                        {/* Gender */}
                        <td className="py-5 px-12">
                          {user.gender ? (
                            <div 
                              className="inline-flex items-center p-1 rounded-md bg-zinc-900/60 border border-zinc-800/80 text-zinc-400" 
                              title={`Gender: ${user.gender}`}
                            >
                              {user.gender.toLowerCase() === 'male' ? (
                                <IconGenderMale size={13} className="text-cyan-400" />
                              ) : (
                                <IconGenderFemale size={13} className="text-pink-400" />
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600 select-none">—</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-5 px-12">
                          {status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/20 border border-cyan-900/30 text-cyan-400 text-[11px] font-semibold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/20 border border-red-900/30 text-rose-400 text-[11px] font-semibold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-5 px-12 text-right">
                          <div className="flex items-center justify-end gap-3.5">
                            <button
                              onClick={() => handleOpenEdit(user)}
                              className="text-[#c084fc] hover:text-[#d8b4fe] hover:scale-110 active:scale-95 transition-all p-1"
                              title="Edit Permissions"
                            >
                              <IconPencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(user)}
                              className="text-red-400 hover:text-red-300 hover:scale-110 active:scale-95 transition-all p-1"
                              title="Delete Admin"
                            >
                              <IconTrash size={15} />
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

          {!loading && (
            <ListingPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredUsers.length}
              itemsPerPage={itemsPerPage}
              itemLabel="administrators"
              onPrevious={() => setCurrentPage((prev) => prev - 1)}
              onNext={() => setCurrentPage((prev) => prev + 1)}
            />
          )}
        </div>
      )}

      {/* Slide-out / Modal Dialog for Editing Admin User */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-white/10 bg-zinc-950/95 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 rounded-xl">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-950/30 border border-purple-900/50 text-[#d8b4fe]">
                  <IconUser size={16} />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-white">
                    Edit Admin User
                  </CardTitle>
                  <CardDescription className="text-[10px] text-zinc-500 mt-0.5">
                    Modify operational permissions and details for this administrator
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseModal}
                className="h-8 w-8 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <IconX size={14} />
              </Button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              
              {/* Name Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="First Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-9 text-xs bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-purple-500 rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Last Name
                  </label>
                  <Input
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="h-9 text-xs bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-purple-500 rounded-lg"
                  />
                </div>
              </div>

              {/* Status Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="flex h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="active" className="bg-zinc-950">Active</option>
                  <option value="inactive" className="bg-zinc-950">Inactive</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseModal}
                  className="h-8 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !formData.name.trim()}
                  className="h-8 text-xs font-semibold uppercase tracking-wider px-5 bg-[#d8b4fe] text-[#3b0764] hover:bg-[#c084fc] rounded-lg transition-colors duration-200"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-white/10 bg-zinc-950/95 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 rounded-xl">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-950/30 border border-purple-900/50 text-[#d8b4fe]">
                  <IconPlus size={16} />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-white">
                    Add New Admin User
                  </CardTitle>
                  <CardDescription className="text-[10px] text-zinc-500 mt-0.5">
                    Register a new administrator and create their system credentials
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseAddModal}
                className="h-8 w-8 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <IconX size={14} />
              </Button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              
              {/* Name Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="First Name"
                    value={addFormData.name}
                    onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                    className="h-9 text-xs bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-purple-500 rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Last Name
                  </label>
                  <Input
                    placeholder="Last Name"
                    value={addFormData.lastName}
                    onChange={(e) => setAddFormData({ ...addFormData, lastName: e.target.value })}
                    className="h-9 text-xs bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-purple-500 rounded-lg"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="email"
                  placeholder="name@company.com"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                  className="h-9 text-xs bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-purple-500 rounded-lg"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    required
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters with numbers & symbols"
                    value={addFormData.password}
                    onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                    className="h-9 pr-10 text-xs bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-purple-500 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors duration-200"
                  >
                    {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseAddModal}
                  className="h-8 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !addFormData.name.trim() || !addFormData.email.trim() || !addFormData.password.trim()}
                  className="h-8 text-xs font-semibold uppercase tracking-wider px-5 bg-[#d8b4fe] text-[#3b0764] hover:bg-[#c084fc] rounded-lg transition-colors duration-200"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border-white/10 bg-zinc-950/95 p-5 shadow-2xl space-y-4 rounded-xl">
            <CardHeader className="p-0">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-red-400 uppercase tracking-wider">
                <IconAlertCircle size={16} />
                <span>Confirm Deletion</span>
              </CardTitle>
              <CardDescription className="text-xs pt-1 text-zinc-400">
                Are you sure you want to delete admin user <strong className="text-white font-semibold">"{deleteTarget.name} {deleteTarget.lastName || ''}"</strong>? This administrator will immediately lose access to the system.
              </CardDescription>
            </CardHeader>
            <div className="flex gap-3 justify-end pt-2 border-t border-[#18181b]">
              <Button
                variant="ghost"
                onClick={() => setDeleteTarget(null)}
                className="h-8 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                className="h-8 text-xs font-semibold uppercase tracking-wider px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                Confirm Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

    </ListingPageContainer>
  );
}
