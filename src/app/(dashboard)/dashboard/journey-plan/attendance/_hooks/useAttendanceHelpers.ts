import { format } from 'date-fns';

export const useAttendanceHelpers = (attendanceData: any) => {
  const hasAttendanceData = (day: Date) => {
    if (!attendanceData?.data?.data?.items) return false;
    
    const targetDate = format(day, 'yyyy-MM-dd');
    const dayAttendance = attendanceData.data.data.items.find((record: any) => {
      const recordDate = format(new Date(record.attendanceDate), 'yyyy-MM-dd');
      return recordDate === targetDate;
    });
    
    return (
      dayAttendance &&
      dayAttendance.attendancePunches &&
      dayAttendance.attendancePunches.length > 0
    );
  };

  const getAttendanceDataForDay = (day: Date) => {
    if (!attendanceData?.data?.data?.items) return null;
    
    const targetDate = format(day, 'yyyy-MM-dd');
    return attendanceData.data.data.items.find((record: any) => {
      const recordDate = format(new Date(record.attendanceDate), 'yyyy-MM-dd');
      return recordDate === targetDate;
    });
  };

  return {
    hasAttendanceData,
    getAttendanceDataForDay,
  };
};
