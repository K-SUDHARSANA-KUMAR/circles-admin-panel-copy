import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { AttendanceStats } from '../_types/attendance.types';

export const useAttendanceStats = (
  attendanceData: any,
  currentDate: Date
): AttendanceStats => {
  return useMemo(() => {
    if (!attendanceData?.data?.data?.items || !Array.isArray(attendanceData.data.data.items)) {
      return {
        present: 0,
        absent: 0,
        totalWorkingHours: '0h 0m',
        month: format(currentDate, 'MMMM yyyy'),
      };
    }

    // Calculate present days
    const presentDays = attendanceData.data.data.items.filter(
      (record: any) =>
        record.attendancePunches && record.attendancePunches.length === 2
    ).length;

    // Calculate absent days
    const today = new Date();
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const lastDayToCount = monthEnd > today ? today : monthEnd;

    const totalDaysInRange =
      Math.floor(
        (lastDayToCount.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    const absentDays = totalDaysInRange - presentDays;

    // Calculate total working hours
    let totalMinutes = 0;

    attendanceData.data.data.items.forEach((record: any) => {
      if (record.attendancePunches && record.attendancePunches.length >= 2) {
        const sortedPunches = [...record.attendancePunches].sort(
          (a, b) =>
            new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime()
        );

        const inTime = new Date(sortedPunches[0].punchTime);
        const outTime = new Date(
          sortedPunches[sortedPunches.length - 1].punchTime
        );

        const diffInMs = outTime.getTime() - inTime.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

        if (diffInMinutes > 0) {
          totalMinutes += diffInMinutes;
        }
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      present: presentDays,
      absent: absentDays,
      totalWorkingHours: `${hours}h ${minutes}m`,
      month: format(currentDate, 'MMMM yyyy'),
    };
  }, [attendanceData, currentDate]);
};
