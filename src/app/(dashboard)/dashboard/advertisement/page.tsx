'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { DAYS_OF_WEEK } from '@/constants/commons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import NavKeys from '@/constants/navkeys';
import PageHeader from '@/components/shared/page-header';
import { Advertisement } from '@/features/dashboard/advertisement/types/advertisement.types';

type Store = Record<string, Advertisement[]>;

const STORAGE_KEY = 'advLabelsByDate';

function loadStore(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

export default function AdvertisementPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [storeVersion, setStoreVersion] = useState(0);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) =>
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const isDayInCurrentMonth = (day: Date) =>
    day >= monthStart && day <= monthEnd;
  const isSunday = (day: Date) => day.getDay() === 0;
  const dateKey = (day: Date) => format(day, 'yyyy-MM-dd');

  const store = useMemo(() => loadStore(), [storeVersion, currentDate]);

  const goCreate = (day: Date) => {
    router.push(`${NavKeys.AdvertisementCreation}?date=${dateKey(day)}`);
  };
  const goView = (day: Date) => {
    router.push(`${NavKeys.AdvertisementView}?date=${dateKey(day)}`);
  };

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Advertisement" />

      <div className="w-full rounded-lg bg-card p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-medium">Advertisement Calendar</h2>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Month</span>
            <Button
              variant="tertiary"
              size="icon"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="tertiary"
              size="icon"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mb-3 flex w-full items-center gap-2 font-semibold">
          <div className="bg-background flex w-full justify-center rounded-md p-5">
            Month: {format(currentDate, 'MMMM yyyy')}
          </div>
        </div>

        <div className={cn('grid grid-cols-7 gap-2')}>
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className={cn(
                'bg-background flex h-12 items-center justify-center rounded-md font-medium'
              )}
            >
              {day}
            </div>
          ))}

          {calendarDays.map((day, index) => {
            const key = dateKey(day);
            const items = store[key] || [];
            return (
              <div
                key={index}
                className={cn(
                  'h-30 rounded-md border-2 border-neutral-200 p-2 transition-colors hover:bg-gray-50',
                  isDayInCurrentMonth(day) ? 'bg-card' : 'bg-neutral-100',
                  isToday(day) && 'border-primary',
                  isSunday(day) && 'border-red-100 bg-red-200/10'
                )}
              >
                <div
                  className={cn('flex h-full flex-col justify-between gap-2')}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-base font-semibold',
                        isToday(day) && 'text-primary',
                        isDayInCurrentMonth(day) &&
                          !isToday(day) &&
                          'text-foreground',
                        !isDayInCurrentMonth(day) && 'text-gray-400'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => goView(day)}>
                          Create / View
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* Keep cells clean: no inline counts or labels */}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
