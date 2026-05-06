'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, CheckCircle, Edit } from 'lucide-react';
import { Action } from '../util/types';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';
import { formatWithLeadingZero } from '@/lib/utils';

export interface ManualPjpRecord {
  id: string;
  routePlanId: string;
  userId: string;
  userName: string; // This will be the userName from userInfo
  noOfDays: number;
  noOfOutlets: number;
  travelTime: string;
  planType: 'Weekly' | 'Monthly' | 'Daily';
  visitPeriod: {
    from: string;
    to: string;
  };
  visitPeriodFormatted: string;
  journeyPlan: Array<{
    day: number;
    outlets: Array<{
      outletId: string;
      outletName: string;
      location: {
        type: 'Point';
        coordinates: [number, number];
      };
    }>;
  }>;
  businessTypeId?: string;
  createdAt: string;
  updatedAt: string;
}

export const createManualPjpColumns = (
  getActionsForRow?: (item: ManualPjpRecord) => Action[],
  currentPage: number = 0,
  pageSize: number = 10,
): ColumnDef<ManualPjpRecord>[] => {
  return [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => formatWithLeadingZero(currentPage * pageSize + row.index + 1),
    },
    {
      accessorKey: 'userName',
      header: 'User Name',
      cell: ({ row }) => {
        return <div className="font-medium">{row.getValue('userName')}</div>;
      },
    },
    {
      accessorKey: 'visitPeriodFormatted',
      header: 'Visit Period',
      cell: ({ row }) => {
        return <div>{row.getValue('visitPeriodFormatted')}</div>;
      },
    },
    {
      accessorKey: 'noOfDays',
      header: 'Total Days',
      cell: ({ row }) => {
        return <div>{row.getValue('noOfDays')}</div>;
      },
    },
    {
      accessorKey: 'noOfOutlets',
      header: 'Total Outlets',
      cell: ({ row }) => {
        return <div>{row.getValue('noOfOutlets')}</div>;
      },
    },
    {
      accessorKey: 'planType',
      header: 'Plan Type',
      cell: ({ row }) => {
        return <div>{row.getValue('planType')}</div>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        return <div>
          {renderStatusBadge(row.getValue('status'), StatusType.OUTLET)}
        </div>;
      },
    },
    {
      id: 'actions',
      header: 'Action',
      cell: ({ row }) => {
        const item = row.original;
        const defaultActions: Action[] = [
          {
            title: 'View/Edit',
            handleAction: (item) => {
              console.log('Edit:', item);
              // Add your edit logic here
            },
          },
        ];

        const actions = getActionsForRow ? getActionsForRow(item) : defaultActions;

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
                    key={item.id + action.title}
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