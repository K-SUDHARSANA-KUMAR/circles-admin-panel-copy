'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  IconPlus,
  IconSearch,
  IconRefresh,
  IconAlertCircle,
  IconBuildingCommunity,
  IconPencil,
  IconTrash,
  IconX,
  IconWorld,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react';
import { fetchCities, createCity, updateCity, deleteCity, type City } from '@/services/cities.service';
import { fetchCountries, createCountry, updateCountry, deleteCountry, type Country } from '@/services/countries.service';
import { toast } from 'sonner';
import {
  ListingPageContainer,
  ListingSectionHeader,
  ListingSegmentedTabs,
  ListingToolbar,
  listingStyles,
} from '@/components/shared/listing-page';
import FilterDropdown from '@/components/common/FilterDropdown';
import { cityFilters } from '@/components/common/filters/cities.filters';
import { countryFilters } from '@/components/common/filters/countries.filters';

export default function CitiesPage() {
  const [activeTab, setActiveTab] = useState<'cities' | 'countries'>('cities');

  // Cities states
  const [cities, setCities] = useState<City[]>([]);
  const [totalCities, setTotalCities] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedSearch = useDebounce(searchQuery, 500);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Cities Modal & Action states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<City | null>(null);

  // Cities Form values
  const [newCityName, setNewCityName] = useState('');
  const [newCityCode, setNewCityCode] = useState('');
  const [newCityCountryId, setNewCityCountryId] = useState('');
  const [newCityActive, setNewCityActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cities Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Countries states
  const [countries, setCountries] = useState<Country[]>([]);
  const [totalCountries, setTotalCountries] = useState(0);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countriesError, setCountriesError] = useState<string | null>(null);
  const [searchQueryCountry, setSearchQueryCountry] = useState('');
  const debouncedSearchCountry = useDebounce(searchQueryCountry, 500);

  // Countries Modal & Action states
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [deleteCountryTarget, setDeleteCountryTarget] = useState<Country | null>(null);

  // Countries Form values
  const [newCountryName, setNewCountryName] = useState('');
  const [newCountryCode, setNewCountryCode] = useState('');
  const [newCountryActive, setNewCountryActive] = useState(true);
  const [savingCountry, setSavingCountry] = useState(false);

  // Countries Pagination state
  const [currentCountryPage, setCurrentCountryPage] = useState(1);
  const [itemsPerCountryPage, setItemsPerCountryPage] = useState(10);
  const [activeFiltersCity, setActiveFiltersCity] = useState<Record<string, any>>({});
  const [activeFiltersCountry, setActiveFiltersCountry] = useState<Record<string, any>>({});

  // All countries (fetched once with high limit) for dropdown & name resolution
  const [allCountries, setAllCountries] = useState<Country[]>([]);

  const loadAllCountries = useCallback(async () => {
    try {
      const data = await fetchCountries({ limit: 100 });
      setAllCountries(data);
    } catch (err) {
      console.error('Failed to load all countries:', err);
    }
  }, []);

  useEffect(() => {
    loadAllCountries();
  }, [loadAllCountries]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const getCityStatus = (city: City): 'active' | 'waitlist' | 'inactive' => {
    if ((city as any).status) {
      const s = (city as any).status.toLowerCase();
      if (s === 'active') return 'active';
      if (s === 'waitlist') return 'waitlist';
      if (s === 'inactive') return 'inactive';
    }

    if (city.is_active || city.isActive) {
      return 'active';
    }

    const waitlistCities = ['reykjavík', 'reykjavik', 'marrakech', 'hanoi'];
    if (waitlistCities.includes(city.name.toLowerCase())) {
      return 'waitlist';
    }
    return 'inactive';
  };

  const getCountryName = (city: City): string => {
    if (city.country?.name) return city.country.name;

    const countryId = city.country_id ?? city.countryId ?? '';
    const matchedById = allCountries.find(c =>
      String(c.countryId ?? c.id) === String(countryId)
    );
    if (matchedById) return matchedById.name;

    const code = (city.country?.code ?? city.country_code ?? '').trim().toUpperCase();
    const matchedByCode = allCountries.find(c => c.code.toUpperCase() === code);
    if (matchedByCode) return matchedByCode.name;

    return code || '—';
  };

  // ─── Fetch Cities ──────────────────────────────────────────────────────────
  const loadCities = useCallback(async (searchVal = '', pageNum = 1, filters: Record<string, any> = {}) => {
    setLoading(true);
    setError(null);
    try {
      const skip = (pageNum - 1) * itemsPerPage;

      // Pass country names directly as array to backend (backend resolves via cities→countries join)
      const countries: string[] | undefined = filters.country
        ? (Array.isArray(filters.country) ? filters.country.filter(Boolean) : [filters.country])
        : undefined;

      // Pass city names directly as array to backend (backend resolves via cities table)
      const cityNames: string[] | undefined = filters.city
        ? (Array.isArray(filters.city) ? filters.city.filter(Boolean) : [filters.city])
        : undefined;

      // Map status string → isActive boolean
      let isActive: boolean | undefined = undefined;
      if (filters.status === 'active') {
        isActive = true;
      } else if (filters.status === 'inactive') {
        isActive = false;
      }

      const finalSearch = (!cityNames?.length && !countries?.length) ? (searchVal?.trim() || undefined) : undefined;

      const data = await fetchCities({
        limit: itemsPerPage,
        skip,
        search: finalSearch,
        countries: countries?.length ? countries : undefined,
        cityNames: cityNames?.length ? cityNames : undefined,
        isActive,
      });

      setCities(data);
      const backendTotal = (data as any).totalItems ?? data.length;
      setTotalCities(backendTotal);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load cities. Please try again.';
      setError(msg);
      toast.error('Failed to load cities list');
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage]);

  const prevSearchRef = useRef(debouncedSearch);
  const prevFiltersRef = useRef(activeFiltersCity);

  useEffect(() => {
    let shouldResetPage = false;
    if (prevSearchRef.current !== debouncedSearch) {
      prevSearchRef.current = debouncedSearch;
      shouldResetPage = true;
    }
    if (JSON.stringify(prevFiltersRef.current) !== JSON.stringify(activeFiltersCity)) {
      prevFiltersRef.current = activeFiltersCity;
      shouldResetPage = true;
    }

    if (shouldResetPage) {
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
    }
    loadCities(debouncedSearch, currentPage, activeFiltersCity);
  }, [debouncedSearch, currentPage, activeFiltersCity, loadCities]);

  // ─── Fetch Countries ───────────────────────────────────────────────────────
  const loadCountries = useCallback(async (searchVal = '', pageNum = 1, filters: Record<string, any> = {}) => {
    setCountriesLoading(true);
    setCountriesError(null);
    try {
      const skip = (pageNum - 1) * itemsPerCountryPage;

      // Map status string → isActive boolean
      let isActive: boolean | undefined = undefined;
      let statusStr: string | undefined = undefined;
      if (filters.status === 'active') {
        isActive = true;
        statusStr = 'Active';
      } else if (filters.status === 'inactive') {
        isActive = false;
        statusStr = 'Inactive';
      }

      const finalSearch = filters.name || filters.code || searchVal?.trim() || undefined;
      const data = await fetchCountries({
        limit: itemsPerCountryPage,
        skip,
        search: finalSearch,
        isActive,
      });


      setCountries(data);
      const backendTotal = (data as any).totalItems ?? data.length;
      setTotalCountries(backendTotal);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load countries. Please try again.';
      setCountriesError(msg);
      toast.error('Failed to load countries list');
    } finally {
      setCountriesLoading(false);
    }
  }, [itemsPerCountryPage]);

  const prevSearchCountryRef = useRef(debouncedSearchCountry);
  const prevFiltersCountryRef = useRef(activeFiltersCountry);

  useEffect(() => {
    let shouldResetPage = false;
    if (prevSearchCountryRef.current !== debouncedSearchCountry) {
      prevSearchCountryRef.current = debouncedSearchCountry;
      shouldResetPage = true;
    }
    if (JSON.stringify(prevFiltersCountryRef.current) !== JSON.stringify(activeFiltersCountry)) {
      prevFiltersCountryRef.current = activeFiltersCountry;
      shouldResetPage = true;
    }

    if (shouldResetPage) {
      if (currentCountryPage !== 1) {
        setCurrentCountryPage(1);
        return;
      }
    }
    loadCountries(debouncedSearchCountry, currentCountryPage, activeFiltersCountry);
  }, [debouncedSearchCountry, currentCountryPage, activeFiltersCountry, loadCountries]);

  // ─── Handle Save City (Create / Update) ───────────────────────────────────
  const handleSaveCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName?.trim() || !newCityCountryId?.trim()) {
      toast.warning('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: newCityName.trim(),
        countryId: newCityCountryId,
        isActive: newCityActive,
      };

      if (editingCity) {
        const cityId = editingCity.city_id ?? editingCity.id;
        if (!cityId) throw new Error('City ID is missing');
        await updateCity(cityId, payload);
        toast.success(`Successfully updated city: ${newCityName}`);
      } else {
        await createCity(payload);
        toast.success(`Successfully added city: ${newCityName}`);
      }

      handleCloseModal();
      await loadCities(searchQuery, currentPage, activeFiltersCity);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save city.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Handle Delete City ────────────────────────────────────────────────────
  const handleDeleteCity = async () => {
    if (!deleteTarget) return;
    const cityId = deleteTarget.city_id ?? deleteTarget.id;
    if (!cityId) {
      toast.error('City ID is missing');
      return;
    }

    try {
      await deleteCity(cityId);
      toast.success(`Successfully deleted city: ${deleteTarget.name}`);
      setDeleteTarget(null);
      await loadCities(searchQuery, currentPage, activeFiltersCity);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete city.';
      toast.error(msg);
    }
  };

  // ─── City modal helpers ─────────────────────────────────────────────
  const handleCloseModal = () => {
    setNewCityName('');
    setNewCityCode('');
    setNewCityCountryId('');
    setNewCityActive(true);
    setEditingCity(null);
    setIsModalOpen(false);
  };

  const handleOpenEdit = (city: City) => {
    setEditingCity(city);
    setNewCityName(city.name || '');
    setNewCityCode(city.country_code || city.country?.code || '');
    setNewCityCountryId(city.country_id || city.country?.countryId || city.countryId || '');
    setNewCityActive(city.is_active ?? city.isActive ?? false);
    setIsModalOpen(true);
  };

  // ─── Handle Save Country (Create / Update) ────────────────────────────────
  const handleSaveCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCountryName?.trim() || !newCountryCode?.trim()) {
      toast.warning('Please fill in all required fields');
      return;
    }

    setSavingCountry(true);
    try {
      const payload = {
        name: newCountryName.trim(),
        code: newCountryCode.trim().toUpperCase(),
        isActive: newCountryActive,
      };

      if (editingCountry) {
        const countryId = editingCountry.countryId ?? editingCountry.country_id ?? editingCountry.id;
        if (!countryId) throw new Error('Country ID is missing');
        await updateCountry(countryId, payload);
        toast.success(`Successfully updated country: ${newCountryName}`);
      } else {
        await createCountry(payload);
        toast.success(`Successfully added country: ${newCountryName}`);
      }

      handleCloseCountryModal();
      await loadCountries(searchQueryCountry, currentCountryPage, activeFiltersCountry);
      await loadAllCountries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save country.';
      toast.error(msg);
    } finally {
      setSavingCountry(false);
    }
  };

  // ─── Handle Delete Country ─────────────────────────────────────────────────
  const handleDeleteCountry = async () => {
    if (!deleteCountryTarget) return;
    const countryId = deleteCountryTarget.countryId ?? deleteCountryTarget.country_id ?? deleteCountryTarget.id;
    if (!countryId) {
      toast.error('Country ID is missing');
      return;
    }

    try {
      await deleteCountry(countryId);
      toast.success(`Successfully deleted country: ${deleteCountryTarget.name}`);
      setDeleteCountryTarget(null);
      await loadCountries(searchQueryCountry, currentCountryPage, activeFiltersCountry);
      await loadAllCountries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete country.';
      toast.error(msg);
    }
  };

  // ─── Country modal helpers ─────────────────────────────────────────────
  const handleCloseCountryModal = () => {
    setNewCountryName('');
    setNewCountryCode('');
    setNewCountryActive(true);
    setEditingCountry(null);
    setIsCountryModalOpen(false);
  };

  const handleOpenCountryEdit = (country: Country) => {
    setEditingCountry(country);
    setNewCountryName(country.name || '');
    setNewCountryCode(country.code || '');
    setNewCountryActive(country.isActive ?? country.is_active ?? true);
    setIsCountryModalOpen(true);
  };

  // ─── Filtering & Pagination for Cities ─────────────────────────────────────
  const filteredCities = cities;
  const totalPages = Math.ceil(totalCities / itemsPerPage);
  const paginatedCities = filteredCities;

  // ─── Filtering & Pagination for Countries ──────────────────────────────────
  const filteredCountries = countries.filter((country) => {
    const active = country.isActive ?? country.is_active ?? true;
    if (activeFiltersCountry.status === 'active') return active === true;
    if (activeFiltersCountry.status === 'inactive') return active === false;
    return true;
  });
  const totalCountryPages = Math.ceil(filteredCountries.length / itemsPerCountryPage);
  const paginatedCountries = filteredCountries;



  return (
    <ListingPageContainer>
      <ListingSectionHeader
        icon={IconBuildingCommunity}
        title="City Management"
        subtitle={`${totalCities} cities registered`}
        trailing={
          <ListingSegmentedTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={[
              { id: 'cities', label: 'Cities', icon: IconBuildingCommunity },
              { id: 'countries', label: 'Countries', icon: IconWorld },
            ]}
          />
        }
      />

      {activeTab === 'cities' ? (
        <>
          <ListingToolbar
            countLabel={`${totalCities} Operational Cities`}
            showCount={!loading}
            searchPlaceholder="Search by city name or country..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={() => loadCities(searchQuery, currentPage, activeFiltersCity)}
            refreshDisabled={loading}
            refreshLoading={loading}
            filterAction={
              <div className="flex flex-wrap items-center gap-2">
                {cityFilters.map((filter) => (
                  <FilterDropdown
                    key={filter.key}
                    label={filter.label}
                    type={filter.type}
                    options={filter.options}
                    placeholder={filter.placeholder}
                    value={activeFiltersCity[filter.key]}
                    onChange={(val) =>
                      setActiveFiltersCity((prev) => ({
                        ...prev,
                        [filter.key]: val,
                      }))
                    }
                    activeFilters={activeFiltersCity}
                    hasVenues={false}
                  />
                ))}
              </div>
            }
            primaryAction={
              <Button onClick={() => setIsModalOpen(true)} className={listingStyles.primaryButton}>
                <IconPlus size={14} />
                <span>Add City</span>
              </Button>
            }
          />

          {/* Cities Table Content */}
          {error ? (
            <div className="flex flex-col items-center justify-center gap-3 bg-[#09090b] border border-[#18181b] p-8 rounded-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
                <IconAlertCircle size={24} className="text-destructive" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Failed to load operational cities</p>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-0.5">{error}</p>
              </div>
              <Button
                onClick={() => loadCities(searchQuery, currentPage, activeFiltersCity)}
                variant="outline"
                size="sm"
                className="mt-1 gap-1.5 text-[10px] font-bold uppercase tracking-wider h-8 border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800"
              >
                <IconRefresh size={12} />
                Try Again
              </Button>
            </div>
          ) : (
            <div className="bg-[#09090b] border border-[#18181b] rounded-xl shadow-2xl overflow-hidden animate-in fade-in-50 duration-350">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#18181b]">
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[25%]">
                        City
                      </th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[25%]">
                        Country
                      </th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[25%]">
                        Status
                      </th>
                      <th className="text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[25%]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#18181b]/60">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-20 text-center">
                          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400" />
                          <p className="text-xs text-zinc-500 mt-2 font-medium">Loading operational cities...</p>
                        </td>
                      </tr>
                    ) : paginatedCities.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-20 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <IconBuildingCommunity size={32} className="text-zinc-600" />
                            <p className="text-xs font-semibold text-zinc-400">No operational cities found</p>
                            <p className="text-[11px] text-zinc-600">Try modifying your search or add a new city</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedCities.map((city) => {
                        const status = getCityStatus(city);
                        const country = getCountryName(city);
                        return (
                          <tr
                            key={city.city_id ?? city.id}
                            className="group hover:bg-[#0c0c0e] transition-colors duration-200"
                          >
                            <td className="py-5 px-12 text-sm font-semibold text-white">
                              {city.name}
                            </td>
                            <td className="py-5 px-12 text-sm font-normal text-zinc-400">
                              {country}
                            </td>
                            <td className="py-5 px-12">
                              {status === 'active' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1c122c]/60 border border-[#3b1a60]/50 text-[#d8b4fe] text-[11px] font-semibold select-none">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc]" />
                                  Active
                                </span>
                              ) : status === 'waitlist' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2d1f10]/60 border border-[#5f3e15]/50 text-amber-400 text-[11px] font-semibold select-none">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  Waitlist
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/40 border border-zinc-800/60 text-zinc-400 text-[11px] font-semibold select-none">
                                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="py-5 px-12 text-right">
                              <div className="flex items-center justify-end gap-3.5">
                                <button
                                  onClick={() => handleOpenEdit(city)}
                                  className="text-[#c084fc] hover:text-[#d8b4fe] hover:scale-110 active:scale-95 transition-all p-1 cursor-pointer"
                                  title="Edit City"
                                >
                                  <IconPencil size={15} className="cursor-pointer" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(city)}
                                  className="text-red-400 hover:text-red-300 hover:scale-110 active:scale-95 transition-all p-1 cursor-pointer"
                                  title="Delete City"
                                >
                                  <IconTrash size={15} className="cursor-pointer" />
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
              {!loading && totalCities > 0 && (
                <div className="flex items-center justify-between border-t border-[#18181b] px-12 py-4">
                  <div className="text-[11px] text-zinc-500 text-left">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCities)} of {totalCities} cities
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-7 px-2 text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-800 focus:outline-none transition-all cursor-pointer mr-2 select-none"
                      aria-label="Records per page"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={30}>30</option>
                      <option value={40}>40</option>
                    </select>
                    <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage(1)} className="h-7 w-7 p-0 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 hover:text-white rounded-lg transition-all" aria-label="First page"><IconChevronsLeft size={13} /></button>
                    <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage(prev => prev - 1)} className="h-7 w-7 p-0 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 hover:text-white rounded-lg transition-all" aria-label="Previous page"><IconChevronLeft size={13} /></button>
                    <div className="text-[11px] text-zinc-400 px-2 font-semibold select-none whitespace-nowrap">Page {currentPage} of {totalPages}</div>
                    <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="h-7 w-7 p-0 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 hover:text-white rounded-lg transition-all" aria-label="Next page"><IconChevronRight size={13} /></button>
                    <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)} className="h-7 w-7 p-0 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 hover:text-white rounded-lg transition-all" aria-label="Last page"><IconChevronsRight size={13} /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <ListingToolbar
            countLabel={`${totalCountries} Supported Countries`}
            showCount={!countriesLoading}
            searchPlaceholder="Search by country name or code..."
            searchValue={searchQueryCountry}
            onSearchChange={setSearchQueryCountry}
            onRefresh={() => loadCountries(searchQueryCountry, currentCountryPage, activeFiltersCountry)}
            refreshDisabled={countriesLoading}
            refreshLoading={countriesLoading}
            filterAction={
              <div className="flex flex-wrap items-center gap-2">
                {countryFilters.map((filter) => (
                  <FilterDropdown
                    key={filter.key}
                    label={filter.label}
                    type={filter.type}
                    options={filter.options}
                    placeholder={filter.placeholder}
                    value={activeFiltersCountry?.[filter.key]}
                    onChange={(val) =>
                      setActiveFiltersCountry((prev) => ({
                        ...prev,
                        [filter.key]: val,
                      }))
                    }
                    activeFilters={activeFiltersCountry}
                  />
                ))}
              </div>
            }
            primaryAction={
              <Button onClick={() => setIsCountryModalOpen(true)} className={listingStyles.primaryButton}>
                <IconPlus size={14} />
                <span>Add Country</span>
              </Button>
            }
          />

          {/* Countries Table Content */}
          {countriesError ? (
            <div className="flex flex-col items-center justify-center gap-3 bg-[#09090b] border border-[#18181b] p-8 rounded-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
                <IconAlertCircle size={24} className="text-destructive" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Failed to load supported countries</p>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-0.5">{countriesError}</p>
              </div>
              <Button
                onClick={() => loadCountries(searchQueryCountry, currentCountryPage, activeFiltersCountry)}
                variant="outline"
                size="sm"
                className="mt-1 gap-1.5 text-[10px] font-bold uppercase tracking-wider h-8 border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800"
              >
                <IconRefresh size={12} />
                Try Again
              </Button>
            </div>
          ) : (
            <div className="bg-[#09090b] border border-[#18181b] rounded-xl shadow-2xl overflow-hidden animate-in fade-in-50 duration-350">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#18181b]">
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[33%]">
                        Country Name
                      </th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[33%]">
                        Country Code
                      </th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[20%]">
                        Status
                      </th>
                      <th className="text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[14%]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#18181b]/60">
                    {countriesLoading ? (
                      <tr>
                        <td colSpan={4} className="py-20 text-center">
                          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400" />
                          <p className="text-xs text-zinc-500 mt-2 font-medium">Loading countries list...</p>
                        </td>
                      </tr>
                    ) : paginatedCountries.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-20 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <IconWorld size={32} className="text-zinc-600" />
                            <p className="text-xs font-semibold text-zinc-400">No supported countries found</p>
                            <p className="text-[11px] text-zinc-600">Try adding a new country first</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedCountries.map((country) => {
                        const active = country.isActive ?? country.is_active ?? true;
                        return (
                          <tr
                            key={country.countryId ?? country.id}
                            className="group hover:bg-[#0c0c0e] transition-colors duration-200"
                          >
                            <td className="py-5 px-12 text-sm font-semibold text-white">
                              {country.name}
                            </td>
                            <td className="py-5 px-12 text-sm font-mono text-zinc-400">
                              {country.code}
                            </td>
                            <td className="py-5 px-12">
                              {active ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1c122c]/60 border border-[#3b1a60]/50 text-[#d8b4fe] text-[11px] font-semibold select-none">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc]" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/40 border border-zinc-800/60 text-zinc-400 text-[11px] font-semibold select-none">
                                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="py-5 px-12 text-right">
                              <div className="flex items-center justify-end gap-3.5">
                                <button
                                  onClick={() => handleOpenCountryEdit(country)}
                                  className="text-[#c084fc] hover:text-[#d8b4fe] hover:scale-110 active:scale-95 transition-all p-1 cursor-pointer"
                                  title="Edit Country"
                                >
                                  <IconPencil size={15} className="cursor-pointer" />
                                </button>
                                <button
                                  onClick={() => setDeleteCountryTarget(country)}
                                  className="text-red-400 hover:text-red-300 hover:scale-110 active:scale-95 transition-all p-1 cursor-pointer"
                                  title="Delete Country"
                                >
                                  <IconTrash size={15} className="cursor-pointer" />
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

              {/* Country Pagination Controls */}
              {!countriesLoading && totalCountries > 0 && (
                <div className="flex items-center justify-between border-t border-[#18181b] px-12 py-4">
                  <div className="text-[11px] text-zinc-500 text-left">
                    Showing {(currentCountryPage - 1) * itemsPerCountryPage + 1} to {Math.min(currentCountryPage * itemsPerCountryPage, totalCountries)} of {totalCountries} countries
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={itemsPerCountryPage}
                      onChange={(e) => {
                        setItemsPerCountryPage(Number(e.target.value));
                        setCurrentCountryPage(1);
                      }}
                      className="h-7 px-2 text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-800 focus:outline-none transition-all cursor-pointer mr-2 select-none"
                      aria-label="Records per page"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={30}>30</option>
                      <option value={40}>40</option>
                    </select>
                    <button type="button" disabled={currentCountryPage <= 1} onClick={() => setCurrentCountryPage(1)} className="h-7 w-7 p-0 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 hover:text-white rounded-lg transition-all" aria-label="First page"><IconChevronsLeft size={13} /></button>
                    <button type="button" disabled={currentCountryPage <= 1} onClick={() => setCurrentCountryPage(prev => prev - 1)} className="h-7 w-7 p-0 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 hover:text-white rounded-lg transition-all" aria-label="Previous page"><IconChevronLeft size={13} /></button>
                    <div className="text-[11px] text-zinc-400 px-2 font-semibold select-none whitespace-nowrap">Page {currentCountryPage} of {totalCountryPages}</div>
                    <button type="button" disabled={currentCountryPage >= totalCountryPages} onClick={() => setCurrentCountryPage(prev => prev + 1)} className="h-7 w-7 p-0 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 hover:text-white rounded-lg transition-all" aria-label="Next page"><IconChevronRight size={13} /></button>
                    <button type="button" disabled={currentCountryPage >= totalCountryPages} onClick={() => setCurrentCountryPage(totalCountryPages)} className="h-7 w-7 p-0 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 hover:text-white rounded-lg transition-all" aria-label="Last page"><IconChevronsRight size={13} /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal Dialog for Creating and Editing a City */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-white/10 bg-zinc-950/95 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 rounded-xl">

            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-950/30 border border-purple-900/50 text-[#d8b4fe]">
                  <IconBuildingCommunity size={16} />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-white">
                    {editingCity ? 'Edit City' : 'Add New City'}
                  </CardTitle>
                  <CardDescription className="text-[10px] text-zinc-500 mt-0.5">
                    {editingCity ? 'Modify operational city configurations' : 'Configure a new operational city destination'}
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

            <form onSubmit={handleSaveCity} className="space-y-4">

              {/* City Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  City Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Enter city name..."
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  className="h-9 text-xs bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-purple-500 rounded-lg"
                />
              </div>

              {/* Country Selection Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Country <span className="text-red-500">*</span>
                </label>
                <Select
                  value={newCityCountryId || undefined}
                  onValueChange={(selectedId) => {
                    setNewCityCountryId(selectedId);
                    const selectedCountry = countries.find(c => String(c.countryId ?? c.id) === selectedId);
                    if (selectedCountry) {
                      setNewCityCode(selectedCountry.code);
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-9 text-xs bg-zinc-900 border-zinc-800 text-white rounded-lg focus:border-purple-500">
                    <SelectValue placeholder="Select country..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allCountries.map((country) => {
                      const cid = String(country.countryId ?? country.id);
                      return (
                        <SelectItem key={cid} value={cid}>
                          {country.name} ({country.code})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Operational Status
                </label>
                <Select
                  value={newCityActive ? 'active' : 'inactive'}
                  onValueChange={(val) => setNewCityActive(val === 'active')}
                >
                  <SelectTrigger className="w-full h-9 text-xs bg-zinc-900 border-zinc-800 text-white rounded-lg focus:border-purple-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseModal}
                  className="h-8 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !newCityName?.trim() || !newCityCountryId?.trim()}
                  className="h-8 text-xs font-semibold uppercase tracking-wider px-5 bg-[#d8b4fe] text-[#3b0764] hover:bg-[#c084fc] rounded-lg transition-colors duration-200"
                >
                  {saving ? 'Saving...' : editingCity ? 'Update City' : 'Save City'}
                </Button>
              </div>

            </form>
          </Card>
        </div>
      )}

      {/* Modal Dialog for Creating and Editing a Country */}
      {isCountryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-white/10 bg-zinc-950/95 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 rounded-xl">

            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-950/30 border border-purple-900/50 text-[#d8b4fe]">
                  <IconWorld size={16} />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-white">
                    {editingCountry ? 'Edit Country' : 'Add New Country'}
                  </CardTitle>
                  <CardDescription className="text-[10px] text-zinc-500 mt-0.5">
                    {editingCountry ? 'Modify supported country configuration' : 'Configure a new supported country'}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseCountryModal}
                className="h-8 w-8 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <IconX size={14} />
              </Button>
            </div>

            <form onSubmit={handleSaveCountry} className="space-y-4">

              {/* Country Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Country Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. United States"
                  value={newCountryName}
                  onChange={(e) => setNewCountryName(e.target.value)}
                  className="h-9 text-xs bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-purple-500 rounded-lg"
                />
              </div>

              {/* Country Code Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Country Code <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. US"
                  maxLength={5}
                  value={newCountryCode}
                  onChange={(e) => setNewCountryCode(e.target.value.toUpperCase())}
                  className="h-9 text-xs bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-purple-500 rounded-lg"
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Status
                </label>
                <Select
                  value={newCountryActive ? 'active' : 'inactive'}
                  onValueChange={(val) => setNewCountryActive(val === 'active')}
                >
                  <SelectTrigger className="w-full h-9 text-xs bg-zinc-900 border-zinc-800 text-white rounded-lg focus:border-purple-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseCountryModal}
                  className="h-8 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingCountry || !newCountryName?.trim() || !newCountryCode?.trim()}
                  className="h-8 text-xs font-semibold uppercase tracking-wider px-5 bg-[#d8b4fe] text-[#3b0764] hover:bg-[#c084fc] rounded-lg transition-colors duration-200"
                >
                  {savingCountry ? 'Saving...' : editingCountry ? 'Update Country' : 'Save Country'}
                </Button>
              </div>

            </form>
          </Card>
        </div>
      )}

      {/* Custom Deletion Confirmation Dialog for City */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border-white/10 bg-zinc-950/95 p-5 shadow-2xl space-y-4 rounded-xl">
            <CardHeader className="p-0">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-red-400 uppercase tracking-wider">
                <IconAlertCircle size={16} />
                <span>Confirm Deletion</span>
              </CardTitle>
              <CardDescription className="text-xs pt-1 text-zinc-400">
                Are you sure you want to delete city <strong className="text-white font-semibold">"{deleteTarget.name}"</strong>? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
              <Button
                variant="ghost"
                onClick={() => setDeleteTarget(null)}
                className="h-8 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteCity}
                className="h-8 text-xs font-semibold uppercase tracking-wider px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                Confirm Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Custom Deletion Confirmation Dialog for Country */}
      {deleteCountryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border-white/10 bg-zinc-950/95 p-5 shadow-2xl space-y-4 rounded-xl">
            <CardHeader className="p-0">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-red-400 uppercase tracking-wider">
                <IconAlertCircle size={16} />
                <span>Confirm Deletion</span>
              </CardTitle>
              <CardDescription className="text-xs pt-1 text-zinc-400">
                Are you sure you want to delete country <strong className="text-white font-semibold">"{deleteCountryTarget.name}"</strong>? This action cannot be undone and may affect associated cities.
              </CardDescription>
            </CardHeader>
            <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
              <Button
                variant="ghost"
                onClick={() => setDeleteCountryTarget(null)}
                className="h-8 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteCountry}
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
