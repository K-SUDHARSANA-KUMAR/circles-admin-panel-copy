'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { MoreVertical, AlertTriangle, Eye } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatWithLeadingZero } from '@/lib/utils';

export interface OutletVisitRecord {
  id: string;
  date: string;
  formattedDate: string;
  numberOfOutlets: number;
  totalTravelDistInMeters?: number;
  totalTravelTimeInSecs?: number;
  applicableTo?: {
    warehouseIds: string[];
    beatIds: string[];
    userIds: string[];
  };
  pjpVisitTypeId?: string;
  assignedActivityBeatIds?: string[];
}

export const createOutletVisitColumns = (
  handleViewRecord: (record: OutletVisitRecord) => void,
  handleDeleteRecord: (record: OutletVisitRecord) => void,
  isDeleteDisabled: boolean,
  handleAssignAreas?: (record: OutletVisitRecord) => void,
  handleAssignActivity?: (record: OutletVisitRecord) => void,
  showAssignedAreas: boolean = true,
  showTravelInfo: boolean = true,
  isDeviationsMode: boolean = false,
  parentPlanDataByDate?: Record<string, {
    numberOfOutlets: number;
    applicableTo?: {
      warehouseIds: string[];
      beatIds: string[];
      userIds: string[];
    };
  }>,
  handleViewParentPlanOutlets?: (date: string) => void,
  handleViewCurrentPlan?: (record: OutletVisitRecord) => void,
  handleViewPlan?: (record: OutletVisitRecord) => void,
  isReadOnly?: boolean
): ColumnDef<OutletVisitRecord>[] => {
  const columns: ColumnDef<OutletVisitRecord>[] = [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => {
        const record = row.original;

        const hasNoOutlets = record.numberOfOutlets === 0;
        const hasNoAreas =
          !record.applicableTo ||
          Object.values(record.applicableTo).every((arr) => arr.length === 0);
        const hasAssignedActivity = record.pjpVisitTypeId || 
          (record.assignedActivityBeatIds && record.assignedActivityBeatIds.length > 0);

        const hasNoData = showAssignedAreas
          ? hasNoOutlets && hasNoAreas && !hasAssignedActivity
          : hasNoOutlets && !hasAssignedActivity;

        return (
          <div className="flex items-center gap-2">
            <span>{formatWithLeadingZero(row.index + 1)}</span>

            {hasNoData && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-4 w-4 text-yellow-500 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{showAssignedAreas ? 'No outlets or areas assigned' : 'No outlets assigned'}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      },
    },

    {
      id: 'date',
      header: 'Date',
      accessorKey: 'formattedDate',
    },
  ];

  // previous plan column
  if (isDeviationsMode) {
    columns.push({
      id: 'selected',
      header: 'Previous Plan',
      cell: ({ row }) => {
        const record = row.original;
        const parentData = parentPlanDataByDate?.[record.date];

        const num = parentData?.numberOfOutlets ?? record.numberOfOutlets;
        const applicableTo = parentData?.applicableTo ?? record.applicableTo;

        const parts: string[] = [];

        if (num > 0) parts.push(`${num} outlet${num > 1 ? 's' : ''}`);
        if (applicableTo?.warehouseIds?.length)
          parts.push(`${applicableTo.warehouseIds.length} WH`);
        if (applicableTo?.beatIds?.length)
          parts.push(`${applicableTo.beatIds.length} beats`);
        if (applicableTo?.userIds?.length)
          parts.push(`${applicableTo.userIds.length} sales persons`);

        const hasParentData =
          parentData && (num > 0 || applicableTo);

        return (
          <div className="flex items-center gap-2">
            {parts.length ? (
              <span className="text-sm">{parts.join(', ')}</span>
            ) : (
              <span className="text-gray-400">-</span>
            )}

            {hasParentData && handleViewParentPlanOutlets && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-primary border-2 hover:bg-green-50"
                onClick={() => handleViewParentPlanOutlets(record.date)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    });
  }

  if (showTravelInfo) {
    columns.push(
      {
        id: 'totalTravelTime',
        header: 'Travel Time',
        cell: ({ row }) => {
          const secs = row.original.totalTravelTimeInSecs;
          if (secs === undefined) return <span className="text-gray-400">-</span>;
          return <span>{(secs / 3600).toFixed(2)} hrs</span>;
        },
      },
      {
        id: 'totalTravelKms',
        header: 'Travel Distance',
        cell: ({ row }) => {
          const meters = row.original.totalTravelDistInMeters;
          if (meters === undefined) return <span className="text-gray-400">-</span>;
          return <span>{(meters / 1000).toFixed(2)} km</span>;
        },
      }
    );
  }

  if (showAssignedAreas) {
    columns.push({
      id: 'assignedAreas',
      header: isDeviationsMode ? 'Current Plan' : 'Plan',
      cell: ({ row }) => {
        const record = row.original;
        const applicableTo = record.applicableTo;

        const parts: string[] = [];

        if (record.numberOfOutlets > 0)
          parts.push(`${record.numberOfOutlets} outlets`);

        if (applicableTo?.warehouseIds?.length)
          parts.push(`${applicableTo.warehouseIds.length} WH`);
        if (applicableTo?.beatIds?.length)
          parts.push(`${applicableTo.beatIds.length} beats`);
        if (applicableTo?.userIds?.length)
          parts.push(`${applicableTo.userIds.length} sales persons`);

        // Add assigned activity beats count if exists
        if (record.assignedActivityBeatIds && record.assignedActivityBeatIds.length > 0) {
          parts.push(`${record.assignedActivityBeatIds.length} beats`);
        }

        // Check if assigned activity exists (beats or PJP visit type)
        const hasAssignedActivity = record.pjpVisitTypeId || (record.assignedActivityBeatIds && record.assignedActivityBeatIds.length > 0);
        
        const hasData = parts.length > 0 || hasAssignedActivity;

        return (
          <div className="flex items-center gap-2">
            {hasData ? (
              <span className="text-sm">{parts.join(', ')}</span>
            ) : (
              <span className="text-gray-400">-</span>
            )}

            {hasData && (
              <>
                {isDeviationsMode && handleViewCurrentPlan && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 border-primary border-2 hover:bg-green-50"
                    onClick={() => handleViewCurrentPlan(record)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}

                {!isDeviationsMode && handleViewPlan && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 border-primary border-2 hover:bg-green-50"
                    onClick={() => handleViewPlan(record)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        );
      },
    });
  }

  columns.push({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const record = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={5}
            className="z-[99999]"
          >
            <DropdownMenuItem
              className="border-b border-neutral-200"
              onClick={() => handleViewRecord(record)}
            >
              <div className="flex items-center gap-2">
                <span>View/Assign Outlet</span>
              </div>
            </DropdownMenuItem>

            {handleAssignAreas && showAssignedAreas && (
              <DropdownMenuItem
                className="border-b border-neutral-200"
                onClick={() => handleAssignAreas(record)}
              >
                <div className="flex items-center gap-2">
                  <span>View/Assign Areas</span>
                </div>
              </DropdownMenuItem>
            )}

            {handleAssignActivity && (
              <DropdownMenuItem
                className="border-b border-neutral-200"
                onClick={() => handleAssignActivity(record)}
              >
                <div className="flex items-center gap-2">
                  <span>Assign activity</span>
                </div>
              </DropdownMenuItem>
            )}

            {!isDeleteDisabled && (
              <DropdownMenuItem
                className="text-red-600 focus:text-red-700"
                onClick={() => handleDeleteRecord(record)}
              >
                <div className="flex items-center gap-2">
                  <span>Delete</span>
                </div>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  });

  return columns;
};
