'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange, Matcher } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps {
  dateRange?: DateRange;
  onSelect: (dateRange: DateRange | undefined) => void;
  className?: string;
  numberOfMonths?: number;
  placeholder?: string;
  disabled?: Matcher | Matcher[];
}

export function DateRangePicker({
  dateRange,
  onSelect,
  className,
  numberOfMonths = 2,
  placeholder = 'Pick a date range',
  disabled,
}: DateRangePickerProps) {
  const formatDateRange = (range: DateRange | undefined) => {
    if (!range) return placeholder;

    const { from, to } = range;

    if (from && to) {
      return `${format(from, 'dd/MM/yyyy')} - ${format(to, 'dd/MM/yyyy')}`;
    }

    if (from) {
      return `${format(from, 'dd/MM/yyyy')} - ...`;
    }

    return placeholder;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="white"
          className={cn(
            'w-full justify-start text-left font-normal',
            !dateRange && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange(dateRange)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={onSelect}
          initialFocus
          numberOfMonths={numberOfMonths}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}
