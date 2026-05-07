import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format, isToday } from 'date-fns';
import { MoreVertical } from 'lucide-react';
import { getAttendanceStatusColor, AttendanceStatus } from '@/features/dashboard/attendance/utils/attendanceUtils';
import { CalendarDayProps } from '../_types/attendance.types';

const CalendarDay = ({
  day,
  isDayInCurrentMonth,
  isSunday,
  hasAttendanceData,
  attendanceStatus,
  onViewActivity,
}: CalendarDayProps) => {
  const handleViewActivity = () => {
    onViewActivity(day);
  };

  return (
    <div
      className={cn(
        'h-30 rounded-md border-2 border-neutral-200 p-2 transition-colors hover:bg-gray-50',
        isDayInCurrentMonth ? 'bg-card' : 'bg-neutral-100',
        isToday(day) && 'border-primary',
        isSunday && 'border-red-100 bg-red-200/10'
      )}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex justify-between">
          <span
            className={cn(
              'text-base font-semibold',
              isToday(day) && 'text-primary',
              isDayInCurrentMonth && !isToday(day) && 'text-foreground',
              !isDayInCurrentMonth && 'text-gray-400'
            )}
          >
            {format(day, 'd')}
          </span>

          {hasAttendanceData && isDayInCurrentMonth && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-6 w-6 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleViewActivity}
                >
                  <span>View Activity</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {attendanceStatus && isDayInCurrentMonth && day <= new Date() && (
          <div 
            className={cn(
              'rounded-md p-2 text-sm font-semibold',
              getAttendanceStatusColor(attendanceStatus as AttendanceStatus)
            )}
          >
            {attendanceStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarDay;
