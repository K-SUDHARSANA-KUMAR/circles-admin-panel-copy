export interface AttendanceLocation {
  type: string;
  coordinates: [number, number];
  address: string;
}

export interface AttendancePunch {
  type: "IN" | "OUT";
  punchTime: string;
  location: AttendanceLocation;
  attendanceImgOriginalFileName?: string;
  zingStatus: number;
}

export interface AttendanceRecord {
  _id: string;
  userId: string;
  attendanceDate: string;
  attendancePunches: AttendancePunch[];
  attendanceId: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface AttendanceResponse {
  data: AttendanceRecord[];
  status: number;
  errors: null;
}

export interface UseAttendanceParams {
  fromDate?: string;
  toDate?: string;
  nonPaginated?: string;
  warehouseId?: string | string[];
  divisionId?: string;
  channelId?: string;
  zoneId?: string;
  subZoneId?: string;
}