'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DateRange, type DayClickEventHandler } from 'react-day-picker';

interface DatePickerProps {
  date?: Date;
  onSelect: (date: Date | undefined) => void;
  className?: string;
  disablePastDates?: boolean;
  disabled?: boolean;
}

interface DateRangePickerProps {
  dateRange?: DateRange;
  onSelect: (dateRange: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
  disablePastDates?: boolean;
  disabled?: boolean;
  maxDays?: number;
  getValidatedRange?: (startDate: Date) => DateRange | undefined;
  mode?: 'auto' | 'manual';
  minDaysFromToday?: number;
  customDisabledDates?: (date: Date) => boolean;
}

export function DatePicker({
  date,
  onSelect,
  className,
  disablePastDates = false,
  disabled = false,
}: DatePickerProps) {
  const handleSingleSelect = React.useCallback(
    (incoming: Date | DateRange | undefined) => {
      if (!incoming) {
        onSelect(undefined);
        return;
      }

      if (incoming instanceof Date) {
        onSelect(incoming);
        return;
      }

      if ('from' in incoming && incoming.from instanceof Date) {
        onSelect(incoming.from);
      }
    },
    [onSelect]
  );

  const getDisabledDates = (date: Date) => {
    if (disablePastDates) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date < today;
    }
    return false;
  };

  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="white"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            disabled && 'cursor-not-allowed opacity-50',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date instanceof Date && !isNaN(date.getTime()) ? (
            format(date, 'PPP')
          ) : (
            <span>Pick a date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSingleSelect}
          disabled={getDisabledDates}
          initialFocus
          captionLayout="dropdown"
          fromYear={1900}
          toYear={2100}
        />
      </PopoverContent>
    </Popover>
  );
}

export function DateRangePicker({
  dateRange,
  onSelect,
  className,
  placeholder = 'Pick a date range',
  disablePastDates = false,
  disabled = false,
  maxDays,
  getValidatedRange,
  mode = 'auto',
  minDaysFromToday,
  customDisabledDates,
}: DateRangePickerProps) {
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) {
      return;
    }

    onSelect(undefined);
  };

  const computeRangeFromStart = React.useCallback(
    (startDate: Date): DateRange => {
      const normalizedStart = new Date(startDate);
      normalizedStart.setHours(0, 0, 0, 0);

      if (getValidatedRange) {
        const validatedRange = getValidatedRange(normalizedStart);
        if (validatedRange) {
          return validatedRange;
        }
      }

      if (maxDays) {
        const toDate = new Date(normalizedStart);
        toDate.setDate(toDate.getDate() + maxDays - 1);
        return { from: normalizedStart, to: toDate };
      }

      return { from: normalizedStart, to: normalizedStart };
    },
    [getValidatedRange, maxDays]
  );

  const handleCalendarSelect = React.useCallback(
    (selection: Date | DateRange | undefined) => {
      if (!selection) {
        onSelect(undefined);
        return;
      }

      if (mode === 'manual') {
        if (selection instanceof Date) {
          onSelect({ from: selection, to: undefined });
        } else {
          onSelect(selection);
        }
        return;
      }

      const startDate =
        selection instanceof Date ? selection : selection.from ?? selection.to;

      if (!startDate) {
        onSelect(undefined);
        return;
      }

      const nextRange = computeRangeFromStart(startDate);
      onSelect(nextRange);
    },
    [computeRangeFromStart, mode, onSelect]
  );

  const handleDayClick = React.useCallback<DayClickEventHandler>(
    (day, modifiers, event) => {
      if (disabled || modifiers.disabled) {
        return;
      }

      if (mode === 'manual') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const nextRange = computeRangeFromStart(day);
      onSelect(nextRange);
    },
    [computeRangeFromStart, disabled, mode, onSelect]
  );

  const isValidDate = (value: unknown): value is Date => {
    return value instanceof Date && !isNaN(value.getTime());
  };

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from || !isValidDate(range.from)) {
      return placeholder;
    }

    const formattedStart = format(range.from, 'MMM dd, yyyy');

    if (!range.to || !isValidDate(range.to)) {
      return formattedStart;
    }

    const formattedEnd = format(range.to, 'MMM dd, yyyy');
    return `${formattedStart} - ${formattedEnd}`;
  };

  const hasSelection = dateRange?.from || dateRange?.to;

  const getDisabledDates = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Use custom disabled dates function if provided
    if (customDisabledDates) {
      return customDisabledDates(date);
    }

    // Check for minimum days from today restriction
    if (minDaysFromToday !== undefined) {
      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() + minDaysFromToday);
      if (date < minDate) {
        return true;
      }
    }

    // Only disable past dates if required
    // Allow users to click on any future date to change the start date
    if (disablePastDates && date < today) {
      return true;
    }

    return false;
  };

  return (
    <Popover>
      <div className="relative w-full">
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            variant="white"
            className={cn(
              'w-full justify-start pr-8 text-left font-normal',
              !hasSelection && 'text-muted-foreground',
              disabled && 'cursor-not-allowed opacity-50',
              className
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="truncate">{formatDateRange(dateRange)}</span>
          </Button>
        </PopoverTrigger>
        {hasSelection && !disabled && (
          <button
            type="button"
            className="text-muted-foreground group absolute top-1/2 right-2 z-10 flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center hover:text-red-500"
            onClick={handleClear}
          >
            <X
              className="h-3 w-3 transition-transform duration-200 group-hover:-rotate-90 group-hover:text-red-500"
              strokeWidth={3}
            />
          </button>
        )}
      </div>
      <PopoverContent className="w-auto p-0" align="center">
        <div className="flex flex-col">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleCalendarSelect}
            onDayClick={handleDayClick}
            numberOfMonths={1}
            disabled={getDisabledDates}
            initialFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
