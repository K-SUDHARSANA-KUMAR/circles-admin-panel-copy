'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const pad = (n: number) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const STEP_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

interface DateTimePickerProps {
  value?: Date;
  onChange: (value: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Shows an × that empties the field. */
  clearable?: boolean;
  className?: string;
}

/** Day from the calendar, time from hour/minute dropdowns, in the admin's local time. */
export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Pick date and time',
  disabled = false,
  clearable = false,
  className,
}: DateTimePickerProps) {
  const setDay = (day: Date | undefined) => {
    if (!day) return;
    const next = new Date(day);
    next.setHours(value?.getHours() ?? 12, value?.getMinutes() ?? 0, 0, 0);
    onChange(next);
  };

  const setTime = (hours: number, minutes: number) => {
    const next = new Date(value ?? new Date());
    next.setHours(hours, minutes, 0, 0);
    onChange(next);
  };

  // A minute off the 5-minute grid (e.g. set through the API) stays selectable instead of showing blank.
  const minutes =
    value && !STEP_MINUTES.includes(value.getMinutes())
      ? [...STEP_MINUTES, value.getMinutes()].sort((a, b) => a - b)
      : STEP_MINUTES;

  return (
    <Popover>
      <div className="relative w-full">
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full h-11 justify-start rounded-xl bg-[#171717] border-border/50 text-left font-normal hover:bg-[#222]',
              !value && 'text-muted-foreground/60',
              clearable && value && 'pr-9',
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
            <span className="truncate">{value ? format(value, 'EEE d MMM yyyy, HH:mm') : placeholder}</span>
          </Button>
        </PopoverTrigger>
        {clearable && value && !disabled && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => onChange(undefined)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-rose-400"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          onSelect={(d) => setDay(d instanceof Date ? d : undefined)}
        />
        <div className="flex items-center gap-2 border-t border-border/50 p-3">
          <span className="mr-auto text-xs text-muted-foreground">Time</span>
          <Select
            value={value ? String(value.getHours()) : undefined}
            onValueChange={(h) => setTime(Number(h), value?.getMinutes() ?? 0)}
          >
            <SelectTrigger className="w-[72px]" aria-label="Hour">
              <SelectValue placeholder="HH" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {HOURS.map((h) => (
                <SelectItem key={h} value={String(h)}>{pad(h)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">:</span>
          <Select
            value={value ? String(value.getMinutes()) : undefined}
            onValueChange={(m) => setTime(value?.getHours() ?? 12, Number(m))}
          >
            <SelectTrigger className="w-[72px]" aria-label="Minute">
              <SelectValue placeholder="MM" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {minutes.map((m) => (
                <SelectItem key={m} value={String(m)}>{pad(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
