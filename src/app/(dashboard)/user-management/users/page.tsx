'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useRouter, useSearchParams } from 'next/navigation';
import UserDetailClient from './UserDetailClient';
import {
  fetchCustomers,
  updateCustomerStatus,
  fetchUserDevices,
  sendNotification,
  broadcastNotification,
  adjustCustomerDefaultTrial,
  type Customer,
  type UserDevice,
  type AdjustDefaultTrialPayload,
} from '@/services/user.service';
import { fetchCities } from '@/services/cities.service';
import {
  IconRefresh,
  IconUser,
  IconPhone,
  IconAward,
  IconPencil,
  IconX,
  IconLoader,
  IconMapPin,
  IconUsers,
  IconBell,
  IconCalendar,
  IconClock,
} from '@tabler/icons-react';
import {
  ListingPageContainer,
  ListingSectionHeader,
  ListingToolbar,
  ListingTableWrapper,
  ListingTableHead,
  ListingTh,
  ListingTableBody,
  ListingStatusBadge,
  ListingLoadingRow,
  ListingEmptyRow,
  ListingErrorPanel,
  ListingPagination,
  listingStyles,
} from '@/components/shared/listing-page';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import FilterDropdown from '@/components/common/FilterDropdown';
import { userFilters } from '@/components/common/filters/users.filters';
import { guessCountryFromUser } from '@/components/common/filters/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailUserId = searchParams.get('id');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  // Modal and status update states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    status: 'active'
  });
  const [saving, setSaving] = useState(false);
  const [cityMap, setCityMap] = useState<Record<string, string>>({});
  const [cityToCountryMap, setCityToCountryMap] = useState<Record<string, string>>({});

  // Trial Adjustment States
  const [isTrialAdjustOpen, setIsTrialAdjustOpen] = useState(false);
  const [trialMode, setTrialMode] = useState<'months' | 'days' | 'endAt'>('months');
  const [trialMonths, setTrialMonths] = useState<string>('1');
  const [trialDays, setTrialDays] = useState<string>('30');
  const [trialEndAt, setTrialEndAt] = useState<string>('');
  const [trialReason, setTrialReason] = useState<string>('');
  const [isAdjustingTrial, setIsAdjustingTrial] = useState(false);

  // Notification Modal States
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationTargetType, setNotificationTargetType] = useState<'broadcast' | 'single'>('broadcast');
  const [notificationTargetUser, setNotificationTargetUser] = useState<Customer | null>(null);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [userDevices, setUserDevices] = useState<UserDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const handleOpenNotificationModal = async (targetUser?: Customer) => {
    setNotificationTitle('');
    setNotificationBody('');
    setUserDevices([]);
    if (targetUser) {
      setNotificationTargetType('single');
      setNotificationTargetUser(targetUser);
      setIsNotificationModalOpen(true);
      setLoadingDevices(true);
      try {
        const devices = await fetchUserDevices(targetUser.id);
        setUserDevices(devices);
      } catch (err) {
        console.error('Failed to load user devices', err);
        toast.error('Failed to load user devices');
      } finally {
        setLoadingDevices(false);
      }
    } else {
      setNotificationTargetType('broadcast');
      setNotificationTargetUser(null);
      setIsNotificationModalOpen(true);
    }
  };

  const handleCloseNotificationModal = () => {
    setIsNotificationModalOpen(false);
    setNotificationTargetUser(null);
    setNotificationTitle('');
    setNotificationBody('');
    setUserDevices([]);
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      toast.error('Please enter both title and message body');
      return;
    }

    setIsSendingNotification(true);
    try {
      if (notificationTargetType === 'single') {
        if (!notificationTargetUser) {
          toast.error('No target user selected');
          return;
        }
        await sendNotification(notificationTargetUser.id, {
          title: notificationTitle.trim(),
          body: notificationBody.trim(),
        });
        const displayName = notificationTargetUser.name
          ? `${notificationTargetUser.name} ${notificationTargetUser.lastName || ''}`.trim()
          : 'User';
        toast.success(`Successfully sent push notification to ${displayName}`);
      } else {
        const res = await broadcastNotification({
          title: notificationTitle.trim(),
          body: notificationBody.trim(),
        });
        const targeted = res?.usersTargeted ?? res?.data?.usersTargeted ?? 0;
        toast.success(`Successfully broadcasted push notification to all users (${targeted} active users targeted)`);
      }
      handleCloseNotificationModal();
    } catch (err: any) {
      const msg = err.message || 'Failed to send notification';
      toast.error(msg);
    } finally {
      setIsSendingNotification(false);
    }
  };

  useEffect(() => {
    async function loadCities() {
      try {
        const cities = await fetchCities({ limit: 100 });
        const mapping: Record<string, string> = {};
        const countryMapping: Record<string, string> = {};
        cities.forEach(city => {
          const id = city.cityId || city.city_id || city.id;
          if (id) {
            mapping[id] = city.name;
            if (city.country?.name) {
              countryMapping[id] = city.country.name;
            }
          }
        });
        setCityMap(mapping);
        setCityToCountryMap(countryMapping);
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

  const debouncedSearch = useDebounce(searchQuery, 500);


  const loadCustomers = useCallback(async (searchVal = '', pageNum = 1, limitNum = 10, filters: Record<string, any> = {}) => {
    setLoading(true);
    setError(null);
    try {
      const skip = (pageNum - 1) * limitNum;

      // city filter is an array of city names (multi-select)
      const cityNames: string[] = Array.isArray(filters.city)
        ? filters.city.filter(Boolean)
        : filters.city
          ? [filters.city]
          : [];

      // country filter is an array of country names (multi-select)
      const countries: string[] = Array.isArray(filters.country)
        ? filters.country.filter(Boolean)
        : filters.country
          ? [filters.country]
          : [];

      const response = await fetchCustomers({
        search: searchVal,
        limit: limitNum,
        skip,
        status: filters.status,
        cityNames: cityNames.length > 0 ? cityNames : undefined,
        countries: countries.length > 0 ? countries : undefined,
        medium: filters.medium,
      });

      setCustomers(response.customers || []);
      setTotal(response.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch users. Please try again.';
      setError(msg);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const prevSearchRef = useRef(debouncedSearch);
  const prevFiltersRef = useRef(activeFilters);

  useEffect(() => {
    if (detailUserId) return;

    let shouldResetPage = false;
    if (prevSearchRef.current !== debouncedSearch) {
      prevSearchRef.current = debouncedSearch;
      shouldResetPage = true;
    }
    if (JSON.stringify(prevFiltersRef.current) !== JSON.stringify(activeFilters)) {
      prevFiltersRef.current = activeFilters;
      shouldResetPage = true;
    }

    if (shouldResetPage) {
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
    }

    loadCustomers(debouncedSearch, currentPage, itemsPerPage, activeFilters);
  }, [debouncedSearch, currentPage, itemsPerPage, activeFilters, loadCustomers, detailUserId]);

  const handleRefresh = () => {
    loadCustomers(searchQuery, currentPage, itemsPerPage, activeFilters);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      status: customer.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleCancelTrialAdjust = () => {
    setIsTrialAdjustOpen(false);
    setTrialMode('months');
    setTrialMonths('1');
    setTrialDays('30');
    setTrialEndAt('');
    setTrialReason('');
  };

  const handleConfirmTrialAdjustment = async () => {
    if (!editingCustomer) return;

    const payload: AdjustDefaultTrialPayload = {};
    if (trialReason.trim()) {
      payload.reason = trialReason.trim();
    }

    if (trialMode === 'months') {
      const val = Number(trialMonths);
      if (isNaN(val) || val === 0) {
        toast.error('Please enter a valid non-zero number of months (-60 to 60)');
        return;
      }
      payload.months = val;
    } else if (trialMode === 'days') {
      const val = Number(trialDays);
      if (isNaN(val) || val === 0) {
        toast.error('Please enter a valid non-zero number of days (-3650 to 3650)');
        return;
      }
      payload.days = val;
    } else if (trialMode === 'endAt') {
      if (!trialEndAt) {
        toast.error('Please select an end date and time');
        return;
      }
      payload.endAt = new Date(trialEndAt).toISOString();
    }

    setIsAdjustingTrial(true);
    try {
      const res = await adjustCustomerDefaultTrial(editingCustomer.id, payload);
      toast.success(
        `Trial window adjusted! ${res.daysRemaining} days remaining${res.clamped ? ' (clamped to start)' : ''}`
      );

      // Update current customer object
      setEditingCustomer((prev) =>
        prev
          ? {
              ...prev,
              defaultTrial: {
                startAt: res.defaultTrialStartAt,
                endAt: res.defaultTrialEndAt,
                active: res.defaultTrialActive,
                daysRemaining: res.daysRemaining,
              },
            }
          : null
      );

      handleCancelTrialAdjust();
      // Reload customers list in background to sync table view
      await loadCustomers(debouncedSearch, currentPage, itemsPerPage, activeFilters);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to adjust default trial';
      toast.error(msg);
    } finally {
      setIsAdjustingTrial(false);
    }
  };

  const handleCloseModal = () => {
    setFormData({
      status: 'active'
    });
    handleCancelTrialAdjust();
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
    <ListingPageContainer>
      <ListingSectionHeader
        icon={IconUsers}
        title="Users"
        subtitle={`${total} registered users`}
      />

      <ListingToolbar
        countLabel={`${total} Total Users`}
        showCount={!loading}
        searchPlaceholder="Search by name or phone no..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={handleRefresh}
        refreshDisabled={loading}
        refreshLoading={loading}
        filterAction={
          <div className="flex flex-wrap items-center gap-2">
            {userFilters.map((filter) => (
              <FilterDropdown
                key={filter.key}
                label={filter.label}
                type={filter.type}
                options={filter.options}
                placeholder={filter.placeholder}
                value={activeFilters[filter.key]}
                onChange={(val) =>
                  setActiveFilters((prev) => ({
                    ...prev,
                    [filter.key]: val,
                  }))
                }
                activeFilters={activeFilters}
              />
            ))}
          </div>
        }
        primaryAction={
          <Button
            onClick={() => handleOpenNotificationModal()}
            className="flex items-center gap-2 h-8 px-4 text-xs font-bold uppercase tracking-wider bg-[#d8b4fe] text-[#3b0764] hover:bg-[#c084fc] shrink-0 rounded-lg transition-all duration-200 cursor-pointer"
          >
            <IconBell size={14} className="cursor-pointer" />
            <span>Broadcast</span>
          </Button>
        }
      />

      {error ? (
        <ListingErrorPanel
          title="Failed to load users"
          message={error}
          onRetry={handleRefresh}
        />
      ) : (
        <ListingTableWrapper
          footer={
            !loading ? (
              <ListingPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={total}
                itemsPerPage={itemsPerPage}
                itemLabel="users"
                onFirst={() => setCurrentPage(1)}
                onPrevious={() => setCurrentPage((prev) => prev - 1)}
                onNext={() => setCurrentPage((prev) => prev + 1)}
                onLast={() => setCurrentPage(totalPages)}
                onItemsPerPageChange={(val) => {
                  setItemsPerPage(val);
                  setCurrentPage(1);
                }}
              />
            ) : undefined
          }
        >
          <ListingTableHead>
            <ListingTh className="w-[18%]">Name</ListingTh>
            <ListingTh className="w-[13%]">Phone No</ListingTh>
            <ListingTh className="w-[10%]">Status</ListingTh>
            <ListingTh className="w-[10%]">City</ListingTh>
            <ListingTh className="w-[10%]">Country</ListingTh>
            <ListingTh className="w-[10%]">Referral Code</ListingTh>
            <ListingTh className="w-[10%]">Medium</ListingTh>
            <ListingTh className="w-[9%]">Score</ListingTh>
            <ListingTh align="right" className="w-[5%]">Actions</ListingTh>
          </ListingTableHead>
          <ListingTableBody>
                {loading ? (
                  <ListingLoadingRow colSpan={9} message="Loading registered users..." />
                ) : customers.length === 0 ? (
                  <ListingEmptyRow
                    colSpan={9}
                    icon={IconUser}
                    title="No registered users found"
                    description="Try modifying your search criteria"
                  />
                ) : (
                  customers.map((customer) => {
                    const displayName = customer.name ? `${customer.name} ${customer.lastName || ''}`.trim() : 'Unnamed User';
                    const profilePictureUrl = (customer as any).profilePictureUrl;
                    const cityId = (customer as any).cityId || (customer as any).city_id;
                    const cityName = (cityId && cityMap[cityId]) || (customer as any).location || (customer as any).city?.name || (customer as any).city || '—';
                    const country = (customer as any).country;
                    const code = (customer as any).referralCode;
                    const medium = (customer as any).referralMedium;
                    const score = customer.reliabilityScore !== undefined ? customer.reliabilityScore : 100;
                    const status = (customer.status || 'active').toLowerCase();

                return (
                  <tr
                    key={customer.id}
                    className={listingStyles.tableRow}
                  >
                    {/* Name */}
                    <td className={listingStyles.cellDefault}>
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
                    <td className={listingStyles.cellDefault}>
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
                    <td className={listingStyles.cellDefault}>
                      <ListingStatusBadge
                        variant={status === 'active' ? 'active' : 'inactive'}
                        label={status === 'active' ? 'Active' : 'Inactive'}
                      />
                    </td>

                    {/* City */}
                    <td className={listingStyles.cellDefault}>
                      {cityName ? (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <IconMapPin size={12} className="shrink-0 text-zinc-600" />
                          <span className="truncate max-w-[120px]">{cityName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600 select-none">—</span>
                      )}
                    </td>

                    {/* Country */}
                    <td className={listingStyles.cellDefault}>
                      {country ? (
                        <span className="text-xs text-zinc-400">{country}</span>
                      ) : (
                        <span className="text-xs text-zinc-600 select-none">—</span>
                      )}
                    </td>

                    {/* Referral Code */}
                    <td className={listingStyles.cellDefault}>
                      {code ? (
                        <code className="text-xs font-mono font-bold text-white bg-zinc-900 border border-zinc-800/80 px-2 py-0.5 rounded">
                          {code}
                        </code>
                      ) : (
                        <span className="text-xs text-zinc-600 select-none">—</span>
                      )}
                    </td>

                    {/* Referral Medium */}
                    <td className={listingStyles.cellDefault}>
                      {medium ? (
                        <span className="inline-flex text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 select-none">
                          {medium}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600 select-none">—</span>
                      )}
                    </td>

                    {/* Reliability Score */}
                    <td className={listingStyles.cellDefault}>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md border ${getScoreStyle(score)} select-none`}>
                        <IconAward size={12} className="shrink-0" />
                        <span>{score}%</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className={`${listingStyles.cellDefault} text-right`} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => handleOpenNotificationModal(customer)}
                          className="text-[#c084fc] hover:text-[#d8b4fe] hover:scale-110 active:scale-95 transition-all p-1 cursor-pointer"
                          title="Send Notification"
                        >
                          <IconBell size={15} className="cursor-pointer" />
                        </button>
                        <button
                          onClick={() => router.push(`/user-management/users?id=${customer.id}`)}
                          className="text-[#c084fc] hover:text-[#d8b4fe] hover:scale-110 active:scale-95 transition-all p-1 cursor-pointer"
                          title="Verify Details"
                        >
                          <IconUser size={15} className="cursor-pointer" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(customer)}
                          className="text-zinc-500 hover:text-white hover:scale-110 active:scale-95 transition-all p-1 cursor-pointer"
                          title="Edit Status"
                        >
                          <IconPencil size={15} className="cursor-pointer" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </ListingTableBody>
        </ListingTableWrapper>
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
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-xs font-bold transition-all ${formData.status === 'active'
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
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-xs font-bold transition-all ${formData.status === 'inactive'
                      ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/10'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                      }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${formData.status === 'inactive' ? 'bg-rose-400 animate-pulse' : 'bg-zinc-500'}`} />
                    <span>Inactive</span>
                  </button>
                </div>
              </div>

              {/* Trial Adjustment Section — strictly for users currently in active trial, hidden for member users */}
              {Boolean(
                editingCustomer.defaultTrial?.active &&
                (!editingCustomer.subscriptionStatus || editingCustomer.subscriptionStatus === 'free' || editingCustomer.subscriptionStatus === 'trial') &&
                (!editingCustomer.subscriptionPlan || editingCustomer.subscriptionPlan === 'free') &&
                (!editingCustomer.subscription?.plan || editingCustomer.subscription?.plan === 'free')
              ) && (
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <IconClock size={13} className="text-[#d8b4fe]" />
                      <span>Free Trial Status</span>
                    </label>
                    <span className="text-[10px] font-semibold text-[#d8b4fe] bg-purple-950/40 border border-purple-900/50 px-2 py-0.5 rounded-full">
                      {editingCustomer.defaultTrial?.daysRemaining ?? 0} days remaining
                    </span>
                  </div>

                  {!isTrialAdjustOpen ? (
                    <button
                      type="button"
                      onClick={() => setIsTrialAdjustOpen(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-purple-500/40 bg-purple-950/20 text-[#d8b4fe] hover:bg-purple-900/30 hover:border-purple-500 text-xs font-bold transition-all shadow-md shadow-purple-950/20"
                    >
                      <IconCalendar size={15} />
                      <span>TrialAdjustment</span>
                    </button>
                  ) : (
                    <div className="bg-zinc-900/90 border border-purple-500/40 rounded-lg p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                          <IconCalendar size={14} className="text-[#d8b4fe]" />
                          <span>TrialAdjustment</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelTrialAdjust}
                          className="text-zinc-500 hover:text-white text-xs p-1 rounded hover:bg-zinc-800"
                        >
                          <IconX size={14} />
                        </button>
                      </div>

                      {/* Adjustment Mode Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Adjustment Type <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['months', 'days', 'endAt'] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setTrialMode(mode)}
                              className={`py-1.5 text-[11px] font-semibold rounded border transition-all ${
                                trialMode === mode
                                  ? 'bg-purple-950/50 border-purple-500 text-[#d8b4fe] shadow-sm'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {mode === 'months' ? 'Months' : mode === 'days' ? 'Days' : 'Exact Date'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mode Inputs */}
                      {trialMode === 'months' && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400">
                            Months to shift (positive extends, negative reduces)
                          </label>
                          <Input
                            type="number"
                            step="1"
                            min="-60"
                            max="60"
                            placeholder="e.g. 1 or -1"
                            value={trialMonths}
                            onChange={(e) => setTrialMonths(e.target.value)}
                            className="h-8 text-xs bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-purple-500"
                          />
                        </div>
                      )}

                      {trialMode === 'days' && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400">
                            Days to shift (positive extends, negative reduces)
                          </label>
                          <Input
                            type="number"
                            step="1"
                            min="-3650"
                            max="3650"
                            placeholder="e.g. 30 or -15"
                            value={trialDays}
                            onChange={(e) => setTrialDays(e.target.value)}
                            className="h-8 text-xs bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-purple-500"
                          />
                        </div>
                      )}

                      {trialMode === 'endAt' && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400">
                            New Trial End Date & Time
                          </label>
                          <Input
                            type="datetime-local"
                            value={trialEndAt}
                            onChange={(e) => setTrialEndAt(e.target.value)}
                            className="h-8 text-xs bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-purple-500"
                          />
                        </div>
                      )}

                      {/* Optional Reason Input */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">
                          Reason (Optional audit log)
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. User retention extension"
                          value={trialReason}
                          onChange={(e) => setTrialReason(e.target.value)}
                          className="h-8 text-xs bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-purple-500"
                        />
                      </div>

                      {/* Confirm Process or Cancel */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelTrialAdjust}
                          disabled={isAdjustingTrial}
                          className="h-7 text-[11px] text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleConfirmTrialAdjustment}
                          disabled={isAdjustingTrial}
                          className="h-7 text-[11px] font-bold bg-[#d8b4fe] text-[#3b0764] hover:bg-[#c084fc] flex items-center gap-1 px-3"
                        >
                          {isAdjustingTrial && <IconLoader size={12} className="animate-spin" />}
                          <span>{isAdjustingTrial ? 'Processing...' : 'Confirm Process'}</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

      {/* Slide-out / Modal Dialog for Sending Push Notifications */}
      {isNotificationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-white/10 bg-zinc-950/95 p-6 shadow-2xl space-y-5 rounded-xl animate-in zoom-in-95 duration-200">

            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-950/30 border border-purple-900/50 text-[#d8b4fe]">
                  <IconBell size={16} />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-white">
                    Broadcast Notification
                  </CardTitle>
                  <CardDescription className="text-[10px] text-zinc-500 mt-0.5">
                    Broadcast a push notification to registered users' devices
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseNotificationModal}
                className="h-8 w-8 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <IconX size={14} />
              </Button>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-5">

              {/* Target Type Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Target Audience
                </label>
                {notificationTargetUser ? (
                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-purple-950/20 text-[#d8b4fe] border border-purple-900/50 overflow-hidden">
                          {/* Base fallback initial letter */}
                          {notificationTargetUser.name ? notificationTargetUser.name.charAt(0).toUpperCase() : 'U'}

                          {/* Profile picture layered above the fallback */}
                          {notificationTargetUser.profilePictureUrl && (
                            <img
                              src={notificationTargetUser.profilePictureUrl}
                              alt={notificationTargetUser.name || 'User'}
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">
                            {notificationTargetUser.name ? `${notificationTargetUser.name} ${notificationTargetUser.lastName || ''}`.trim() : 'Unnamed User'}
                          </h4>
                          <p className="text-[10px] text-zinc-500">{notificationTargetUser.email || notificationTargetUser.phone}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-purple-950/30 border border-purple-900/50 text-[#d8b4fe]">
                        Specific User
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-950/20 text-[#d8b4fe] border border-purple-900/50">
                        <IconUsers size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">All Active Users</h4>
                        <p className="text-[10px] text-zinc-500">Global broadcast to all users globally</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-950/30 border border-emerald-900/50 text-emerald-400">
                      Broadcast
                    </span>
                  </div>
                )}
              </div>

              {/* Active Devices Visibility */}
              {notificationTargetType === 'single' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Active Registered Devices
                  </label>
                  {loadingDevices ? (
                    <div className="flex items-center gap-2 text-xs text-zinc-500 py-1">
                      <IconLoader size={12} className="animate-spin" />
                      <span>Checking user devices...</span>
                    </div>
                  ) : userDevices.length > 0 ? (
                    <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                      {userDevices.map((device) => (
                        <div key={device.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800/80 px-2.5 py-1.5 rounded-lg text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-bold text-white uppercase text-[10px] tracking-wider px-1 bg-zinc-800 rounded border border-zinc-700/60">
                              {device.platform || 'unknown'}
                            </span>
                          </div>
                          <span className="text-[9px] text-zinc-600">
                            {device.createdAt ? format(new Date(device.createdAt), 'dd MMM yyyy') : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-2.5 rounded-lg text-[10px] leading-relaxed flex items-start gap-2">
                      <span className="text-xs">⚠️</span>
                      <span>
                        No active push tokens found for this user. They will still receive the notification in their in-app feed next time they open the app, but they will not get a system push banner.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Notification Form Input Fields */}
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label htmlFor="notif-title" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="notif-title"
                    placeholder="Enter notification title..."
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-xs text-white placeholder:text-zinc-600 rounded-lg h-9"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="notif-body" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Message Body <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="notif-body"
                    placeholder="Enter message details..."
                    value={notificationBody}
                    onChange={(e) => setNotificationBody(e.target.value)}
                    className="flex w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder:text-zinc-600 min-h-[90px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700"
                    required
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseNotificationModal}
                  className="h-8 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSendingNotification}
                  className="h-8 text-xs font-semibold uppercase tracking-wider px-5 bg-[#d8b4fe] text-[#3b0764] hover:bg-[#c084fc] rounded-lg transition-colors duration-200 flex items-center gap-1.5"
                >
                  {isSendingNotification && <IconLoader size={12} className="animate-spin" />}
                  <span>{isSendingNotification ? 'Sending...' : 'Send Notification'}</span>
                </Button>
              </div>

            </form>
          </Card>
        </div>
      )}

    </ListingPageContainer>
  );
}




