'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useRouter, useSearchParams } from 'next/navigation';
import WaitlistDetailClient from './WaitlistDetailClient';
import {
  fetchWaitlist,
  type WaitlistUser,
} from '@/services/user.service';
import { fetchCities } from '@/services/cities.service';
import FilterDropdown from '@/components/common/FilterDropdown';
import { waitlistFilters } from '@/components/common/filters/waitlist.filters';

import {
  IconUser,
  IconPhone,
  IconMapPin,
  IconAward,
  IconShieldCheck,
  IconUserCheck,
  IconUserSearch,
} from '@tabler/icons-react';
import {
  ListingPageContainer,
  ListingSectionHeader,
  ListingSegmentedTabs,
  ListingToolbar,
  ListingErrorPanel,
  ListingPagination,
  listingStyles,
} from '@/components/shared/listing-page';
import { toast } from 'sonner';

type WaitlistTab = 'pending' | 'approved';

const WAITLIST_TABLE_HEADERS = (
  <tr className="border-b border-[#18181b]">
    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[18%]">
      Name
    </th>
    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[13%]">
      Phone No
    </th>
    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[10%]">
      Status
    </th>
    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[10%]">
      City
    </th>
    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[10%]">
      Country
    </th>
    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[10%]">
      Referral Code
    </th>
    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[10%]">
      Medium
    </th>
    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[9%]">
      Score
    </th>
    <th className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[5%]">
      Actions
    </th>
  </tr>
);

export default function WaitlistPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailUserId = searchParams.get('id');
  const activeTab: WaitlistTab =
    searchParams.get('tab') === 'approved' ? 'approved' : 'pending';

  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [cityMap, setCityMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadCities() {
      try {
        const cities = await fetchCities({ limit: 100 });
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

  const handleTabChange = (tab: WaitlistTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'approved') {
      params.set('tab', 'approved');
    } else {
      params.delete('tab');
    }
    const query = params.toString();
    router.push(query ? `/user-management/waitlist?${query}` : '/user-management/waitlist');
  };

  const loadUsers = useCallback(async (filters: Record<string, any> = {}) => {
    setLoading(true);
    setError(null);
    try {
      const skip = (currentPage - 1) * itemsPerPage;

      // City filter: pass city names directly to backend (backend resolves to IDs via cities table join)
      const cityNames: string[] | undefined = filters.city
        ? (Array.isArray(filters.city) ? filters.city.filter(Boolean) : [filters.city])
        : undefined;

      // Country filter: pass country names directly to backend (backend resolves via cities→countries join)
      const countries: string[] | undefined = filters.country
        ? (Array.isArray(filters.country) ? filters.country.filter(Boolean) : [filters.country])
        : undefined;

      // Extract score value
      const scoreVal = filters.score?.min !== undefined ? filters.score.min : (typeof filters.score === 'number' ? filters.score : undefined);

      const currentStatus = filters.status || activeTab;

      const filterParams = {
        search: debouncedSearch,
        limit: itemsPerPage,
        skip,
        status: currentStatus,
        medium: filters.medium,
        minScore: filters.score?.min,
        maxScore: filters.score?.max,
        cityNames: cityNames?.length ? cityNames : undefined,
        countries: countries?.length ? countries : undefined,
        score: scoreVal,
      };

      const response = await fetchWaitlist(filterParams);
      const allUsers = response.users || [];
      setUsers(allUsers);
      setTotal(response.total || allUsers.length);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch waitlist users. Please try again.';
      setError(msg);
      toast.error('Failed to load waitlist users');
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, debouncedSearch, itemsPerPage]);


  const prevSearchRef = useRef(debouncedSearch);
  const prevTabRef = useRef(activeTab);
  const prevFiltersRef = useRef(activeFilters);

  useEffect(() => {
    if (detailUserId) return;

    let shouldResetPage = false;
    if (prevSearchRef.current !== debouncedSearch) {
      prevSearchRef.current = debouncedSearch;
      shouldResetPage = true;
    }
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
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

    loadUsers(activeFilters);
  }, [debouncedSearch, currentPage, activeTab, activeFilters, loadUsers, detailUserId]);

  const handleRefresh = () => {
    loadUsers(activeFilters);
  };

  const getScoreStyle = (score: number) => {
    if (score >= 80) {
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
    if (score >= 50) {
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    }
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const getDetailUrl = (userId: string) => {
    const params = new URLSearchParams();
    params.set('id', userId);
    if (activeTab === 'approved') {
      params.set('tab', 'approved');
    }
    return `/user-management/waitlist?${params.toString()}`;
  };

  const totalPages = Math.ceil(total / itemsPerPage);
  const isApprovedTab = activeTab === 'approved';

  if (detailUserId) {
    return <WaitlistDetailClient />;
  }

  return (
    <ListingPageContainer>
      <ListingSectionHeader
        icon={IconShieldCheck}
        title="Waitlist Management"
        subtitle={
          isApprovedTab
            ? `${total} approved applicants`
            : `${total} applicants pending review`
        }
        trailing={
          <ListingSegmentedTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            tabs={[
              { id: 'pending', label: 'Pending', icon: IconShieldCheck },
              { id: 'approved', label: 'Approved', icon: IconUserCheck },
            ]}
          />
        }
      />

      <ListingToolbar
        countLabel={
          isApprovedTab
            ? `${total} Approved Users`
            : `${total} Pending Verification`
        }
        showCount={!loading && !error}
        searchPlaceholder="Search by name or phone no..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={handleRefresh}
        refreshDisabled={loading}
        refreshLoading={loading}
        filterAction={
          <div className="flex flex-wrap items-center gap-2">
            {waitlistFilters.map((filter) => {
              const isStatus = filter.key === 'status';
              const filterValue = activeFilters[filter.key];
              const handleFilterChange = (val: any) => {
                setActiveFilters((prev) => ({
                  ...prev,
                  [filter.key]: val,
                }));
                if (isStatus) {
                  if (val === 'approved') {
                    handleTabChange('approved');
                  } else if (val === 'pending') {
                    handleTabChange('pending');
                  } else {
                    handleTabChange('pending');
                  }
                }
              };

              return (
                <FilterDropdown
                  key={filter.key}
                  label={filter.label}
                  type={filter.type}
                  options={filter.options}
                  placeholder={filter.placeholder}
                  value={filterValue}
                  onChange={handleFilterChange}
                  activeFilters={activeFilters}
                />
              );
            })}
          </div>
        }
      />

      {error ? (
        <ListingErrorPanel
          title={
            isApprovedTab
              ? 'Failed to load approved users'
              : 'Failed to load verification queue'
          }
          message={error}
          onRetry={handleRefresh}
        />
      ) : (
        <div className={listingStyles.tableWrapper}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>{WAITLIST_TABLE_HEADERS}</thead>
              <tbody className="divide-y divide-[#18181b]">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400" />
                      <p className="text-xs text-zinc-500 mt-2 font-medium">
                        {isApprovedTab
                          ? 'Loading approved users...'
                          : 'Loading waitlist users...'}
                      </p>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <IconUser size={32} className="text-zinc-600" />
                        <p className="text-xs font-semibold text-zinc-400">
                          {isApprovedTab
                            ? 'No approved users found'
                            : 'No waitlisted users found'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const displayName = user.name
                      ? `${user.name} ${user.lastName || ''}`.trim()
                      : 'Unnamed Applicant';
                    const profilePictureUrl = user.profilePictureUrl;
                    const cityId =
                      (user as { cityId?: string; city_id?: string }).cityId ||
                      (user as { cityId?: string; city_id?: string }).city_id;
                    const cityName =
                      (cityId && cityMap[cityId]) ||
                      (user as { location?: string }).location ||
                      (user as { city?: { name?: string } }).city?.name ||
                      (user as { city?: string }).city ||
                      cityId;
                    const country = (user as { country?: string }).country;
                    const code = (user as { referralCode?: string }).referralCode;
                    const medium = (user as { referralMedium?: string }).referralMedium;
                    const score =
                      (user as { reliabilityScore?: number }).reliabilityScore !== undefined
                        ? (user as { reliabilityScore?: number }).reliabilityScore!
                        : 100;
                    const waitlistStatus = ((user as { waitlistStatus?: string }).waitlistStatus || '').toLowerCase();
                    const userAccountStatus = (user.status || 'pending').toLowerCase();
                    const isApprovedUser = userAccountStatus === 'approved' || userAccountStatus === 'verified' || userAccountStatus === 'active' || waitlistStatus === 'approved';
                    const isRejectedUser = userAccountStatus === 'rejected' || userAccountStatus === 'declined' || userAccountStatus === 'inactive' || waitlistStatus === 'rejected';

                    return (
                      <tr
                        key={user.id}
                        className="group hover:bg-[#0c0c0e] transition-colors duration-200"
                      >
                        <td className="py-3 px-6">
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
                                (user.name ? user.name.charAt(0).toUpperCase() : 'U')
                              )}
                            </div>
                            <span className="text-sm font-semibold text-white truncate max-w-[160px]">
                              {displayName}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-6">
                          {user.phone ? (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                              <IconPhone size={12} className="shrink-0 text-zinc-600" />
                              <span>{user.phone}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600 select-none">—</span>
                          )}
                        </td>

                        <td className="py-3 px-6">
                          {isApprovedUser ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1c122c]/60 border border-[#3b1a60]/50 text-[#d8b4fe] text-[11px] font-semibold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc]" />
                              Approved
                            </span>
                          ) : isRejectedUser ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/20 border border-red-900/30 text-rose-400 text-[11px] font-semibold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2d1f10]/60 border border-[#5f3e15]/50 text-amber-400 text-[11px] font-semibold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Pending
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-6">
                          {cityName ? (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                              <IconMapPin size={12} className="shrink-0 text-zinc-600" />
                              <span className="truncate max-w-[120px]">{cityName}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600 select-none">—</span>
                          )}
                        </td>

                        <td className="py-3 px-6">
                          {country ? (
                            <span className="text-xs text-zinc-400">{country}</span>
                          ) : (
                            <span className="text-xs text-zinc-600 select-none">—</span>
                          )}
                        </td>

                        <td className="py-3 px-6">
                          {code ? (
                            <code className="text-xs font-mono font-bold text-white bg-zinc-900 border border-zinc-800/80 px-2 py-0.5 rounded">
                              {code}
                            </code>
                          ) : (
                            <span className="text-xs text-zinc-600 select-none">—</span>
                          )}
                        </td>

                        <td className="py-3 px-6">
                          {medium ? (
                            <span className="inline-flex text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 select-none">
                              {medium}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600 select-none">—</span>
                          )}
                        </td>

                        <td className="py-3 px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md border ${getScoreStyle(score)} select-none`}
                          >
                            <IconAward size={12} className="shrink-0" />
                            <span>{score}%</span>
                          </span>
                        </td>

                        <td className="py-3 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => router.push(getDetailUrl(user.id))}
                              className="text-[#c084fc] hover:text-[#d8b4fe] hover:scale-110 active:scale-95 transition-all p-1 cursor-pointer"
                              title={isApprovedTab ? 'View Applicant' : 'Review & Verify User'}
                              aria-label={isApprovedTab ? 'View applicant' : 'Review and verify user'}
                            >
                              <IconUserSearch size={20} className="cursor-pointer" />
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
              totalItems={total}
              itemsPerPage={itemsPerPage}
              itemLabel="applicants"
              onFirst={() => setCurrentPage(1)}
              onPrevious={() => setCurrentPage((prev) => prev - 1)}
              onNext={() => setCurrentPage((prev) => prev + 1)}
              onLast={() => setCurrentPage(totalPages)}
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
            />
          )}
        </div>
      )}
    </ListingPageContainer>
  );
}



