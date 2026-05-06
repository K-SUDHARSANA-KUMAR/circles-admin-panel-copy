import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { usePjp } from '@/features/dashboard/pjp/hooks/usePjp';
import NavKeys from '@/constants/navkeys';
import { ExtendedOutletVisitRecord, PjpPayload } from '../_types';
import { validateForm } from '../_utils/validation';
import { SUCCESS_MESSAGES } from '../_constants';

export const useManualPjpLogic = (
  isEditMode: boolean,
  routePlanId: string | null,
  selectedWarehouseId: string,
  userId: string | undefined,
  isApprovedRecord?: boolean
) => {
  const router = useRouter();
  const { createManualRoutePlan, updateManualRoutePlan } = usePjp();

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const handleCreateOrUpdate = useCallback(async (
    selectedUser: string,
    pjpType: string,
    dateRange: DateRange | undefined,
    outletVisitRecords: ExtendedOutletVisitRecord[],
    reason?: string
  ) => {
    // Validate form
    const validation = validateForm(selectedUser, pjpType, dateRange, outletVisitRecords, isApprovedRecord, reason);
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }

    // Build journey plan
    const journeyPlan = outletVisitRecords
      .filter((record) => {
        const hasOutlets = record.selectedOutlets && record.selectedOutlets.length > 0;
        const hasApplicableTo = record.applicableTo && 
          Object.values(record.applicableTo).some(arr => arr.length > 0);
        const hasAssignedActivity = record.pjpVisitTypeId || 
          (record.assignedActivityBeatIds && record.assignedActivityBeatIds.length > 0);
        return hasOutlets || hasApplicableTo || hasAssignedActivity;
      })
      .map((record) => {
        const journeyPlanItem: any = {
          visitDate: new Date(record.date).toISOString(),
          userId: selectedUser || userId || '',
          outlets: record.selectedOutlets?.map((outlet, index) => ({
            outletId: outlet.outletId,
            outletName: outlet.outletName,
            location: outlet.location ? {
              type: 'Point' as const,
              coordinates: outlet.location.coordinates,
            } : {
              type: 'Point' as const,
              coordinates: [0, 0] as [number, number],
            },
            index: outlet.index ?? index,
            warehouseId: outlet.warehouseId || selectedWarehouseId,
          })) || [],
        };

        // Add applicableTo if it exists for this record
        if (record.applicableTo && Object.values(record.applicableTo).some(arr => arr.length > 0)) {
          journeyPlanItem.applicableTo = {
            warehouseIds: record.applicableTo.warehouseIds,
            beatIds: record.applicableTo.beatIds,
            userIds: record.applicableTo.userIds || [],
          };
        }

        // Add assignedTo if pjpVisitTypeId or assignedActivityBeatIds exists
        if (record.pjpVisitTypeId || (record.assignedActivityBeatIds && record.assignedActivityBeatIds.length > 0)) {
          journeyPlanItem.assignedTo = [{
            beatIds: record.assignedActivityBeatIds || [],
            pjpVisitTypeIds: record.pjpVisitTypeId ? [{
              pjpVisitTypeId: record.pjpVisitTypeId,
            }] : [],
          }];
        }

        return journeyPlanItem;
      });

    // Collect unique warehouse IDs
    const warehouseIds = Array.from(
      new Set(
        outletVisitRecords
          .flatMap(record => record.selectedOutlets || [])
          .map(outlet => outlet.warehouseId || selectedWarehouseId)
          .filter(Boolean)
      )
    );

    const payload: PjpPayload = {
      userId: selectedUser || userId || '',
      planType: pjpType,
      routePlanMode: "manual",
      visitPeriod: {
        from: format(dateRange!.from!, 'yyyy-MM-dd'),
        to: format(dateRange!.to!, 'yyyy-MM-dd'),
      },
      journeyPlan,
      warehouseId: warehouseIds,
      ...(reason && { reason }),
    };

    try {
      if (isEditMode && routePlanId) {
        await updateManualRoutePlan.mutateAsync({ routePlanId, data: payload });
        toast.success(SUCCESS_MESSAGES.UPDATED);
      } else {
        await createManualRoutePlan.mutateAsync(payload);
        toast.success(SUCCESS_MESSAGES.CREATED);
      }
      router.push(NavKeys.ManualPjp);
    } catch (error: any) {
      console.error(
        `Error ${isEditMode ? 'updating' : 'creating'} manual route plan:`,
        error
      );
      toast.error(
        error?.response?.data?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} manual route plan`
      );
    }
  }, [
    isEditMode,
    routePlanId,
    selectedWarehouseId,
    userId,
    createManualRoutePlan,
    updateManualRoutePlan,
    router,
  ]);

  const isLoading = createManualRoutePlan.isPending || updateManualRoutePlan.isPending;

  return {
    handleCancel,
    handleCreateOrUpdate,
    isLoading,
  };
};
