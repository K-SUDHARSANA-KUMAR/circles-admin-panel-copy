'use client';

import { useSearchParams } from 'next/navigation';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { getBreadcrumbData } from '@/constants/breadcrumb-config';
import GenericPageLoading from '@/components/shared/generic-page-loading';
import GenericError from '@/components/shared/generic-page-error';
import { useEffect, useMemo, useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { usePlanDeviationById } from '@/features/dashboard/pjp/hooks/usePjp';
import { OutletMultiSelectorModal } from '@/components/modals/pjp/outlet-multi-selector-modal';
import { OutletVisitTable } from '@/app/(dashboard)/dashboard/journey-plan/manual/manual-creation/_components/outlet-visit-table';
import { useOutletVisitRecords } from '@/app/(dashboard)/dashboard/journey-plan/manual/manual-creation/_hooks/useOutletVisitRecords';
import { AssignAreasModal } from '@/app/(dashboard)/dashboard/journey-plan/manual/manual-creation/_components/assign-areas-modal';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { usePjp } from '@/features/dashboard/pjp/hooks/usePjp';
import { PlanViewModal } from './_components/plan-view-modal';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import NavKeys from '@/constants/navkeys';
import type { Outlet } from '@/features/dashboard/outlets/types/outlet.types';
import type { ApplicableToData, ExtendedOutletVisitRecord } from '@/app/(dashboard)/dashboard/journey-plan/manual/manual-creation/_types';

const DeviationsManagePage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deviationId = searchParams.get('deviationId') || '';

  const breadcrumb = getBreadcrumbData('deviationsManage', 'edit');

  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.userId;

  const { data, isLoading, error } = usePlanDeviationById(deviationId);
  const deviation = data?.data;

  // Check if current user is the creator of the deviation
  const isReadOnly = useMemo(() => {
    if (!deviation || !userId) {
      return false;
    }
    // Check multiple possible field names for creator ID
    const createdByUserId = 
      deviation.createdByUserId || 
      deviation.createdBy?.userId ||
      deviation.createdBy?.user?.userId ||
      deviation.createdByUser?.userId ||
      deviation.createdByUser;
    
    // If createdByUserId exists and doesn't match current user, it's read-only
    if (createdByUserId && createdByUserId !== userId) {
      return true;
    }
    
    // Also check if userId in deviation doesn't match (deviation might be assigned to different user)
    // But only if there's no explicit createdBy field
    if (!createdByUserId && deviation.userId && deviation.userId !== userId) {
      // This might be an approver viewing someone else's deviation
      return true;
    }
    
    return false;
  }, [deviation, userId]);

  const [pjpType, setPjpType] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [isAssignAreasModalOpen, setIsAssignAreasModalOpen] = useState(false);
  const [currentAssignAreasRecord, setCurrentAssignAreasRecord] =
    useState<ExtendedOutletVisitRecord | null>(null);
  const [isParentPlanViewModalOpen, setIsParentPlanViewModalOpen] = useState(false);
  const [currentParentPlanDate, setCurrentParentPlanDate] = useState<string>('');
  const [isCurrentPlanViewModalOpen, setIsCurrentPlanViewModalOpen] = useState(false);
  const [currentPlanRecord, setCurrentPlanRecord] = useState<ExtendedOutletVisitRecord | null>(null);

  const { updateDeviationRoutePlan } = usePjp();

  useEffect(() => {
    if (deviation && !isDataLoaded) {
      setPjpType(deviation.planType || '');
      setDateRange({
        from: new Date(deviation.deviationPeriod.from),
        to: new Date(deviation.deviationPeriod.to),
      });
      setReason(deviation.reason || '');
      setIsDataLoaded(true);
    }
  }, [deviation, isDataLoaded]);

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
  } = useOutletVisitRecords(
    dateRange,
    true,
    deviation,
    isDataLoaded,
    selectedWarehouseId,
    setSelectedWarehouseId,
    pjpType
  );

  // Create a map of parent plan data by date for easy lookup
  const parentPlanDataByDate = useMemo<Record<string, {
    numberOfOutlets: number;
    applicableTo?: ApplicableToData;
    outlets?: any[];
  }>>(() => {
    const map: Record<string, {
      numberOfOutlets: number;
      applicableTo?: ApplicableToData;
      outlets?: any[];
    }> = {};

    if (!deviation?.parentRoutePlan?.journeyPlan) {
      return map;
    }

    deviation.parentRoutePlan.journeyPlan.forEach((day: any) => {
      if (!day.visitDate) return;
      
      const visitDate = new Date(day.visitDate);
      // Use format from date-fns to ensure consistent YYYY-MM-DD format
      const dateKey = format(visitDate, 'yyyy-MM-dd');
      
      map[dateKey] = {
        numberOfOutlets: day?.outlets?.length || 0,
        applicableTo: day?.applicableTo,
        outlets: day?.outlets || [],
      };
    });

    return map;
  }, [deviation?.parentRoutePlan]);

  // Get parent plan warehouseId (handle both array and string formats)
  const parentPlanWarehouseId = useMemo(() => {
    if (!deviation?.parentRoutePlan?.warehouseId) {
      return selectedWarehouseId;
    }
    // Handle array format: [{ warehouseId: string, warehouseName: string }]
    if (Array.isArray(deviation.parentRoutePlan.warehouseId)) {
      return deviation.parentRoutePlan.warehouseId[0]?.warehouseId || selectedWarehouseId;
    }
    // Handle string format
    return deviation.parentRoutePlan.warehouseId || selectedWarehouseId;
  }, [deviation?.parentRoutePlan?.warehouseId, selectedWarehouseId]);

  // Transform parent plan outlets for the modal
  const parentPlanModalOutlets = useMemo<Outlet[]>(() => {
    if (!currentParentPlanDate || !parentPlanDataByDate[currentParentPlanDate]?.outlets) {
      return [];
    }

    const outlets = parentPlanDataByDate[currentParentPlanDate].outlets || [];
    
    return outlets.map((outlet: any) => {
      // Extract warehouseId from outlet (handle both string and object formats)
      let outletWarehouseId = outlet.warehouseId;
      if (typeof outletWarehouseId === 'object' && outletWarehouseId?.warehouseId) {
        outletWarehouseId = outletWarehouseId.warehouseId;
      }
      
      return {
        _id: outlet.outletId,
        outletId: outlet.outletId,
        outletName: outlet.outletName,
        phoneNumber: '',
        outletImageUrl: null,
        outletStatus: 'active',
        outletAddress: {
          location:
            outlet.location && Array.isArray(outlet.location.coordinates)
              ? (outlet.location as { type: 'Point'; coordinates: [number, number] })
              : ({
                  type: 'Point' as const,
                  coordinates: [0, 0] as [number, number],
                } as { type: 'Point'; coordinates: [number, number] }),
          streetAddress: '',
        },
        isDeleted: false,
        verificationDocuments: [],
        createdAt: '',
        updatedAt: '',
        outletStoreSqFtId: '',
        area: '',
        district: '',
        state: '',
        ownerName: '',
        warehouseId: outletWarehouseId || parentPlanWarehouseId,
      };
    });
  }, [currentParentPlanDate, parentPlanDataByDate, parentPlanWarehouseId]);

  // Get parent plan applicableTo for the selected date
  const parentPlanApplicableTo = useMemo<ApplicableToData | undefined>(() => {
    if (!currentParentPlanDate || !parentPlanDataByDate[currentParentPlanDate]) {
      return undefined;
    }
    return parentPlanDataByDate[currentParentPlanDate].applicableTo;
  }, [currentParentPlanDate, parentPlanDataByDate]);

  // Transform current plan outlets for the modal
  const currentPlanModalOutlets = useMemo<Outlet[]>(() => {
    if (!currentPlanRecord?.selectedOutlets?.length) {
      return [];
    }

    return currentPlanRecord.selectedOutlets.map((outlet) => ({
      _id: outlet.outletId,
      outletId: outlet.outletId,
      outletName: outlet.outletName,
      phoneNumber: '',
      outletImageUrl: null,
      outletStatus: 'active',
      outletAddress: {
        location:
          outlet.location && Array.isArray(outlet.location.coordinates)
            ? (outlet.location as { type: 'Point'; coordinates: [number, number] })
            : ({
                type: 'Point' as const,
                coordinates: (outlet.location?.coordinates ||
                  ([0, 0] as [number, number])) as [number, number],
              } as { type: 'Point'; coordinates: [number, number] }),
        streetAddress: '',
      },
      isDeleted: false,
      verificationDocuments: [],
      createdAt: '',
      updatedAt: '',
      outletStoreSqFtId: '',
      area: '',
      district: '',
      state: '',
      ownerName: '',
      warehouseId: outlet.warehouseId || selectedWarehouseId,
    }));
  }, [currentPlanRecord?.selectedOutlets, selectedWarehouseId]);

  // Get current plan applicableTo
  const currentPlanApplicableTo = useMemo<ApplicableToData | undefined>(() => {
    return currentPlanRecord?.applicableTo;
  }, [currentPlanRecord?.applicableTo]);

  const handleViewParentPlan = (date: string) => {
    setCurrentParentPlanDate(date);
    setIsParentPlanViewModalOpen(true);
  };

  const handleParentPlanViewModalChange = (open: boolean) => {
    setIsParentPlanViewModalOpen(open);
    if (!open) {
      setCurrentParentPlanDate('');
    }
  };

  const handleViewCurrentPlan = (record: ExtendedOutletVisitRecord) => {
    setCurrentPlanRecord(record);
    setIsCurrentPlanViewModalOpen(true);
  };

  const handleCurrentPlanViewModalChange = (open: boolean) => {
    setIsCurrentPlanViewModalOpen(open);
    if (!open) {
      setCurrentPlanRecord(null);
    }
  };

  const handleAssignAreas = (record: ExtendedOutletVisitRecord) => {
    setCurrentAssignAreasRecord(record);
    setIsAssignAreasModalOpen(true);
  };

  const handleAssignAreasModalChange = (open: boolean) => {
    setIsAssignAreasModalOpen(open);
    if (!open) {
      setCurrentAssignAreasRecord(null);
    }
  };

  const handleAssignAreasConfirm = (data: ApplicableToData) => {
    if (currentAssignAreasRecord) {
      handleAssignAreasToRecord(currentAssignAreasRecord.id, data);
    }
    setIsAssignAreasModalOpen(false);
    setCurrentAssignAreasRecord(null);
  };

  const handleUpdate = async () => {
    if (!deviation) return;
    if (!dateRange?.from || !dateRange?.to) return;
    if (!outletVisitRecords.length) return;

    const journeyPlan = outletVisitRecords
      .filter((record) => {
        const hasOutlets =
          record.selectedOutlets && record.selectedOutlets.length > 0;
        const hasApplicableTo =
          record.applicableTo &&
          Object.values(record.applicableTo).some((arr) => arr.length > 0);
        return hasOutlets || hasApplicableTo;
      })
      .map((record) => {
        const journeyPlanItem: {
          visitDate: string;
          userId: string;
          outlets: {
            outletId: string;
            outletName: string;
            location: { type: 'Point'; coordinates: [number, number] };
            index: number;
            warehouseId?: string;
          }[];
          applicableTo?: ApplicableToData;
        } = {
          visitDate: new Date(record.date).toISOString(),
          userId: deviation.userId,
          outlets:
            record.selectedOutlets?.map((outlet, index) => ({
              outletId: outlet.outletId,
              outletName: outlet.outletName,
              location: outlet.location
                ? {
                    type: 'Point' as const,
                    coordinates: outlet.location.coordinates,
                  }
                : {
                    type: 'Point' as const,
                    coordinates: [0, 0] as [number, number],
                  },
              index: outlet.index ?? index,
              warehouseId: outlet.warehouseId || selectedWarehouseId,
            })) || [],
        };

        if (
          record.applicableTo &&
          Object.values(record.applicableTo).some((arr) => arr.length > 0)
        ) {
          journeyPlanItem.applicableTo = {
            warehouseIds: record.applicableTo.warehouseIds || [],
            beatIds: record.applicableTo.beatIds || [],
            userIds: record.applicableTo.userIds || [],
          };
        }

        return journeyPlanItem;
      });

    const warehouseIds = Array.from(
      new Set(
        outletVisitRecords
          .flatMap((record) => record.selectedOutlets || [])
          .map((outlet) => outlet.warehouseId || selectedWarehouseId)
          .filter(Boolean)
      )
    );

    const payload: any = {
      journeyPlan,
      warehouseId: warehouseIds,
      ...(reason && { reason }),
    };

    try {
      setIsUpdating(true);
      const deviationId = deviation?.deviationId;
      await updateDeviationRoutePlan.mutateAsync({ deviationId, data: payload });
      toast.success('Deviation updated successfully');
      router.push(NavKeys.Deviations);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Failed to update deviation'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const preloadedModalOutlets = useMemo<Outlet[]>(() => {
    if (!currentEditingRecord?.selectedOutlets?.length) {
      return [];
    }

    return currentEditingRecord.selectedOutlets.map((outlet) => ({
      _id: outlet.outletId,
      outletId: outlet.outletId,
      outletName: outlet.outletName,
      phoneNumber: '',
      outletImageUrl: null,
      outletStatus: 'active',
      outletAddress: {
        location:
          outlet.location && Array.isArray(outlet.location.coordinates)
            ? (outlet.location as { type: 'Point'; coordinates: [number, number] })
            : ({
                type: 'Point' as const,
                coordinates: (outlet.location?.coordinates ||
                  ([0, 0] as [number, number])) as [number, number],
              } as { type: 'Point'; coordinates: [number, number] }),
        streetAddress: '',
      },
      isDeleted: false,
      verificationDocuments: [],
      createdAt: '',
      updatedAt: '',
      outletStoreSqFtId: '',
      area: '',
      district: '',
      state: '',
      ownerName: '',
      warehouseId: outlet.warehouseId || selectedWarehouseId,
    }));
  }, [currentEditingRecord?.selectedOutlets, selectedWarehouseId]);

  if (isLoading) {
    return (
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-3 rounded-lg bg-white">
          <BreadcrumbHeader {...breadcrumb} />
        </div>
        <div className="flex h-64 items-center justify-center rounded-lg bg-white">
          <GenericPageLoading inline={true} loadingText="Please Wait..." />
        </div>
      </section>
    );
  }

  if (error || !deviationId) {
    return (
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-3 rounded-lg bg-white">
          <BreadcrumbHeader {...breadcrumb} />
        </div>
        <div className="flex h-64 items-center justify-center rounded-lg bg-white">
          <GenericError
            errorText={
              deviationId
                ? 'Error loading deviation. Please try again.'
                : 'Missing deviation id in URL'
            }
            inline
          />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-3 rounded-lg bg-white">
        <BreadcrumbHeader {...breadcrumb} />
      </div>

      <div className="rounded-lg bg-white p-4">
        <div className="bg-background mb-6 rounded-lg p-3 text-lg font-medium">
          Deviation Information
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>User</Label>
            <div className="border-input bg-background text-muted-foreground flex h-10 w-full rounded-md border px-3 py-2 text-sm">
              {deviation?.userName || 'N/A'}
            </div>
          </div>

          <div className="space-y-2">
            <Label>PJP Type</Label>
            <div className="border-input bg-background text-muted-foreground flex h-10 w-full rounded-md border px-3 py-2 text-sm">
              {pjpType || 'N/A'}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Visit Period</Label>
            <div className="border-input bg-background text-muted-foreground flex h-10 w-full rounded-md border px-3 py-2 text-sm">
              {deviation
                ? `${new Date(deviation.deviationPeriod.from).toLocaleDateString()} - ${new Date(deviation.deviationPeriod.to).toLocaleDateString()}`
                : 'N/A'}
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Reason <span className="text-destructive">*</span>
            </Label>
            <Input
              className="h-10"
              placeholder="Enter reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isReadOnly}
            />
          </div>
        </div>
      </div>

      {dateRange?.from && dateRange?.to && outletVisitRecords.length > 0 && (
        <OutletVisitTable
          outletVisitRecords={outletVisitRecords}
          onViewRecord={handleViewRecord}
          onDeleteRecord={handleDeleteRecord}
          isDeleteDisabled={true}
          onAssignAreas={handleAssignAreas}
          showTravelInfo={false}
          isDeviationsMode={true}
          parentPlanDataByDate={parentPlanDataByDate}
          handleViewParentPlanOutlets={handleViewParentPlan}
          handleViewCurrentPlan={handleViewCurrentPlan}
          isReadOnly={isReadOnly}
        />
      )}

      <div className="flex items-center justify-end gap-3">
        <Button variant="default" onClick={handleUpdate} disabled={isUpdating || isReadOnly}>
          {isUpdating ? 'Updating...' : 'Update'}
        </Button>
      </div>

      <OutletMultiSelectorModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onOutletsSelect={handleOutletsSelect}
        selectedOutletIds={
          currentEditingRecord?.selectedOutlets?.map(
            (outlet) => outlet.outletId
          ) || []
        }
        excludedOutletIds={excludedOutletIds}
        userId={deviation?.userId}
        warehouseId={selectedWarehouseId}
        preloadedOutlets={preloadedModalOutlets}
        viewOnly={isReadOnly}
      />
      <AssignAreasModal
        open={isAssignAreasModalOpen}
        onOpenChange={handleAssignAreasModalChange}
        onConfirm={handleAssignAreasConfirm}
        initialData={currentAssignAreasRecord?.applicableTo}
        userId={deviation?.userId}
        isReadOnly={isReadOnly}
      />

      {/* Parent Plan View Modal */}
      <PlanViewModal
        open={isParentPlanViewModalOpen}
        onOpenChange={handleParentPlanViewModalChange}
        title="Previous Plan Data"
        outlets={parentPlanModalOutlets}
        applicableTo={parentPlanApplicableTo}
      />

      {/* Current Plan View Modal */}
      <PlanViewModal
        open={isCurrentPlanViewModalOpen}
        onOpenChange={handleCurrentPlanViewModalChange}
        title="Current Plan Data"
        outlets={currentPlanModalOutlets}
        applicableTo={currentPlanApplicableTo}
      />
    </section>
  );
};

export default DeviationsManagePage;
