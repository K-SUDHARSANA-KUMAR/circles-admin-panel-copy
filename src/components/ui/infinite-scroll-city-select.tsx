'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchCities, type City } from '@/services/cities.service';

interface InfiniteScrollCitySelectProps {
  /** Country ID (snowflake) to filter cities. Required. */
  countryId?: string;
  /** Currently selected city ID */
  value?: string;
  /** Display label for the selected city */
  displayValue?: string;
  /** Called when a city is selected */
  onValueChange: (cityId: string, cityName: string, countryCode?: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const PAGE_SIZE = 20;

export function InfiniteScrollCitySelect({
  countryId,
  value,
  displayValue,
  onValueChange,
  disabled = false,
  placeholder = 'Select a city...',
  className,
}: InfiniteScrollCitySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const skipRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<any>(null);
  const fetchIdRef = useRef(0); // prevents stale responses

  const getCityId = (c: City) => String(c.cityId ?? c.city_id ?? c.id);

  // ── Fetch a page of cities ─────────────────────────────────────────────
  const fetchPage = useCallback(
    async (skip: number, searchQuery: string, append: boolean) => {
      const id = ++fetchIdRef.current;
      const isFirst = skip === 0;
      if (isFirst) setLoading(true);
      else setLoadingMore(true);

      try {
        const data = await fetchCities({
          limit: PAGE_SIZE,
          skip,
          search: searchQuery || undefined,
          countryIds: countryId ? [countryId] : undefined,
        });

        // Ignore stale responses
        if (id !== fetchIdRef.current) return;

        const items = Array.isArray(data) ? data : [];

        if (append) {
          setCities((prev) => [...prev, ...items]);
        } else {
          setCities(items);
        }

        skipRef.current = skip + items.length;
        setHasMore(items.length >= PAGE_SIZE);
      } catch (err) {
        console.error('Failed to fetch cities:', err);
      } finally {
        if (id === fetchIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [countryId],
  );

  // ── Load first 2 pages when popover opens ──────────────────────────────
  useEffect(() => {
    if (open) {
      setCities([]);
      skipRef.current = 0;
      setHasMore(true);
      setSearch('');

      // Load 2 pages at once for instant feel (TL strategy)
      const loadInitial = async () => {
        const id = ++fetchIdRef.current;
        setLoading(true);
        try {
          const data = await fetchCities({
            limit: PAGE_SIZE * 2,
            skip: 0,
            countryIds: countryId ? [countryId] : undefined,
          });
          if (id !== fetchIdRef.current) return;
          const items = Array.isArray(data) ? data : [];
          setCities(items);
          skipRef.current = items.length;
          setHasMore(items.length >= PAGE_SIZE * 2);
        } catch (err) {
          console.error('Failed to load initial cities:', err);
        } finally {
          if (id === fetchIdRef.current) setLoading(false);
        }
      };
      loadInitial();
    }
  }, [open, countryId]);

  // ── Search with debounce ───────────────────────────────────────────────
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setCities([]);
      skipRef.current = 0;
      setHasMore(true);
      fetchPage(0, val, false);
    }, 300);
  };

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // ── Infinite scroll via IntersectionObserver ───────────────────────────
  useEffect(() => {
    if (!open) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchPage(skipRef.current, search, true);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasMore, loading, loadingMore, search, fetchPage]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full h-11 justify-between rounded-xl bg-[#171717] border-border/50 text-left font-normal hover:bg-[#222]',
            !value && 'text-muted-foreground/60',
            className,
          )}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        {/* Search bar */}
        <div className="flex items-center border-b border-border/50 px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            placeholder="Search cities..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            autoFocus
          />
        </div>

        {/* Scrollable city list */}
        <div className="max-h-[220px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading cities...
            </div>
          ) : cities.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              No cities found.
            </div>
          ) : (
            <>
              {cities.map((c, index) => {
                const cid = getCityId(c);
                const isSelected = value === cid;
                // Place prefetch sentinel 10 items before end
                const isPrefetchTrigger = index === cities.length - 10;
                return (
                  <React.Fragment key={cid}>
                    {isPrefetchTrigger && <div ref={sentinelRef} className="h-0" />}
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center px-3 py-2 text-sm cursor-pointer hover:bg-accent/50 transition-colors',
                        isSelected && 'bg-accent',
                      )}
                      onClick={() => {
                        const countryCode = c.country?.code ?? c.country_code;
                        onValueChange(cid, c.name, countryCode);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4 shrink-0',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {c.name}
                    </button>
                  </React.Fragment>
                );
              })}

              {/* Fallback sentinel at the very end for lists shorter than 10 */}
              {cities.length < 10 && <div ref={sentinelRef} className="h-0" />}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
