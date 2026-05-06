import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarHeaderProps {
  onNavigateMonth: (direction: 'prev' | 'next') => void;
  isNextMonthDisabled: boolean;
}

const CalendarHeader = ({ onNavigateMonth, isNextMonthDisabled }: CalendarHeaderProps) => {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-xl font-medium">Attendance Calendar</h2>
      <div className="flex items-center gap-2">
        <Button
          variant="tertiary"
          size="icon"
          onClick={() => onNavigateMonth('prev')}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="tertiary"
          size="icon"
          onClick={() => onNavigateMonth('next')}
          disabled={isNextMonthDisabled}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default CalendarHeader;
