export interface AttendancePunch {
  punchTime: string;
  punchType?: string;
}

export interface AttendanceRecord {
  attendanceDate: string;
  attendancePunches: AttendancePunch[];
}

export interface AttendanceData {
  items: AttendanceRecord[];
}

export interface AttendanceApiResponse {
  data: AttendanceData;
}

export interface AttendanceStats {
  present: number;
  absent: number;
  totalWorkingHours: string;
  month: string;
}

export interface CalendarDayProps {
  day: Date;
  isDayInCurrentMonth: boolean;
  isSunday: boolean;
  isToday: boolean;
  hasAttendanceData: boolean;
  attendanceStatus?: string;
  onViewActivity: (day: Date) => void;
}

export interface AttendanceStatsProps {
  stats: AttendanceStats;
  isLoading: boolean;
}

export interface AttendanceCalendarProps {
  currentDate: Date;
  attendanceData: any;
  isLoading: boolean;
  onNavigateMonth: (direction: 'prev' | 'next') => void;
  onViewActivity: (day: Date) => void;
  isNextMonthDisabled: boolean;
}
