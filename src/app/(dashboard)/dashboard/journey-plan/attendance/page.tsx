'use client';

import PjpTab from '@/components/tabs/pjp/pjp-tabs';
import {
  LocationFilters,
  LocationFilters as LocationFiltersType,
} from '@/components/shared/location-filters';
import { format, endOfMonth, startOfMonth } from 'date-fns';
import { useState, useEffect } from 'react';
import AttendanceDetailsModal from './_components/attendance-details-modal';
import { useAttendance } from '@/features/dashboard/attendance/hooks/useAttendance';
import { RequirePermission } from '@/components/auth/require-permission';
import PageHeader from '@/components/shared/page-header';
import { PERMISSIONS } from '@/constants/permissions.constant';

// Local imports
import { useAttendanceCalendar } from './_hooks/useAttendanceCalendar';
import { useAttendanceStats } from './_hooks/useAttendanceStats';
import { useAttendanceHelpers } from './_hooks/useAttendanceHelpers';
import AttendanceCalendar from './_components/attendance-calendar';
import AttendanceStats from './_components/attendance-stats';

const JourneyPlanPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.ATTENDANCE}>
      <AttendanceContent />
    </RequirePermission>
  );
};

const AttendanceContent = () => {
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<any>(null);
  const [locationFilters, setLocationFilters] = useState<LocationFiltersType>(
    {}
  );

  // Custom hooks
  const { currentDate, navigateMonth, isNextMonthDisabled } = useAttendanceCalendar();
  
  // Reset attendance data when location filters change
  useEffect(() => {
    // This will trigger a re-fetch when location filters change
  }, [
    locationFilters.warehouseIds,
    locationFilters.salesPersonId,
    locationFilters.divisionId,
    locationFilters.channelId,
    locationFilters.zoneId,
    locationFilters.subZoneId,
  ]);

  const shouldFetchAttendance =
    locationFilters.warehouseIds &&
    locationFilters.warehouseIds.length > 0 &&
    locationFilters.salesPersonId;

  const { attendanceData } = useAttendance(
    shouldFetchAttendance ? locationFilters.salesPersonId! : '',
    shouldFetchAttendance
      ? {
          fromDate: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
          toDate: format(endOfMonth(currentDate), 'yyyy-MM-dd'),
          nonPaginated: 'true',
          warehouseId: locationFilters.warehouseIds,
          divisionId:
            locationFilters.divisionId && locationFilters.divisionId.length > 0
              ? JSON.stringify(locationFilters.divisionId)
              : undefined,
          channelId:
            locationFilters.channelId && locationFilters.channelId.length > 0
              ? JSON.stringify(locationFilters.channelId)
              : undefined,
          zoneId:
            locationFilters.zoneId && locationFilters.zoneId.length > 0
              ? JSON.stringify(locationFilters.zoneId)
              : undefined,
          subZoneId:
            locationFilters.subZoneId && locationFilters.subZoneId.length > 0
              ? JSON.stringify(locationFilters.subZoneId)
              : undefined,
        }
      : undefined
  );

  const isAttendanceLoading = attendanceData.isLoading;
  const { getAttendanceDataForDay } = useAttendanceHelpers(attendanceData);
  const attendanceStats = useAttendanceStats(attendanceData, currentDate);

  const handleAttendanceDetailsClick = (day: Date) => {
    const dayData = getAttendanceDataForDay(day);
    setSelectedDayData({ ...dayData, selectedDate: day });
    setIsAttendanceModalOpen(true);
  };

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Permanent Journey Plan" />

      <div className="w-full space-y-3 rounded-lg bg-white p-4">
        <PjpTab />

        <LocationFilters
          filters={locationFilters}
          onFiltersChange={setLocationFilters}
          showDivision={false}
          showChannel={false}
          showZone={false}
          showSubZone={false}
          showWarehouse={true}
          showSalesPerson={true}
          className="w-full"
        />
      </div>

      <AttendanceStats stats={attendanceStats} isLoading={isAttendanceLoading} />

      <AttendanceCalendar
        currentDate={currentDate}
        attendanceData={attendanceData}
        isLoading={isAttendanceLoading}
        onNavigateMonth={navigateMonth}
        onViewActivity={handleAttendanceDetailsClick}
        isNextMonthDisabled={isNextMonthDisabled()}
      />

      <AttendanceDetailsModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        selectedDate={selectedDayData?.selectedDate || null}
        attendancePunches={selectedDayData?.attendancePunches || []}
      />
    </section>
  );
};

export default JourneyPlanPage;
