'use client';

import * as React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const DateInput = React.forwardRef<HTMLButtonElement, DateInputProps>(
  ({ value, onChange, placeholder = 'Pick a date', className, disabled }, ref) => {
    const [open, setOpen] = React.useState(false);

    const parseDateFromValue = (dateString: string): Date | undefined => {
      if (!dateString) return undefined;
      
      try {
        if (dateString.includes('-') && dateString.length === 10) {
          const [day, month, year] = dateString.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          return isValid(date) ? date : undefined;
        }
        
        if (dateString.includes('T') || dateString.includes('Z')) {
          const date = parseISO(dateString);
          return isValid(date) ? date : undefined;
        }
        
        const date = new Date(dateString);
        return isValid(date) ? date : undefined;
      } catch (error) {
        console.error('Error parsing date:', error);
        return undefined;
      }
    };

    const formatDateToString = (date: Date): string => {
      return format(date, 'dd-MM-yyyy');
    };

    const selectedDate = parseDateFromValue(value || '');

    const handleDateSelect = (date: Date | undefined) => {
      if (date) {
        onChange(formatDateToString(date));
      } else {
        onChange('');
      }
      setOpen(false);
    };

    const displayValue = selectedDate ? format(selectedDate, 'dd-MM-yyyy') : '';

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            ref={ref}
            variant="white"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground',
              disabled && 'cursor-not-allowed opacity-50',
              className
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }
);

DateInput.displayName = 'DateInput';

export { DateInput };