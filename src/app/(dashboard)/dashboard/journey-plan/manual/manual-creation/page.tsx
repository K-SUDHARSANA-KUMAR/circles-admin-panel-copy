'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { OutletMultiSelectorModal } from '@/components/modals/pjp/outlet-multi-selector-modal';
import GenericPageLoading from '@/components/shared/generic-page-loading';
import { Button } from '@/components/ui/button';
import { DateRange } from 'react-day-picker';
import { Plus } from 'lucide-react';
import {
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfToday,
  startOfWeek,
  differenceInDays,
} from 'date-fns';

import { getBreadcrumbData } from '@/constants/breadcrumb-config';
import { usePjp } from '@/features/dashboard/pjp/hooks/usePjp';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import { useAppSelector } from '@/store/hooks';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';
import { usersApi } from '@/features/user-managment/users/api/users';
import { useQuery } from '@tanstack/react-query';

// Import refactored components and hooks
import { LocationHierarchyForm } from './_components/location-hierarchy-form';
import { PjpConfigForm } from './_components/pjp-config-form';
import { OutletVisitTable } from './_components/outlet-visit-table';
import { ActionButtons } from './_components/action-buttons';
import { AssignAreasModal } from './_components/assign-areas-modal';
import { AssignActivityModal } from './_components/assign-activity-modal';
import { ReportingManagerModal } from '@/components/modals/reporting-manager-modal';
import { ApplicableToData, ExtendedOutletVisitRecord } from './_types';
import { useFormState } from './_hooks/useFormState';
import { useOutletVisitRecords } from './_hooks/useOutletVisitRecords';
import { useManualPjpLogic } from './_hooks/useManualPjpLogic';
import { PlanViewModal } from '@/app/(dashboard)/dashboard/journey-plan/deviations/deviations-manage/_components/plan-view-modal';
import type { Outlet } from '@/features/dashboard/outlets/types/outlet.types';

const PlaceOrdersPage = () => {
  return (
    <RequirePermission
      module={PERMISSIONS.MANUAL_PJP}
      action={MENU_RIGHTS.CREATE}
    >
      <ManualCreationContent />
    </RequirePermission>
  );
};

const ManualCreationContent = () => {
  // Configuration: Days before next cycle to allow selection
  // Change this value to adjust when users can select the next cycle
  // Example: 2 = can select next cycle 2 days before it starts
  //          3 = can select next cycle 3 days before it starts
  const DAYS_BEFORE_NEXT_CYCLE = 3;

  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('mode') === 'edit';
  const routePlanId = searchParams.get('routePlanId');
  const breadcrumb = getBreadcrumbData(
    'manualPjp',
    isEditMode ? 'edit' : 'create'
  );

  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.userId;
  const { getManualRoutePlanById } = usePjp();
  
  // Fetch master records for PJP type
  const { records: pjpTypeRecords } = useMasterRecords(
    'pjpPlanType',
    undefined,
    1,
    1000,
    true
  );

  const { data: existingData, isLoading: isLoadingExistingData } =
    getManualRoutePlanById(routePlanId || '');
  const existingPlanData = existingData?.data;

  // Check if current user is the creator of the plan
  const isReadOnly = useMemo(() => {
    if (!isEditMode || !existingPlanData || !userId) {
      return false;
    }
    // Check multiple possible field names for creator ID
    const createdByUserId = 
      existingPlanData.createdByUserId || 
      existingPlanData.createdBy?.userId ||
      existingPlanData.createdBy?.user?.userId ||
      existingPlanData.createdByUser?.userId ||
      existingPlanData.createdByUser;
    
    // If createdByUserId exists and doesn't match current user, it's read-only
    if (createdByUserId && createdByUserId !== userId) {
      return true;
    }
    
    // Also check if userId in plan doesn't match (plan might be assigned to different user)
    // But only if there's no explicit createdBy field
    if (!createdByUserId && existingPlanData.userId && existingPlanData.userId !== userId) {
      // This might be an approver viewing someone else's plan
      return true;
    }
    
    return false;
  }, [isEditMode, existingPlanData, userId]);

  const [pjpType, setPjpType] = useState<string>('');
  const [pjpTypeCode, setPjpTypeCode] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isPlanTypeAutoSet, setIsPlanTypeAutoSet] = useState<boolean>(false);

  const computeVisitPeriodRange = useCallback((type: string, startDate: Date): DateRange => {
    const today = startOfToday();
    const normalizedStart = startOfDay(startDate);

    const normalizeRange = (from: Date, to: Date) => {
      const normalizedFrom = startOfDay(from);
      const normalizedTo = startOfDay(to);
      return { from: normalizedFrom, to: normalizedTo };
    };

    switch (type) {
      case 'weekly': {
        const selectedWeekStart = startOfWeek(normalizedStart, { weekStartsOn: 0 });
        const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
        const anchorDate =
          normalizedStart > today && selectedWeekStart.getTime() === currentWeekStart.getTime()
            ? today
            : normalizedStart;

        if (anchorDate <= today) {
          const rangeEnd = endOfWeek(anchorDate, { weekStartsOn: 0 });
          return normalizeRange(anchorDate, rangeEnd);
        }

        let rangeStart = startOfWeek(anchorDate, { weekStartsOn: 0 });

        if (rangeStart < today) {
          rangeStart = startOfWeek(today, { weekStartsOn: 0 });
          if (rangeStart < today) {
            rangeStart = addWeeks(rangeStart, 1);
          }
        }

        const rangeEnd = endOfWeek(rangeStart, { weekStartsOn: 0 });
        return normalizeRange(rangeStart, rangeEnd);
      }
      case 'bi-monthly': {
        const isSameMonth = normalizedStart.getFullYear() === today.getFullYear() &&
          normalizedStart.getMonth() === today.getMonth();
        const inSameHalf =
          (normalizedStart.getDate() <= 15 && today.getDate() <= 15) ||
          (normalizedStart.getDate() > 15 && today.getDate() > 15);
        const anchorDate =
          normalizedStart > today && isSameMonth && inSameHalf ? today : normalizedStart;

        if (anchorDate <= today) {
          const isFirstHalf = anchorDate.getDate() <= 15;
          const rangeEnd = isFirstHalf
            ? new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 15)
            : endOfMonth(anchorDate);

          return normalizeRange(anchorDate, rangeEnd);
        }

        const resolveHalfStart = (reference: Date) => {
          return reference.getDate() <= 15
            ? new Date(reference.getFullYear(), reference.getMonth(), 1)
            : new Date(reference.getFullYear(), reference.getMonth(), 16);
        };

        let rangeStart = startOfDay(resolveHalfStart(anchorDate));

        while (rangeStart < today) {
          if (rangeStart.getDate() === 1) {
            const secondHalfStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 16);
            if (secondHalfStart >= today) {
              rangeStart = startOfDay(secondHalfStart);
              break;
            }
            rangeStart = startOfMonth(addMonths(rangeStart, 1));
          } else {
            rangeStart = startOfMonth(addMonths(rangeStart, 1));
          }
        }

        const rangeEnd =
          rangeStart.getDate() === 1
            ? new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 15)
            : endOfMonth(rangeStart);

        return normalizeRange(rangeStart, rangeEnd);
      }
      case 'monthly': {
        const isSameMonth = normalizedStart.getFullYear() === today.getFullYear() &&
          normalizedStart.getMonth() === today.getMonth();
        const anchorDate = normalizedStart > today && isSameMonth ? today : normalizedStart;

        if (anchorDate <= today) {
          const rangeEnd = endOfMonth(anchorDate);
          return normalizeRange(anchorDate, rangeEnd);
        }

        let rangeStart = startOfMonth(anchorDate);
        while (rangeStart < today) {
          rangeStart = startOfMonth(addMonths(rangeStart, 1));
        }
        const rangeEnd = endOfMonth(rangeStart);
        return normalizeRange(rangeStart, rangeEnd);
      }
      default: {
        return normalizeRange(normalizedStart, normalizedStart);
      }
    }
  }, []);

  // Handle PJP type change: auto-generate a default range while still allowing manual overrides
  const handlePjpTypeChange = (newPjpTypeId: string) => {
    setPjpType(newPjpTypeId);

    if (!newPjpTypeId) {
      setDateRange(undefined);
      setPjpTypeCode('');
      return;
    }

    // Find the code from master records
    const masterRecords: any[] = Array.isArray(pjpTypeRecords?.data) 
      ? (pjpTypeRecords.data as any[])
      : [];
    
    const selectedRecord = masterRecords.find((record: any) => {
      const recordId = record.pjpPlanTypeId || record._id || record.id;
      return String(recordId) === String(newPjpTypeId);
    });
    
    const code = selectedRecord ? (
      selectedRecord.pjpPlanTypeCode ||
      selectedRecord.code ||
      selectedRecord.pjpPlanTypeName ||
      selectedRecord.name ||
      ''
    ).toLowerCase() : '';

    setPjpTypeCode(code);

    if (!code) {
      setDateRange(undefined);
      return;
    }

    const today = startOfToday();
    const baseStart = today;

    const validatedRange = computeVisitPeriodRange(code, baseStart);
    setDateRange(validatedRange);
  };
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [isApprovedRecord, setIsApprovedRecord] = useState<boolean>(false);
  const [isAssignAreasModalOpen, setIsAssignAreasModalOpen] = useState(false);
  const [currentAssignAreasRecord, setCurrentAssignAreasRecord] =
    useState<ExtendedOutletVisitRecord | null>(null);
  const [isAssignActivityModalOpen, setIsAssignActivityModalOpen] = useState(false);
  const [currentAssignActivityRecord, setCurrentAssignActivityRecord] =
    useState<ExtendedOutletVisitRecord | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [isPlanViewModalOpen, setIsPlanViewModalOpen] = useState(false);
  const [currentPlanViewRecord, setCurrentPlanViewRecord] =
    useState<ExtendedOutletVisitRecord | null>(null);

  // Check if plan can be changed (must be at least X days before plan start)
  // Applies to both create and edit modes
  const canChangePlan = useMemo(() => {
    if (!dateRange?.from) {
      return true; // Allow changes if no date range is selected yet
    }

    const today = startOfToday();
    const planStartDate = startOfDay(dateRange.from);
    const daysUntilPlanStart = differenceInDays(planStartDate, today);

    // Allow changes only if plan start is more than X days away
    return daysUntilPlanStart > DAYS_BEFORE_NEXT_CYCLE;
  }, [dateRange?.from, DAYS_BEFORE_NEXT_CYCLE]);

  // Custom disabled dates logic for cycle-based restrictions
  const getCustomDisabledDates = useCallback((date: Date): boolean => {
    if (!pjpTypeCode) {
      return false;
    }

    const today = startOfToday();
    const checkDate = startOfDay(date);

    // Always disable past dates
    if (checkDate < today) {
      return true;
    }

    switch (pjpTypeCode) {
      case 'weekly': {
        // Current week: Sunday to Saturday
        const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
        const currentWeekEnd = endOfWeek(today, { weekStartsOn: 0 });
        
        // Next week
        const nextWeekStart = addWeeks(currentWeekStart, 1);
        const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 0 });
        
        // Days until next week starts
        const daysUntilNextWeek = differenceInDays(nextWeekStart, today);
        
        // Allow current week (from today to end of week)
        if (checkDate >= today && checkDate <= currentWeekEnd) {
          return false;
        }
        
        // Allow next week if within X days of next week start
        if (daysUntilNextWeek <= DAYS_BEFORE_NEXT_CYCLE && checkDate >= nextWeekStart && checkDate <= nextWeekEnd) {
          return false;
        }
        
        // Disable all other dates
        return true;
      }
      
      case 'bi-monthly': {
        // Determine current half
        const currentDay = today.getDate();
        const isFirstHalf = currentDay <= 15;
        
        // Current half dates
        const currentHalfStart = isFirstHalf 
          ? new Date(today.getFullYear(), today.getMonth(), 1)
          : new Date(today.getFullYear(), today.getMonth(), 16);
        const currentHalfEnd = isFirstHalf
          ? new Date(today.getFullYear(), today.getMonth(), 15)
          : endOfMonth(today);
        
        // Next half dates
        let nextHalfStart: Date;
        let nextHalfEnd: Date;
        if (isFirstHalf) {
          nextHalfStart = new Date(today.getFullYear(), today.getMonth(), 16);
          nextHalfEnd = endOfMonth(today);
        } else {
          nextHalfStart = startOfMonth(addMonths(today, 1));
          nextHalfEnd = new Date(today.getFullYear(), today.getMonth() + 1, 15);
        }
        
        // Days until next half starts
        const daysUntilNextHalf = differenceInDays(nextHalfStart, today);
        
        // Allow current half (from today to end of half)
        if (checkDate >= today && checkDate <= currentHalfEnd) {
          return false;
        }
        
        // Allow next half if within X days of next half start
        if (daysUntilNextHalf <= DAYS_BEFORE_NEXT_CYCLE && checkDate >= nextHalfStart && checkDate <= nextHalfEnd) {
          return false;
        }
        
        // Disable all other dates
        return true;
      }
      
      case 'monthly': {
        // Current month
        const currentMonthStart = startOfMonth(today);
        const currentMonthEnd = endOfMonth(today);
        
        // Next month
        const nextMonthStart = startOfMonth(addMonths(today, 1));
        const nextMonthEnd = endOfMonth(nextMonthStart);
        
        // Days until next month starts
        const daysUntilNextMonth = differenceInDays(nextMonthStart, today);
        
        // Allow current month (from today to end of month)
        if (checkDate >= today && checkDate <= currentMonthEnd) {
          return false;
        }
        
        // Allow next month if within X days of next month start
        if (daysUntilNextMonth <= DAYS_BEFORE_NEXT_CYCLE && checkDate >= nextMonthStart && checkDate <= nextMonthEnd) {
          return false;
        }
        
        // Disable all other dates
        return true;
      }
      
      default:
        // For unknown types, just disable past dates
        return checkDate < today;
    }
  }, [pjpTypeCode, DAYS_BEFORE_NEXT_CYCLE]);

  const {
    formState,
    handleDivisionChange,
    handleChannelChange,
    handleZoneChange,
    handleSubZoneChange,
    handleUserChange,
    setFormState,
  } = useFormState(isEditMode);

  const {
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
    maxDays,
  } = useOutletVisitRecords(
    dateRange,
    isEditMode,
    existingPlanData,
    isDataLoaded,
    selectedWarehouseId,
    setSelectedWarehouseId,
    pjpTypeCode
  );

  const { handleCancel, handleCreateOrUpdate, isLoading } = useManualPjpLogic(
    isEditMode,
    routePlanId,
    selectedWarehouseId,
    userId,
    isApprovedRecord
  );

  const getValidatedRangeForType = useCallback(
    (startDate: Date) => {
      if (!pjpTypeCode) {
        return undefined;
      }
      return computeVisitPeriodRange(pjpTypeCode, startDate);
    },
    [computeVisitPeriodRange, pjpTypeCode]
  );

  // Map PJP type ID to code for date range calculations
  useEffect(() => {
    if (!pjpType || !pjpTypeRecords?.data) {
      setPjpTypeCode('');
      return;
    }
    
    const masterRecords: any[] = Array.isArray(pjpTypeRecords.data) 
      ? (pjpTypeRecords.data as any[])
      : [];
    
    const selectedRecord = masterRecords.find((record: any) => {
      const recordId = record.pjpPlanTypeId || record._id || record.id;
      return String(recordId) === String(pjpType);
    });
    
    if (selectedRecord) {
      const code = (
        selectedRecord.pjpPlanTypeCode ||
        selectedRecord.code ||
        selectedRecord.pjpPlanTypeName ||
        selectedRecord.name ||
        ''
      ).toLowerCase();
      setPjpTypeCode(code);
    } else {
      setPjpTypeCode('');
    }
  }, [pjpType, pjpTypeRecords?.data]);

  const resolvedSalesPersonName = useMemo(() => {
    if (!existingPlanData) {
      return '';
    }

    return (
      existingPlanData.userName ||
      existingPlanData.user?.name ||
      existingPlanData.user?.fullName ||
      existingPlanData.user?.userName ||
      existingPlanData.createdBy?.name ||
      existingPlanData.createdBy?.user?.name ||
      ''
    );
  }, [existingPlanData]);

  useEffect(() => {
    if (isEditMode || !userId) {
      return;
    }

    setFormState((previous) => {
      if (previous.selectedUser === userId) {
        return previous;
      }
      return {
        ...previous,
        selectedUser: userId,
      };
    });

    if (user?.name) {
      setSelectedUserName((previous) => {
        if (previous === user.name) {
          return previous;
        }
        return user.name;
      });
    }
  }, [isEditMode, userId, user?.name, setFormState]);

  useEffect(() => {
    if (isEditMode && existingPlanData && !isDataLoaded) {
      // Set PJP type - could be ID or code from existing data
      const existingPlanType = existingPlanData.planType;
      
      // If it's a code (string like 'weekly'), find the ID
      // If it's already an ID, use it directly
      if (existingPlanType) {
        const masterRecords: any[] = Array.isArray(pjpTypeRecords?.data) 
          ? (pjpTypeRecords.data as any[])
          : [];
        
        // Check if it's an ID or code
        const foundById = masterRecords.find((record: any) => {
          const recordId = record.pjpPlanTypeId || record._id || record.id;
          return String(recordId) === String(existingPlanType);
        });
        
        if (foundById) {
          // It's an ID, extract code
          const code = (
            foundById.pjpPlanTypeCode ||
            foundById.code ||
            foundById.pjpPlanTypeName ||
            foundById.name ||
            ''
          ).toLowerCase();
          setPjpType(existingPlanType);
          setPjpTypeCode(code);
        } else {
          // It's a code, find the ID
          const foundByCode = masterRecords.find((record: any) => {
            const code = (
              record.pjpPlanTypeCode ||
              record.code ||
              record.pjpPlanTypeName ||
              record.name ||
              ''
            ).toLowerCase();
            return code === existingPlanType.toLowerCase();
          });
          
          if (foundByCode) {
            const recordId = foundByCode.pjpPlanTypeId || foundByCode._id || foundByCode.id;
            setPjpType(String(recordId));
            setPjpTypeCode(existingPlanType.toLowerCase());
          } else {
            // Fallback: treat as code if not found
            setPjpType(existingPlanType);
            setPjpTypeCode(existingPlanType.toLowerCase());
          }
        }
      }

      const initialFrom = new Date(existingPlanData.visitPeriod.from);
      initialFrom.setHours(0, 0, 0, 0);
      const initialTo = new Date(existingPlanData.visitPeriod.to);
      initialTo.setHours(0, 0, 0, 0);

      // Use the code for date range calculation
      const codeForCalculation = pjpTypeCode || existingPlanType?.toLowerCase() || '';
      const validatedRange = codeForCalculation 
        ? computeVisitPeriodRange(codeForCalculation, initialFrom)
        : { from: initialFrom, to: initialTo };
      
      const safeValidatedTo = validatedRange.to ?? validatedRange.from ?? initialFrom;
      const finalRange: DateRange = {
        from: initialFrom,
        to: initialTo > safeValidatedTo ? safeValidatedTo : initialTo,
      };

      setDateRange(finalRange);

      if (existingPlanData.warehouseId) {
        setSelectedWarehouseId(existingPlanData.warehouseId);
      }

      // Check if the record is approved
      const isApproved = existingPlanData.status === 'approved';
      setIsApprovedRecord(isApproved);

      setFormState((prev) => ({
        ...prev,
        selectedUser: existingPlanData.userId || '',
        editModeUserName: resolvedSalesPersonName,
      }));

      setIsDataLoaded(true);
    }
  }, [
    computeVisitPeriodRange,
    existingPlanData,
    isDataLoaded,
    isEditMode,
    resolvedSalesPersonName,
    setFormState,
    pjpTypeRecords?.data,
    pjpTypeCode,
  ]);

  const handleSubmit = () => {
    // Ensure we send the code/name, not the ID
    let planTypeToSend = pjpTypeCode;
    
    // If code is not available, try to get it from master records
    if (!planTypeToSend && pjpType && pjpTypeRecords?.data) {
      const masterRecords: any[] = Array.isArray(pjpTypeRecords.data) 
        ? (pjpTypeRecords.data as any[])
        : [];
      
      const selectedRecord = masterRecords.find((record: any) => {
        const recordId = record.pjpPlanTypeId || record._id || record.id;
        return String(recordId) === String(pjpType);
      });
      
      if (selectedRecord) {
        planTypeToSend = (
          selectedRecord.pjpPlanTypeCode ||
          selectedRecord.code ||
          selectedRecord.pjpPlanTypeName ||
          selectedRecord.name ||
          ''
        ).toLowerCase();
      }
    }
    
    // Fallback to ID only if code is still not available (shouldn't happen in normal flow)
    if (!planTypeToSend && pjpType) {
      console.warn('PJP type code not found, falling back to ID:', pjpType);
      planTypeToSend = pjpType;
    }
    
    handleCreateOrUpdate(
      formState.selectedUser,
      planTypeToSend || '', // Send code/name instead of ID
      dateRange,
      outletVisitRecords,
      reason
    );
  };

  const handleAssignAreas = (record: ExtendedOutletVisitRecord) => {
    setCurrentAssignAreasRecord(record);
    setIsAssignAreasModalOpen(true);
  };

  const handleAssignAreasConfirm = (data: ApplicableToData) => {
    if (currentAssignAreasRecord) {
      handleAssignAreasToRecord(currentAssignAreasRecord.id, data);
    }
    setIsAssignAreasModalOpen(false);
    setCurrentAssignAreasRecord(null);
  };

  const handleAssignActivity = (record: ExtendedOutletVisitRecord) => {
    setCurrentAssignActivityRecord(record);
    setIsAssignActivityModalOpen(true);
  };

  const handleAssignActivityConfirm = (data: { beatIds: string[]; pjpVisitTypeId: string }) => {
    if (currentAssignActivityRecord) {
      handleAssignActivityToRecord(currentAssignActivityRecord.id, {
        pjpVisitTypeId: data.pjpVisitTypeId,
        beatIds: data.beatIds,
      });
    }
    setIsAssignActivityModalOpen(false);
    setCurrentAssignActivityRecord(null);
  };

  // Fetch user details with planId when user is selected using existing API
  // Only fetch in create mode when user is selected
  const shouldFetchUser = !isEditMode && !!formState.selectedUser;
  const { data: userData, isLoading: isLoadingUserPlan, error: userPlanError } = useQuery({
    queryKey: ['user', formState.selectedUser],
    queryFn: () => usersApi.getById(formState.selectedUser),
    enabled: shouldFetchUser,
  });

  // Map planId to PJP plan type when user data is fetched
  useEffect(() => {
    if (isEditMode || !formState.selectedUser) {
      return;
    }

    // If API call failed or no planId/pjpPlanTypeId, allow manual selection
    const planId = userData?.planId || userData?.pjpPlanTypeId;
    if (userPlanError || !planId) {
      setIsPlanTypeAutoSet(false);
      return;
    }

    if (!pjpTypeRecords?.data) {
      return;
    }

    const masterRecords: any[] = Array.isArray(pjpTypeRecords.data) 
      ? (pjpTypeRecords.data as any[])
      : [];

    // Find the PJP plan type record that matches the planId
    const matchedRecord = masterRecords.find((record: any) => {
      const recordId = record.pjpPlanTypeId || record._id || record.id;
      return String(recordId) === String(planId);
    });

    if (matchedRecord) {
      const recordId = matchedRecord.pjpPlanTypeId || matchedRecord._id || matchedRecord.id;
      const code = (
        matchedRecord.pjpPlanTypeCode ||
        matchedRecord.code ||
        matchedRecord.pjpPlanTypeName ||
        matchedRecord.name ||
        ''
      ).toLowerCase();

      // Set the PJP type
      setPjpType(String(recordId));
      setPjpTypeCode(code);
      setIsPlanTypeAutoSet(true);

      // Auto-generate date range based on the plan type
      if (code) {
        const today = startOfToday();
        const validatedRange = computeVisitPeriodRange(code, today);
        setDateRange(validatedRange);
      }
    } else {
      // PlanId doesn't match any master record - allow manual selection
      setIsPlanTypeAutoSet(false);
      console.warn(`PlanId ${planId} from user API does not match any PJP plan type master record`);
    }
  }, [userData?.planId, userData?.pjpPlanTypeId, pjpTypeRecords?.data, isEditMode, computeVisitPeriodRange, formState.selectedUser, userPlanError]);

  const handleUserSelect = (
    managerId: string | undefined,
    managerData?: {
      userId: string;
      name: string;
      employeeCode?: string;
      phoneNumber?: string;
    }
  ) => {
    if (managerId && managerData) {
      handleUserChange(managerId);
      setSelectedUserName(managerData.name);
      // Reset plan type when user changes
      setIsPlanTypeAutoSet(false);
      setPjpType('');
      setPjpTypeCode('');
      setDateRange(undefined);
    }
  };

  const handleUserConfirm = () => {
    setIsUserModalOpen(false);
  };

  const handleUserCancel = () => {
    setIsUserModalOpen(false);
  };

  const handleViewPlan = (record: ExtendedOutletVisitRecord) => {
    setCurrentPlanViewRecord(record);
    setIsPlanViewModalOpen(true);
  };

  const handlePlanViewModalClose = () => {
    setIsPlanViewModalOpen(false);
    setCurrentPlanViewRecord(null);
  };

  // Convert selectedOutlets to Outlet format for PlanViewModal
  const getPlanViewOutlets = (): Outlet[] => {
    if (!currentPlanViewRecord?.selectedOutlets) {
      return [];
    }
    return currentPlanViewRecord.selectedOutlets.map((outlet) => ({
      _id: outlet.outletId,
      outletId: outlet.outletId,
      outletName: outlet.outletName,
      warehouseId: outlet.warehouseId,
      outletAddress: {
        location: {
          type: 'Point' as const,
          coordinates: (outlet.location?.coordinates || [0, 0]) as [number, number],
        },
        streetAddress: '',
      },
      phoneNumber: '',
      outletImageUrl: null,
      outletStatus: 'active' as const,
      isDeleted: false,
      verificationDocuments: [],
      createdAt: '',
      updatedAt: '',
      outletStoreSqFtId: '',
      area: '',
      district: '',
      state: '',
      ownerName: '',
    }));
  };

  if (isEditMode && isLoadingExistingData) {
    return (
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-3 rounded-lg bg-card">
          <BreadcrumbHeader {...breadcrumb} />
        </div>
        <div className="flex h-64 items-center justify-center rounded-lg bg-card">
          <GenericPageLoading inline={true} loadingText="Please Wait..." />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-3 rounded-lg bg-card">
        <BreadcrumbHeader {...breadcrumb} />
      </div>

      <div className="rounded-lg bg-card p-4">
        <div className="bg-background mb-6 rounded-lg p-3 text-lg font-medium">
          {isEditMode
            ? 'Edit Manual PJP Information'
            : 'Manual PJP Information'}
        </div>

        {/* Form Fields Grid */}
        <div className="space-y-6">
          {/* Location Hierarchy Section - Optional */}

          {/* PJP Configuration */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <PjpConfigForm
              pjpType={pjpType}
              dateRange={dateRange}
              selectedUser={formState.selectedUser}
              editModeUserName={formState.editModeUserName}
              isEditMode={isEditMode}
              isApprovedRecord={isApprovedRecord}
              reason={reason}
              selectedUserName={selectedUserName}
              onPjpTypeChange={handlePjpTypeChange}
              onDateRangeChange={setDateRange}
              onReasonChange={setReason}
              onUserSelectClick={() => setIsUserModalOpen(true)}
              getValidatedRange={pjpType ? getValidatedRangeForType : undefined}
              dateMode="manual"
              isReadOnly={isReadOnly || !canChangePlan}
              showUserSelection={false}
              isPlanTypeAutoSet={isPlanTypeAutoSet}
              isLoadingUserPlan={isLoadingUserPlan}
              canChangePlan={canChangePlan}
              customDisabledDates={!isEditMode && pjpTypeCode ? getCustomDisabledDates : undefined}
              daysBeforeNextCycle={DAYS_BEFORE_NEXT_CYCLE}
            />
          </div>
        </div>
      </div>

      {/* Outlet Visit Table */}
      {dateRange?.from && dateRange?.to && (
        <>
          {outletVisitRecords.length > 0 ? (
            <OutletVisitTable
              outletVisitRecords={outletVisitRecords}
              onViewRecord={handleViewRecord}
              onDeleteRecord={handleDeleteRecord}
              isDeleteDisabled={isApprovedRecord || isReadOnly || !canChangePlan}
              onAssignAreas={canChangePlan ? handleAssignAreas : undefined}
              onAssignActivity={handleAssignActivity}
              showTravelInfo={false}
              onAddDay={canChangePlan ? handleAddDay : undefined}
              canAddMoreDays={canAddMoreDays && canChangePlan}
              maxDays={maxDays}
              isEditMode={isEditMode}
              handleViewPlan={handleViewPlan}
              isReadOnly={isReadOnly || !canChangePlan}
              hidePagination={!isEditMode}
            />
          ) : isEditMode && canAddMoreDays ? (
            <div className="rounded-lg bg-card p-4">
              <div className="bg-background mb-6 flex items-center justify-between rounded-lg p-3">
                <span className="text-lg font-medium">Outlet Visit</span>
                <Button
                  onClick={handleAddDay}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={!canChangePlan}
                >
                  <Plus className="h-4 w-4" />
                  Add Day
                  {maxDays && (
                    <span className="text-muted-foreground text-xs">
                      (0/{maxDays})
                    </span>
                  )}
                </Button>
                {!canChangePlan && (
                  <p className="text-xs text-amber-600 mt-1">
                    Cannot add days. Changes are only allowed more than 2 days before the plan start date.
                  </p>
                )}
              </div>
              <div className="text-muted-foreground py-8 text-center">
                No days configured yet. Click &ldquo;Add Day&rdquo; to start
                adding outlet visits.
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Location Hierarchy removed; filters moved to Select User modal */}

      {/* Action Buttons */}
      <ActionButtons
        isEditMode={isEditMode}
        isLoading={isLoading}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        isReadOnly={isReadOnly}
      />

      {/* Outlet Multi-Selector Modal */}
      <OutletMultiSelectorModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onOutletsSelect={handleOutletsSelect}
        selectedOutletIds={
          currentEditingRecord?.selectedOutlets?.map(
            (outlet) => outlet.outletId
          ) || []
        }
        preloadedOutlets={
          (currentEditingRecord?.selectedOutlets?.map((outlet) => ({
            outletId: outlet.outletId,
            outletName: outlet.outletName,
            outletAddress: {
              location: outlet.location,
            },
            warehouseId: outlet.warehouseId,
          })) as any) || []
        }
        excludedOutletIds={excludedOutletIds}
        userId={formState.selectedUser || userId}
        warehouseId={formState.selectedWarehouse}
        viewOnly={isReadOnly}
      />

      {/* Assign Areas Modal */}
      <AssignAreasModal
        open={isAssignAreasModalOpen}
        onOpenChange={setIsAssignAreasModalOpen}
        onConfirm={handleAssignAreasConfirm}
        initialData={currentAssignAreasRecord?.applicableTo}
        userId={formState.selectedUser || userId}
        isReadOnly={isReadOnly}
      />

      {/* Assign Activity Modal */}
      <AssignActivityModal
        open={isAssignActivityModalOpen}
        onOpenChange={setIsAssignActivityModalOpen}
        onConfirm={handleAssignActivityConfirm}
        initialData={currentAssignActivityRecord ? {
          pjpVisitTypeId: currentAssignActivityRecord.pjpVisitTypeId,
          beatIds: currentAssignActivityRecord.assignedActivityBeatIds || [],
        } : undefined}
        isReadOnly={isReadOnly}
      />

      {/* User Selection Modal */}
      <ReportingManagerModal
        open={isUserModalOpen}
        selectedManagerId={formState.selectedUser}
        onChange={handleUserSelect}
        onConfirm={handleUserConfirm}
        onCancel={handleUserCancel}
        modalTitle="Select User for PJP"
        showWarehouseFilter={true}
        initialSelectedOption={
          formState.selectedUser && selectedUserName
            ? {
                userId: formState.selectedUser,
                name: selectedUserName,
              }
            : undefined
        }
      />

      {/* Plan View Modal */}
      <PlanViewModal
        open={isPlanViewModalOpen}
        onOpenChange={handlePlanViewModalClose}
        title={`Plan for ${currentPlanViewRecord?.formattedDate || ''}`}
        outlets={getPlanViewOutlets()}
        applicableTo={currentPlanViewRecord?.applicableTo}
        pjpVisitTypeId={currentPlanViewRecord?.pjpVisitTypeId}
        assignedActivityBeatIds={currentPlanViewRecord?.assignedActivityBeatIds}
      />
    </section>
  );
};

export default PlaceOrdersPage;
