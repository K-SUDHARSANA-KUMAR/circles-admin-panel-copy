'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatWithLeadingZero } from '@/lib/utils';
import { Action } from '../util/types';
import { MasterRecord } from '@/features/master-managment/types/master.types';

interface PjpRecord {
  id: string;
  routePlanId: string;
  salesPerson: string;
  noOfDays: number;
  noOfOutlets: number;
  travelTime: string;
  planType: string;
  visitPeriodFormatted: string;
  businessTypeId?: string;
  createdAt: string;
  updatedAt: string;
}

interface MasterRecordMaps {
  businessTypeMap: Record<string, MasterRecord>;
}

export const createColumns = (
  recordMaps?: MasterRecordMaps,
  getActionsForRow?: (item: any) => Action[],
  currentPage: number = 0,
  pageSize: number = 10,
): ColumnDef<PjpRecord>[] => {
  return [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => formatWithLeadingZero(currentPage * pageSize + row.index + 1),
    },
    {
      accessorKey: 'salesPerson',
      header: 'Sales Person',
    },
    {
      accessorKey: 'noOfDays',
      header: 'No of Days',
    },
    {
      accessorKey: 'noOfOutlets',
      header: 'No of Outlets',
    },
    {
      accessorKey: 'travelTime',
      header: 'Travel Time',
    },
    {
      accessorKey: 'planType',
      header: 'Plan Type',
    },
    {
      accessorKey: 'visitPeriodFormatted',
      header: 'Visit Period',
    },
    {
      id: 'businessTypeId',
      header: 'Business Type',
      cell: ({ row }) => {
        const businessTypeId = row.getValue('businessTypeId') as string;
        return (
          (businessTypeId &&
            recordMaps?.businessTypeMap?.[businessTypeId]?.businessTypeName) ||
          businessTypeId ||
          '-'
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const item = row.original;
        const actions = getActionsForRow ? getActionsForRow(item) : [];
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action, index) => {
                return (
                  <DropdownMenuItem
                    key={row.original.id + action.title}
                    variant={action.showWarning ? 'destructive' : 'default'}
                    className={`${index < actions.length - 1 ? 'border-b border-neutral-200' : ''}`}
                    onClick={() => action.handleAction?.(item)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{action.title}</span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};
