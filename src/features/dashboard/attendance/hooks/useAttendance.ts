import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  attendanceApi,
} from '../api/attendance';
import { AttendanceResponse, UseAttendanceParams } from '../types/attendance.types';

// Helper: extract readable API error message
const getApiErrorMessage = (error: any, fallback: string) => {
  if (error?.response?.data?.message) return error.response.data.message as string;
  if (error?.response?.data?.error) return error.response.data.error as string;
  if (error?.message) return error.message as string;
  return fallback;
};

export const useAttendance = (
  userId: string,
  params?: UseAttendanceParams
) => {
  const attendanceData = useQuery<AttendanceResponse>({
    queryKey: ['attendance', userId, params],
    queryFn: async () => {
      try {
        return await attendanceApi.getAttendanceByDate(userId, params);
      } catch (error: any) {
        toast.error(getApiErrorMessage(error, 'Failed to load attendance data'));
        throw error;
      }
    },
    enabled: !!userId,
  });

  return {
    attendanceData,
  };
}; 