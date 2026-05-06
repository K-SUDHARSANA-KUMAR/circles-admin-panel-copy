import { useState } from 'react';
import { addMonths, format, subMonths } from 'date-fns';

export const useAttendanceCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), 'MM')
  );

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate =
        direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1);

      const today = new Date();
      if (newDate > today) {
        return prev;
      }

      setSelectedMonth(format(newDate, 'MM'));
      return newDate;
    });
  };

  const isNextMonthDisabled = () => {
    const nextMonth = addMonths(currentDate, 1);
    const today = new Date();
    return nextMonth > today;
  };

  const handleMonthChange = (monthValue: string) => {
    setSelectedMonth(monthValue);
    const currentYear = new Date().getFullYear();
    const newDate = new Date(currentYear, parseInt(monthValue) - 1, 1);
    setCurrentDate(newDate);
  };

  return {
    currentDate,
    selectedMonth,
    navigateMonth,
    isNextMonthDisabled,
    handleMonthChange,
  };
};
