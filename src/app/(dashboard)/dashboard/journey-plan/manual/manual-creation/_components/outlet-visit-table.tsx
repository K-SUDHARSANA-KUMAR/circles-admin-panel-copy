import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { createOutletVisitColumns } from '@/components/data-tables/pjp/outlet-visit-columns';
import { ExtendedOutletVisitRecord } from '../_types';

interface OutletVisitTableProps {
  outletVisitRecords: ExtendedOutletVisitRecord[];
  onViewRecord: (record: ExtendedOutletVisitRecord) => void;
  onDeleteRecord: (record: ExtendedOutletVisitRecord) => void;
  isDeleteDisabled: boolean;
  onAssignAreas?: (record: ExtendedOutletVisitRecord) => void;
  onAssignActivity?: (record: ExtendedOutletVisitRecord) => void;
  showAssignedAreas?: boolean;
  showTravelInfo?: boolean;
  onAddDay?: () => void;
  canAddMoreDays?: boolean;
  maxDays?: number;
  isEditMode?: boolean;
  isDeviationsMode?: boolean;
  parentPlanDataByDate?: Record<string, {
    numberOfOutlets: number;
    applicableTo?: {
      warehouseIds: string[];
      beatIds: string[];
      userIds: string[];
    };
  }>;
  handleViewParentPlanOutlets?: (date: string) => void;
  handleViewCurrentPlan?: (record: ExtendedOutletVisitRecord) => void;
  handleViewPlan?: (record: ExtendedOutletVisitRecord) => void;
  isReadOnly?: boolean;
  hidePagination?: boolean;
}

export const OutletVisitTable = ({
  outletVisitRecords,
  onViewRecord,
  onDeleteRecord,
  isDeleteDisabled,
  onAssignAreas,
  onAssignActivity,
  showAssignedAreas = true,
  showTravelInfo = true,
  onAddDay,
  canAddMoreDays = false,
  maxDays,
  isEditMode = false,
  isDeviationsMode = false,
  parentPlanDataByDate,
  handleViewParentPlanOutlets,
  handleViewCurrentPlan,
  handleViewPlan,
  isReadOnly = false,
  hidePagination = false,
}: OutletVisitTableProps) => {
  const columns = createOutletVisitColumns(
    onViewRecord, 
    onDeleteRecord, 
    isDeleteDisabled || isReadOnly, 
    onAssignAreas, // Always pass onAssignAreas so button shows, but checkboxes will be disabled in modal
    onAssignActivity,
    showAssignedAreas,
    showTravelInfo,
    isDeviationsMode,
    parentPlanDataByDate,
    handleViewParentPlanOutlets,
    handleViewCurrentPlan,
    handleViewPlan,
    isReadOnly // Pass isReadOnly to columns if needed
  );

  return (
    <div className="rounded-lg bg-white p-4">
      <div className="bg-background mb-6 flex items-center justify-between rounded-lg p-3">
        <span className="text-lg font-medium">Outlet Visit</span>
        {onAddDay && canAddMoreDays && !isReadOnly && (
          <Button 
            onClick={onAddDay} 
            variant="secondary" 
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Day
            {maxDays && (
              <span className="text-xs text-muted-foreground">
                ({outletVisitRecords.length}/{maxDays})
              </span>
            )}
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={outletVisitRecords}
        tableId="outlet-visit-table"
        isDownload={false}
        isColumnDisplay={false}
        hidePagination={hidePagination}
        initialPagination={hidePagination ? {
          pageIndex: 0,
          pageSize: Math.max(outletVisitRecords.length, 1000),
        } : undefined}
        getRowClassName={(row) => {
          const record = row.original as ExtendedOutletVisitRecord;
          const hasNoOutlets =
            !record.selectedOutlets || record.selectedOutlets.length === 0;
          const hasNoAreas = !record.applicableTo || 
            Object.values(record.applicableTo).every(arr => arr.length === 0);
          const hasAssignedActivity = record.pjpVisitTypeId || 
            (record.assignedActivityBeatIds && record.assignedActivityBeatIds.length > 0);
          const hasNoData = showAssignedAreas 
            ? (hasNoOutlets && hasNoAreas && !hasAssignedActivity) 
            : (hasNoOutlets && !hasAssignedActivity);
          return hasNoData ? 'bg-yellow-50 hover:bg-yellow-70' : '';
        }}
      />
    </div>
  );
};
