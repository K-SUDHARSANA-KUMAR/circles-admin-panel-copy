'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconChevronDown, IconSearch, IconCheck, IconX } from '@tabler/icons-react';
import { fetchCities } from '@/services/cities.service';
import { fetchCountries } from '@/services/countries.service';
import { fetchVenues } from '@/services/venue.service';
import { fetchAdminUsers } from '@/services/adminuser.service';

let countriesCache: any[] | null = null;

export interface FilterOption {
  label: string;
  value: any;
}

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'boolean' | 'number' | 'sort';
  options?: FilterOption[];
  placeholder?: string;
}

export interface FilterDropdownProps {
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'boolean' | 'number' | 'sort';
  options?: FilterOption[];
  placeholder?: string;
  value: any;
  onChange: (value: any) => void;
  clearable?: boolean;
  activeFilters?: Record<string, any>;
  hasVenues?: boolean;
}

export default function FilterDropdown({
  label,
  type,
  options = [],
  placeholder,
  value,
  onChange,
  clearable = true,
  activeFilters,
  hasVenues = true,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState<any>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [apiOptions, setApiOptions] = useState<FilterOption[]>(options);
  const [apiLoading, setApiLoading] = useState(false);

  // City infinite scroll state
  const citySkipRef = useRef(0);
  const [cityHasMore, setCityHasMore] = useState(true);
  const [cityLoadingMore, setCityLoadingMore] = useState(false);
  const citySentinelRef = useRef<HTMLDivElement>(null);
  const cityFetchIdRef = useRef(0);

  const cleanLabel = label.toLowerCase().trim();
  const isCity = cleanLabel === 'city' || cleanLabel === 'cities';
  const isCountry = cleanLabel === 'country' || cleanLabel === 'countries';
  const isVenueName = cleanLabel === 'venue name' || cleanLabel === 'venue' || cleanLabel === 'venues';
  const isEmail = cleanLabel === 'email';
  const currentOptions = (isCity || isCountry || isVenueName || isEmail) ? apiOptions : options;
  console.log(`[FilterDropdown] ${label}: options=`, options, `currentOptions=`, currentOptions);

  // ── City↔Country filter dependency ──────────────────────────────────
  const relatedCountryNames: string[] | undefined = (() => {
    const val = activeFilters?.country;
    if (!val) return undefined;
    const arr = (Array.isArray(val) ? val : [val]).filter(Boolean);
    return arr.length > 0 ? arr : undefined;
  })();
  const relatedCityNames: string[] | undefined = (() => {
    const val = activeFilters?.city;
    if (!val) return undefined;
    const arr = (Array.isArray(val) ? val : [val]).filter(Boolean);
    return arr.length > 0 ? arr : undefined;
  })();
  const relatedCountryKey = JSON.stringify(relatedCountryNames || []);
  const relatedCityKey = JSON.stringify(relatedCityNames || []);

  // Sync local state when popover opens
  useEffect(() => {
    if (isOpen) {
      if (isCity || isCountry || isVenueName || isEmail) {
        setApiOptions([]);
      }
      if (value === undefined || value === null) {
        if (type === 'number') {
          setLocalValue({ min: '', max: '' });
        } else if (type === 'text') {
          setLocalValue('');
        } else {
          setLocalValue([]);
        }
      } else {
        if (['select', 'boolean', 'sort'].includes(type)) {
          setLocalValue(Array.isArray(value) ? value : [value]);
        } else {
          setLocalValue(JSON.parse(JSON.stringify(value)));
        }
      }
      setSearchQuery('');
    }
  }, [isOpen, value, type, isCity, isCountry, isVenueName, isEmail]);

  // Fetch cities/countries/venues/emails dynamically if needed
  useEffect(() => {
    if (!isOpen) return;

    if (isCity) {
      const CITY_PAGE_SIZE = 20;
      const loadCities = async (skip: number, searchStr: string, append: boolean) => {
        const id = ++cityFetchIdRef.current;
        if (skip === 0) setApiLoading(true);
        else setCityLoadingMore(true);
        try {
          const limit = skip === 0 ? CITY_PAGE_SIZE * 2 : CITY_PAGE_SIZE;
          const data = await fetchCities({ search: searchStr || undefined, limit, skip, countries: relatedCountryNames, hasVenues });
          if (id !== cityFetchIdRef.current) return;
          const mapped = Array.isArray(data)
            ? data
                .filter((c: any) => c && c.name)
                .map((c: any) => ({
                  label: `${c.name} (${c.country_code || c.country?.code || '—'})`,
                  value: c.name,
                }))
            : [];

          // Merge already selected values so they don't get lost
          const selectedVals = Array.isArray(value) ? value : (value ? [value] : []);

          if (append) {
            setApiOptions(prev => {
              const merged = [...prev, ...mapped];
              selectedVals.forEach((val: any) => {
                if (!merged.find(m => m.value === val)) {
                  merged.push({ label: val, value: val });
                }
              });
              return merged;
            });
          } else {
            const merged = [...mapped];
            selectedVals.forEach((val: any) => {
              if (!merged.find(m => m.value === val)) {
                merged.push({ label: val, value: val });
              }
            });
            setApiOptions(merged);
          }

          citySkipRef.current = skip + mapped.length;
          setCityHasMore(mapped.length >= CITY_PAGE_SIZE);
        } catch (err) {
          console.error('Error fetching dynamic cities:', err);
        } finally {
          if (id === cityFetchIdRef.current) {
            setApiLoading(false);
            setCityLoadingMore(false);
          }
        }
      };

      // Reset and load on open or search change
      citySkipRef.current = 0;
      setCityHasMore(true);
      if (searchQuery) {
        const timer = setTimeout(() => loadCities(0, searchQuery, false), 300);
        return () => clearTimeout(timer);
      } else {
        loadCities(0, '', false);
      }
    } else if (isCountry) {
      const loadCountries = async () => {
        setApiLoading(true);
        try {
          // If cities are selected, find their countries to restrict the list
          let allowedCountryNames: Set<string> | null = null;
          if (relatedCityNames?.length) {
            try {
              const citiesData = await fetchCities({ cityNames: relatedCityNames, limit: 100 });
              allowedCountryNames = new Set<string>();
              for (const city of citiesData as any[]) {
                const countryName = city.country?.name;
                if (countryName) allowedCountryNames.add(countryName);
              }
            } catch (err) {
              console.error('Error fetching cities for country constraint:', err);
            }
          }

          let data: any[];
          if (!searchQuery && !relatedCityNames?.length && countriesCache) {
            data = countriesCache;
          } else {
            const [res1, res2, res3] = await Promise.all([
              fetchCountries({ search: searchQuery, limit: 100, skip: 0 }),
              fetchCountries({ search: searchQuery, limit: 100, skip: 100 }),
              fetchCountries({ search: searchQuery, limit: 100, skip: 200 }),
            ]);
            data = [...res1, ...res2, ...res3];
            if (!searchQuery && !relatedCityNames?.length) {
              countriesCache = data;
            }
          }

          let mapped = Array.isArray(data)
            ? data
              .filter((c: any) => c && c.name)
              .map((c: any) => ({
                label: c.name,
                value: c.name,
              }))
            : [];

          // Filter to only show countries that contain the selected cities
          if (allowedCountryNames && allowedCountryNames.size > 0) {
            mapped = mapped.filter(item => allowedCountryNames!.has(item.value));
          }

          // Merge already selected values
          const selectedVals = Array.isArray(value) ? value : (value ? [value] : []);
          const merged = [...mapped];
          selectedVals.forEach((val: any) => {
            if (!merged.find(m => m.value === val)) {
              merged.push({ label: val, value: val });
            }
          });

          setApiOptions(merged);
        } catch (err) {
          console.error('Error fetching dynamic countries:', err);
        } finally {
          setApiLoading(false);
        }
      };

      const timer = setTimeout(loadCountries, searchQuery ? 300 : 0);
      return () => clearTimeout(timer);
    } else if (isVenueName) {
      const loadVenuesData = async () => {
        setApiLoading(true);
        try {
          const data = await fetchVenues({ search: searchQuery, limit: 100 });
          const mapped = Array.isArray(data)
            ? data
              .filter((v: any) => v && v.name)
              .map((v: any) => ({
                label: v.name,
                value: v.name,
              }))
            : [];

          // Make names unique
          const uniqueMap: Record<string, any> = {};
          mapped.forEach(item => {
            uniqueMap[item.value] = item;
          });
          const uniqueList = Object.values(uniqueMap);

          // Merge already selected values
          const selectedVals = Array.isArray(value) ? value : (value ? [value] : []);
          const merged = [...uniqueList];
          selectedVals.forEach((val: any) => {
            if (!merged.find(m => m.value === val)) {
              merged.push({ label: val, value: val });
            }
          });

          setApiOptions(merged);
        } catch (err) {
          console.error('Error fetching dynamic venues:', err);
        } finally {
          setApiLoading(false);
        }
      };

      const timer = setTimeout(loadVenuesData, searchQuery ? 300 : 0);
      return () => clearTimeout(timer);
    } else if (isEmail) {
      const loadEmails = async () => {
        setApiLoading(true);
        try {
          const res = await fetchAdminUsers({ search: searchQuery, limit: 100 });
          const mapped = Array.isArray(res.users)
            ? res.users
              .filter((u: any) => u && u.email)
              .map((u: any) => ({
                label: u.email,
                value: u.email,
              }))
            : [];

          // Merge already selected values
          const selectedVals = Array.isArray(value) ? value : (value ? [value] : []);
          const merged = [...mapped];
          selectedVals.forEach((val: any) => {
            if (!merged.find(m => m.value === val)) {
              merged.push({ label: val, value: val });
            }
          });

          setApiOptions(merged);
        } catch (err) {
          console.error('Error fetching dynamic admin emails:', err);
        } finally {
          setApiLoading(false);
        }
      };

      const timer = setTimeout(loadEmails, searchQuery ? 300 : 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, searchQuery, label, value, isCity, isCountry, isVenueName, isEmail, relatedCountryKey, relatedCityKey]);

  // ── City infinite scroll via IntersectionObserver ──────────────────────
  const loadMoreCities = useCallback(() => {
    if (!isCity || !cityHasMore || apiLoading || cityLoadingMore || citySkipRef.current === 0) return;
    const CITY_PAGE_SIZE = 20;
    const id = ++cityFetchIdRef.current;
    setCityLoadingMore(true);
    fetchCities({ search: searchQuery || undefined, limit: CITY_PAGE_SIZE, skip: citySkipRef.current, countries: relatedCountryNames, hasVenues })
      .then((data) => {
        if (id !== cityFetchIdRef.current) return;
        const mapped = Array.isArray(data)
          ? data.filter((c: any) => c && c.name).map((c: any) => ({
              label: `${c.name} (${c.country_code || c.country?.code || '—'})`,
              value: c.name,
            }))
          : [];
        setApiOptions(prev => [...prev, ...mapped]);
        citySkipRef.current += mapped.length;
        setCityHasMore(mapped.length >= CITY_PAGE_SIZE);
      })
      .catch(err => console.error('Error loading more cities:', err))
      .finally(() => {
        if (id === cityFetchIdRef.current) setCityLoadingMore(false);
      });
  }, [isCity, cityHasMore, apiLoading, cityLoadingMore, searchQuery, relatedCountryNames]);

  useEffect(() => {
    if (!isOpen || !isCity) return;
    const sentinel = citySentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreCities(); },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isOpen, isCity, loadMoreCities]);

  const handleApply = () => {
    let finalValue = localValue;

    // Clean up empty values before applying
    if (type === 'number') {
      const minVal = localValue?.min;
      const maxVal = localValue?.max;
      if ((minVal === undefined || minVal === '') && (maxVal === undefined || maxVal === '')) {
        finalValue = undefined;
      } else {
        finalValue = {
          min: minVal !== '' && minVal !== undefined ? Number(minVal) : undefined,
          max: maxVal !== '' && maxVal !== undefined ? Number(maxVal) : undefined,
        };
      }
    } else if (type === 'text') {
      if (!localValue || localValue.trim() === '') {
        finalValue = undefined;
      } else {
        finalValue = localValue.trim();
      }
    } else if (['select', 'boolean', 'sort'].includes(type)) {
      finalValue = Array.isArray(localValue) && localValue.length > 0 ? localValue[0] : undefined;
    } else {
      if (!localValue || localValue.length === 0) {
        finalValue = undefined;
      }
    }

    onChange(finalValue);
    setIsOpen(false);
  };

  const handleReset = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange(undefined);
    setIsOpen(false);
  };

  const toggleOption = (optVal: any) => {
    if (['select', 'boolean', 'sort'].includes(type)) {
      if (Array.isArray(localValue) && localValue.includes(optVal)) {
        setLocalValue([]);
      } else {
        setLocalValue([optVal]);
      }
    } else {
      const current = Array.isArray(localValue) ? localValue : [];
      if (current.includes(optVal)) {
        setLocalValue(current.filter((v: any) => v !== optVal));
      } else {
        setLocalValue([...current, optVal]);
      }
    }
  };

  // Determine if filter is currently active
  const hasValue = () => {
    if (value === undefined || value === null) return false;
    if (type === 'number') {
      return (value.min !== undefined && value.min !== '') || (value.max !== undefined && value.max !== '');
    }
    if (type === 'text') {
      return typeof value === 'string' && value.trim() !== '';
    }
    if (['select', 'boolean', 'sort'].includes(type)) {
      return true;
    }
    return Array.isArray(value) && value.length > 0;
  };

  // Get display text for the filter button
  const getButtonText = () => {
    if (!hasValue()) return label;

    if (type === 'number') {
      const min = value.min;
      const max = value.max;
      if (min !== undefined && max !== undefined) {
        return `${label}: ${min}-${max}`;
      } else if (min !== undefined) {
        return `${label}: >=${min}`;
      } else if (max !== undefined) {
        return `${label}: <=${max}`;
      }
      return label;
    }

    if (type === 'text') {
      return `${label}: "${value}"`;
    }

    // Array types (select, multiselect, boolean, sort)
    const selectedVals = Array.isArray(value) ? value : (value !== undefined && value !== null ? [value] : []);
    const matchedLabels = selectedVals.map(val => {
      const found = currentOptions.find(o => o.value === val);
      return found ? found.label : String(val);
    });

    if (matchedLabels.length === 0) return label;
    if (matchedLabels.length <= 2) {
      return `${label}: ${matchedLabels.join(', ')}`;
    }
    return `${label}: ${matchedLabels.slice(0, 2).join(', ')} (+${matchedLabels.length - 2})`;
  };

  // Filter right options by search query (only locally if not dynamically fetching)
  const filteredOptions = (isCity || isCountry)
    ? currentOptions
    : currentOptions.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const isActive = hasValue() && clearable;

  const showSearch = currentOptions.length > 5 || isCity;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-8 text-[13px] font-semibold border-zinc-800 bg-[#0c0c0e] hover:bg-zinc-900 transition-all flex items-center gap-1.5 px-3 rounded-lg select-none ${isActive
              ? 'border-purple-900/50 bg-[#1c122c]/40 text-[#d8b4fe] hover:text-[#e9d5ff] hover:bg-[#25183a]/40 shadow-sm shadow-purple-950/10'
              : 'text-zinc-300 hover:text-white'
            }`}
        >
          <span>{getButtonText()}</span>
          {isActive ? (
            <span
              onClick={handleReset}
              className="p-0.5 rounded-full hover:bg-purple-900/40 text-purple-400 hover:text-purple-300 transition-colors shrink-0 cursor-pointer"
              title="Clear filter"
            >
              <IconX size={11} strokeWidth={3} />
            </span>
          ) : (
            <IconChevronDown size={12} className="text-zinc-500 shrink-0" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[260px] p-3 bg-[#09090b] border border-[#18181b] text-white flex flex-col shadow-2xl rounded-xl overflow-hidden duration-200 z-50 space-y-2.5">
        <div className="text-[11px] font-bold uppercase tracking-widest text-[#d8b4fe] select-none">
          Filter by {label}
        </div>

        {/* Dynamic Fields */}
        <div className="flex-1 max-h-[220px] overflow-y-auto pr-1 space-y-2.5">

          {/* TEXT INPUT TYPE */}
          {type === 'text' && (
            <div className="pt-0.5">
              <Input
                placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
                value={localValue ?? ''}
                onChange={(e) => setLocalValue(e.target.value)}
                className="h-8 text-[13px] bg-zinc-900/60 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 focus:border-[#d8b4fe] rounded-lg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApply();
                }}
              />
            </div>
          )}

          {/* RANGE/NUMBER INPUT TYPE */}
          {type === 'number' && (
            <div className="flex gap-2 items-center pt-0.5">
              <input
                type="number"
                placeholder="Min"
                value={localValue?.min ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalValue((prev: any) => ({
                    ...prev,
                    min: val !== '' ? val : '',
                  }));
                }}
                className="w-full h-8 text-[13px] bg-zinc-900/60 border border-zinc-800 text-zinc-300 rounded-lg px-2.5 outline-none focus:border-[#d8b4fe] transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApply();
                }}
              />
              <span className="text-zinc-600 text-xs">to</span>
              <input
                type="number"
                placeholder="Max"
                value={localValue?.max ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalValue((prev: any) => ({
                    ...prev,
                    max: val !== '' ? val : '',
                  }));
                }}
                className="w-full h-8 text-[13px] bg-zinc-900/60 border border-zinc-800 text-zinc-300 rounded-lg px-2.5 outline-none focus:border-[#d8b4fe] transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApply();
                }}
              />
            </div>
          )}

          {/* CHECKLISTS (select, multiselect, boolean, sort) */}
          {['select', 'multiselect', 'boolean', 'sort'].includes(type) && (
            <div className="space-y-2">
              {showSearch && (
                <div className="relative">
                  <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
                  <Input
                    placeholder={`Search ${label.toLowerCase()}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-6 h-7 text-xs bg-zinc-900 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 rounded-md focus:border-zinc-700"
                  />
                </div>
              )}

              <div className="space-y-1 max-h-[160px] overflow-y-auto pr-0.5">
                {apiLoading ? (
                  <div className="text-[10px] text-zinc-500 py-4 text-center flex items-center justify-center gap-1.5 select-none animate-pulse">
                    <div className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-zinc-700 border-t-zinc-400" />
                    <span>Searching...</span>
                  </div>
                ) : filteredOptions.length === 0 ? (
                  <div className="text-[10px] text-zinc-600 py-3 text-center select-none">
                    No matching options
                  </div>
                ) : (
                  filteredOptions.map((option, index) => {
                    const isChecked = Array.isArray(localValue) && localValue.includes(option.value);
                    return (
                      <button
                        key={`${option.value ?? ''}-${index}`}
                        type="button"
                        onClick={() => toggleOption(option.value)}
                        className="w-full flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-zinc-950 text-left text-[13px] text-zinc-300 hover:text-white transition-all select-none group"
                      >
                        <div className={`h-3.5 w-3.5 rounded border transition-all flex items-center justify-center shrink-0 ${isChecked
                            ? 'bg-[#d8b4fe] border-[#d8b4fe] text-[#3b0764]'
                            : 'border-zinc-800 bg-zinc-900 group-hover:border-zinc-700'
                          }`}>
                          {isChecked && <IconCheck size={10} strokeWidth={3} />}
                        </div>
                        <span className="truncate">{option.label}</span>
                      </button>
                    );
                  })
                )}
                {/* Scroll sentinel for fetching more cities */}
                {isCity && cityHasMore && (
                  <div ref={citySentinelRef} className="h-4 flex items-center justify-center py-2 select-none">
                    {cityLoadingMore && (
                      <div className="h-3 w-3 animate-spin rounded-full border border-zinc-800 border-t-zinc-400" />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 justify-end pt-2 border-t border-[#18181b] shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleReset()}
            className="h-7 text-[11px] font-bold uppercase tracking-wider border-zinc-800 bg-[#0c0c0e] hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg px-2.5"
          >
            Reset
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="h-7 text-[11px] font-bold uppercase tracking-wider bg-[#d8b4fe] hover:bg-[#c084fc] text-[#3b0764] rounded-lg px-2.5"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
