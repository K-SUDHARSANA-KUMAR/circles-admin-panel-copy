'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { MoreVertical, Eye, Trash2, AlertTriangle } from 'lucide-react';
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
import { cn, formatWithLeadingZero } from '@/lib/utils';

export interface OutletVisitRecord {
  id: string;
  date: string;
  formattedDate: string;
  numberOfOutlets: number;
}

export const createOutletVisitColumns = (
  handleViewRecord: (record: OutletVisitRecord) => void,
  handleDeleteRecord: (record: OutletVisitRecord) => void
): ColumnDef<OutletVisitRecord>[] => {
  return [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => {
        const record = row.original;
        const hasNoOutlets = record.numberOfOutlets === 0;
        
        return (
          <div className="flex items-center gap-2">
            <span>{formatWithLeadingZero(row.index + 1)}</span>

            {hasNoOutlets && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>No outlets assigned</p>
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
    {
      id: 'numberOfOutlets',
      header: 'Number of Outlets',
      accessorKey: 'numberOfOutlets',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="border-b border-neutral-200"
                onClick={() => handleViewRecord(record)}
              >
                <div className="flex items-center gap-2">
                  <span>View/Assign Outlet</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => handleDeleteRecord(record)}
              >
                <div className="flex items-center gap-2">
                  <span>Delete</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};
