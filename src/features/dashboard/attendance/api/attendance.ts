import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';
import { AttendanceResponse, UseAttendanceParams } from '../types/attendance.types';

const { ATTENDANCE_ENDPOINT } = apiEndPoint;

export const attendanceApi = {
  getAttendanceByDate: async (
    userId: string,
    params?: UseAttendanceParams
  ): Promise<AttendanceResponse> => {
    const response = await customAxios.get(
      `${ATTENDANCE_ENDPOINT}/attendance/attendanceBydate/${userId}/data`,
      { params }
    );
    return response.data;
  },
};
