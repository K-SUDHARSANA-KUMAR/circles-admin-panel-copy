import { cn } from '@/lib/utils';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  isToday,
} from 'date-fns';
import { DAYS_OF_WEEK } from '@/constants/commons';
import {
  getAttendanceStatus,
  getAttendanceStatusColor,
} from '@/features/dashboard/attendance/utils/attendanceUtils';
import { useAttendanceHelpers } from '../_hooks/useAttendanceHelpers';
import CalendarHeader from './calendar-header';
import CalendarDay from './calendar-day';
import { AttendanceCalendarProps } from '../_types/attendance.types';

const AttendanceCalendar = ({
  currentDate,
  attendanceData,
  isLoading,
  onNavigateMonth,
  onViewActivity,
  isNextMonthDisabled,
}: AttendanceCalendarProps) => {
  const { hasAttendanceData } = useAttendanceHelpers(attendanceData);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const isDayInCurrentMonth = (day: Date) => {
    return day >= monthStart && day <= monthEnd;
  };

  const isSunday = (day: Date) => {
    return day.getDay() === 0;
  };

  const getAttendanceStatusForDay = (day: Date) => {
    if (!attendanceData?.data?.data?.items || isLoading || !isDayInCurrentMonth(day)) {
      return undefined;
    }
    
    return getAttendanceStatus(attendanceData.data.data.items, day);
  };

  return (
    <div className="w-full rounded-lg bg-card p-6">
      <CalendarHeader
        onNavigateMonth={onNavigateMonth}
        isNextMonthDisabled={isNextMonthDisabled}
      />

      <div
        className={cn(
          'grid grid-cols-7 gap-2 transition-opacity duration-300',
          isLoading && 'opacity-50'
        )}
      >
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="bg-background flex h-12 items-center justify-center rounded-md font-medium"
          >
            {day}
          </div>
        ))}

        {calendarDays.map((day, index) => {
          const attendanceStatus = getAttendanceStatusForDay(day);
          
          return (
            <CalendarDay
              key={index}
              day={day}
              isDayInCurrentMonth={isDayInCurrentMonth(day)}
              isSunday={isSunday(day)}
              isToday={isToday(day)}
              hasAttendanceData={hasAttendanceData(day)}
              attendanceStatus={attendanceStatus}
              onViewActivity={onViewActivity}
            />
          );
        })}
      </div>
    </div>
  );
};

export default AttendanceCalendar;
