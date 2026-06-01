'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import UserDetailClient from './UserDetailClient';
import { fetchCustomers, updateCustomerStatus, type Customer } from '@/services/user.service';
import { fetchCities } from '@/services/cities.service';
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
  IconLoader,
  IconMapPin
} from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailUserId = searchParams.get('id');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal and status update states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    status: 'active'
  });
  const [saving, setSaving] = useState(false);
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

  const getScoreStyle = (score: number) => {
    if (score >= 80) {
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    } else if (score >= 50) {
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    }
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  // Debounce search query to prevent excessive API requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const loadCustomers = useCallback(async (searchVal = '', pageNum = 1, limitNum = 10) => {
    setLoading(true);
    setError(null);
    try {
      const skip = (pageNum - 1) * limitNum;
      const response = await fetchCustomers({ search: searchVal, limit: limitNum, skip });
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

  // Reset page index when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (detailUserId) return;
    loadCustomers(debouncedSearch, currentPage, itemsPerPage);
  }, [debouncedSearch, currentPage, itemsPerPage, loadCustomers, detailUserId]);

  const handleRefresh = () => {
    loadCustomers(searchQuery, currentPage, itemsPerPage);
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
      await loadCustomers(debouncedSearch, currentPage, itemsPerPage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user status.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  if (detailUserId) {
    return <UserDetailClient />;
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-700 space-y-6">
      
      {/* Actions / Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#09090b] border border-[#18181b] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-[#d8b4fe] bg-[#1c122c] px-2.5 py-1 rounded-md border border-[#3b1a60] tracking-wider uppercase select-none">
            {total} Total Users
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
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
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 border border-destructive/20">
            <IconAlertCircle size={24} className="text-destructive" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-sm font-semibold text-white">Failed to load users</p>
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
                      <p className="text-xs text-zinc-500 mt-2 font-medium">Loading registered users...</p>
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <IconUser size={32} className="text-zinc-600" />
                        <p className="text-xs font-semibold text-zinc-400">No users found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => {
                    const displayName = customer.name ? `${customer.name} ${customer.lastName || ''}`.trim() : 'Unnamed User';
                    const profilePictureUrl = (customer as any).profilePictureUrl;
                    const cityId = (customer as any).cityId || (customer as any).city_id;
                    const cityName = (cityId && cityMap[cityId]) || (customer as any).city?.name || (customer as any).city || cityId;
                    const code = (customer as any).referralCode;
                    const medium = (customer as any).referralMedium;
                    const score = customer.reliabilityScore !== undefined ? customer.reliabilityScore : 100;
                    const status = (customer.status || 'active').toLowerCase();

                    return (
                      <tr
                        key={customer.id}
                        onClick={() => router.push(`/user-management/users?id=${customer.id}`)}
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
                                customer.name ? customer.name.charAt(0).toUpperCase() : 'U'
                              )}
                            </div>
                            <span className="text-sm font-semibold text-white truncate max-w-[160px]">
                              {displayName}
                            </span>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-5 px-8">
                          {customer.phone ? (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                              <IconPhone size={12} className="shrink-0 text-zinc-600" />
                              <span>{customer.phone}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600">—</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-5 px-8">
                          {status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1c122c]/60 border border-[#3b1a60]/50 text-[#d8b4fe] text-[11px] font-semibold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc]" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/20 border border-red-900/30 text-rose-400 text-[11px] font-semibold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Inactive
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
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => router.push(`/user-management/users?id=${customer.id}`)}
                              className="text-[#c084fc] hover:text-[#d8b4fe] hover:scale-110 active:scale-95 transition-all p-1"
                              title="Verify Details"
                            >
                              <IconUser size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(customer)}
                              className="text-zinc-500 hover:text-white hover:scale-110 active:scale-95 transition-all p-1"
                              title="Edit Status"
                            >
                              <IconPencil size={15} />
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

      {/* Slide-out / Modal Dialog for Editing Customer Status */}
      {isModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-white/10 bg-zinc-950/95 p-6 shadow-2xl space-y-5 rounded-xl animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-950/30 border border-purple-900/50 text-[#d8b4fe]">
                  <IconUser size={16} />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-white">
                    Edit User Status
                  </CardTitle>
                  <CardDescription className="text-[10px] text-zinc-500 mt-0.5">
                    Modify the operational access status for this user
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

            <form onSubmit={handleSaveStatus} className="space-y-5">
              
              {/* User Details Readonly */}
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-purple-950/20 text-[#d8b4fe] border border-purple-900/50"
                  >
                    {editingCustomer.name ? editingCustomer.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {editingCustomer.name ? `${editingCustomer.name} ${editingCustomer.lastName || ''}`.trim() : 'Unnamed User'}
                    </h4>
                    <p className="text-[10px] text-zinc-500">{editingCustomer.email}</p>
                  </div>
                </div>
              </div>

              {/* Status Toggle Button Group */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Operational Status <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ status: 'active' })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-xs font-bold transition-all ${
                      formData.status === 'active'
                        ? 'bg-purple-950/20 border-purple-500 text-[#d8b4fe] shadow-lg shadow-purple-500/10'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${formData.status === 'active' ? 'bg-[#c084fc] animate-pulse' : 'bg-zinc-500'}`} />
                    <span>Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ status: 'inactive' })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-xs font-bold transition-all ${
                      formData.status === 'inactive'
                        ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/10'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${formData.status === 'inactive' ? 'bg-rose-400 animate-pulse' : 'bg-zinc-500'}`} />
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
                  className="h-8 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-8 text-xs font-semibold uppercase tracking-wider px-5 bg-[#d8b4fe] text-[#3b0764] hover:bg-[#c084fc] rounded-lg transition-colors duration-200 flex items-center gap-1.5"
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
