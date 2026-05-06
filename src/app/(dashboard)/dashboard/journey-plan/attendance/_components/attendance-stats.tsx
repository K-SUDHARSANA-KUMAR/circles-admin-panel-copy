import { AttendanceStatsProps } from '../_types/attendance.types';

const AttendanceStats = ({ stats, isLoading }: AttendanceStatsProps) => {
  if (isLoading) {
    return (
      <div className="mb-3 flex w-full items-center gap-2 font-semibold opacity-50">
        <div className="bg-background flex w-full justify-center rounded-md p-5">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 flex w-full items-center gap-2 font-semibold">
      <div className="bg-background flex w-full justify-center rounded-md p-5">
        Present: {stats.present}
      </div>
      <div className="bg-background flex w-full justify-center rounded-md p-5">
        Absent: {stats.absent}
      </div>
      <div className="bg-background flex w-full justify-center rounded-md p-5">
        Total Working Hours: {stats.totalWorkingHours}
      </div>
      <div className="bg-background flex w-full justify-center rounded-md p-5">
        Month: {stats.month}
      </div>
    </div>
  );
};

export default AttendanceStats;
