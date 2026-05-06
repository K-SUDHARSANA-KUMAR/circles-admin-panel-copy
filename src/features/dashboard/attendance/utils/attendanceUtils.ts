import { AttendanceRecord, AttendancePunch } from '../api/attendance';
import { format } from 'date-fns';

export type AttendanceStatus = 'Present' | 'Absent' | 'Punched In';

export const getAttendanceStatus = (
  attendanceRecords: AttendanceRecord[],
  date: Date
): AttendanceStatus => {
  const targetDate = format(date, 'yyyy-MM-dd');

  const dayAttendance = attendanceRecords.find((record) => {
    const recordDate = format(new Date(record.attendanceDate), 'yyyy-MM-dd');
    return recordDate === targetDate;
  });

  if (
    !dayAttendance ||
    !dayAttendance.attendancePunches ||
    dayAttendance.attendancePunches.length === 0
  ) {
    return 'Absent';
  }

  if (dayAttendance.attendancePunches.length === 2) {
    return 'Present';
  } else if (dayAttendance.attendancePunches.length === 1) {
    return 'Punched In';
  } else {
    return 'Absent';
  }
};

export const getAttendanceStatusColor = (status: AttendanceStatus): string => {
  switch (status) {
    case 'Present':
      return 'bg-green-300/20 text-green-500';
    case 'Punched In':
      return 'bg-yellow-300/20 text-yellow-500';
    case 'Absent':
      return 'bg-red-300/20 text-red-500';
    default:
      return 'bg-neutral-200/20 text-neutral-500';
  }
}; 