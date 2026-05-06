import { useState, useMemo, useCallback, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { eachDayOfInterval, format, isValid, addDays, differenceInCalendarDays } from 'date-fns';
import { ExtendedOutletVisitRecord, ApplicableToData } from '../_types';

export const useOutletVisitRecords = (
  dateRange: DateRange | undefined,
  isEditMode: boolean,
  existingPlanData: any,
  isDataLoaded: boolean,
  selectedWarehouseId: string,
  setSelectedWarehouseId: (id: string) => void,
  pjpTypeCode?: string
) => {
  const [outletVisitRecords, setOutletVisitRecords] = useState<ExtendedOutletVisitRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEditingRecord, setCurrentEditingRecord] = useState<ExtendedOutletVisitRecord | null>(null);

  // Calculate max days based on PJP type code
  // Note: This function expects the code (like 'weekly'), not the ID
  const getMaxDays = useCallback((typeCode: string) => {
    if (!typeCode) return 31;
    
    const normalizedCode = typeCode.toLowerCase();
    switch (normalizedCode) {
      case 'weekly':
        return 7;
      case 'bi-monthly':
        return 15;
      case 'monthly':
        return 31;
      default:
        return 31;
    }
  }, []);

  // Check if we can add more days
  const effectiveMaxDays = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return differenceInCalendarDays(dateRange.to, dateRange.from) + 1;
    }
    if (!pjpTypeCode) {
      return 0;
    }
    return getMaxDays(pjpTypeCode);
  }, [dateRange?.from, dateRange?.to, getMaxDays, pjpTypeCode]);

  const canAddMoreDays = useMemo(() => {
    if (!pjpTypeCode || !dateRange?.from || !dateRange?.to) return false;
    return outletVisitRecords.length < effectiveMaxDays;
  }, [pjpTypeCode, outletVisitRecords.length, effectiveMaxDays, dateRange?.from, dateRange?.to]);

  // Add a new day
  const handleAddDay = useCallback(() => {
    if (!canAddMoreDays || !dateRange?.from) return;

    // Find the last date in the current records
    const lastRecord = outletVisitRecords[outletVisitRecords.length - 1];
    let nextDate: Date;

    if (lastRecord) {
      nextDate = addDays(new Date(lastRecord.date), 1);
    } else {
      nextDate = new Date(dateRange.from);
    }

    if (!dateRange.to || nextDate > dateRange.to) {
      return;
    }

    const newRecord: ExtendedOutletVisitRecord = {
      id: `date-${format(nextDate, 'yyyy-MM-dd')}-${Date.now()}`,
      date: format(nextDate, 'yyyy-MM-dd'),
      formattedDate: format(nextDate, 'MMM dd, yyyy'),
      numberOfOutlets: 0,
      selectedOutlets: [],
    };

    setOutletVisitRecords((prev) => [...prev, newRecord]);
  }, [canAddMoreDays, dateRange?.from, outletVisitRecords]);

  const excludedOutletIds = useMemo(() => {
    const excluded = new Set<string>();
    outletVisitRecords.forEach((record) => {
      if (!currentEditingRecord || record.id !== currentEditingRecord.id) {
        record.selectedOutlets?.forEach((o) => excluded.add(o.outletId));
      }
    });
    return Array.from(excluded);
  }, [outletVisitRecords, currentEditingRecord]);

  useEffect(() => {
    if (
      dateRange?.from &&
      dateRange?.to &&
      isValid(dateRange.from) &&
      isValid(dateRange.to) &&
      dateRange.from <= dateRange.to
    ) {
      if (isEditMode && existingPlanData && isDataLoaded) {
        // In edit mode, only show days that actually exist in the data initially
        const records: ExtendedOutletVisitRecord[] = existingPlanData.journeyPlan.map(
          (existingDay: any, index: number) => {
            const visitDate = new Date(existingDay.visitDate);
            const dateString = format(visitDate, 'yyyy-MM-dd');

            return {
              id: `date-${dateString}-${index}`,
              date: dateString,
              formattedDate: format(visitDate, 'MMM dd, yyyy'),
              numberOfOutlets: existingDay?.outlets?.length || 0,
              selectedOutlets:
                existingDay?.outlets?.map((outlet: any, outletIndex: number) => ({
                  outletId: outlet.outletId,
                  outletName: outlet.outletName,
                  location: outlet.location,
                  warehouseId: outlet.warehouseId || existingPlanData.warehouseId,
                  index: outlet.index ?? outletIndex,
                })) || [],
              applicableTo: existingDay?.applicableTo,
              pjpVisitTypeId: existingDay?.assignedTo?.[0]?.pjpVisitTypeIds?.[0]?.pjpVisitTypeId,
              assignedActivityBeatIds: existingDay?.assignedTo?.[0]?.beatIds || [],
            };
          }
        );
        setOutletVisitRecords(records);
      } else {
        // In create mode, show all days in the date range
        const dateRangeInterval = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
        const records: ExtendedOutletVisitRecord[] = dateRangeInterval.map(
          (date, index) => ({
            id: `date-${format(date, 'yyyy-MM-dd')}-${index}`,
            date: format(date, 'yyyy-MM-dd'),
            formattedDate: format(date, 'MMM dd, yyyy'),
            numberOfOutlets: 0,
            selectedOutlets: [],
          })
        );
        setOutletVisitRecords(records);
      }
    } else {
      setOutletVisitRecords([]);
    }
  }, [dateRange, isEditMode, existingPlanData, isDataLoaded]);

  const handleDeleteRecord = useCallback((recordToDelete: ExtendedOutletVisitRecord) => {
    setOutletVisitRecords((prev) =>
      prev.filter((record) => record.id !== recordToDelete.id)
    );
  }, []);

  const handleViewRecord = useCallback((record: ExtendedOutletVisitRecord) => {
    setCurrentEditingRecord(record);
    setIsModalOpen(true);
  }, []);

  const handleOutletsSelect = useCallback((
    outlets: {
      outletId: string;
      outletName: string;
      location?: {
        type: string;
        coordinates: [number, number];
      };
      warehouseId?: string;
    }[]
  ) => {
    if (currentEditingRecord) {
      // Add index to each outlet
      const outletsWithIndex = outlets.map((outlet, index) => ({
        ...outlet,
        index,
      }));

      setOutletVisitRecords((prev) =>
        prev.map((record) =>
          record.id === currentEditingRecord.id
            ? {
                ...record,
                numberOfOutlets: outletsWithIndex.length,
                selectedOutlets: outletsWithIndex,
              }
            : record
        )
      );

      // Only update warehouse ID if not already set to prevent form resets
      if (outletsWithIndex.length > 0 && outletsWithIndex[0].warehouseId && !selectedWarehouseId) {
        setSelectedWarehouseId(outletsWithIndex[0].warehouseId);
      }
    }
    setIsModalOpen(false);
    setCurrentEditingRecord(null);
  }, [currentEditingRecord, selectedWarehouseId, setSelectedWarehouseId]);

  const handleAssignAreasToRecord = useCallback((
    recordId: string,
    applicableTo: ApplicableToData
  ) => {
    setOutletVisitRecords((prev) =>
      prev.map((record) =>
        record.id === recordId
          ? {
              ...record,
              applicableTo,
            }
          : record
      )
    );
  }, []);

  const handleAssignActivityToRecord = useCallback((
    recordId: string,
    data: { pjpVisitTypeId: string; beatIds: string[] }
  ) => {
    setOutletVisitRecords((prev) =>
      prev.map((record) =>
        record.id === recordId
          ? {
              ...record,
              pjpVisitTypeId: data.pjpVisitTypeId,
              assignedActivityBeatIds: data.beatIds,
            }
          : record
      )
    );
  }, []);

  return {
    outletVisitRecords,
    isModalOpen,
    setIsModalOpen,
    currentEditingRecord,
    excludedOutletIds,
    handleDeleteRecord,
    handleViewRecord,
    handleOutletsSelect,
    handleAssignAreasToRecord,
    handleAssignActivityToRecord,
    handleAddDay,
    canAddMoreDays,
    maxDays: effectiveMaxDays || (pjpTypeCode ? getMaxDays(pjpTypeCode) : 0),
  };
};
