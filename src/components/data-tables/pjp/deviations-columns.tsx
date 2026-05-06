'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';
import { formatWithLeadingZero } from '@/lib/utils';
import { Action } from '../util/types';

export interface DeviationRecord {
  id: string;
  deviationId: string;
  parentRoutePlanId: string;
  userId: string;
  userName: string;
  planType: 'Weekly' | 'Monthly' | 'Daily';
  deviationPeriod: { from: string; to: string };
  deviationPeriodFormatted: string;
  status: string;
  routePlanMode?: string;
  reason?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export const createDeviationColumns = (
  currentPage: number = 0,
  pageSize: number = 10,
  getActionsForRow?: (item: DeviationRecord) => Action[],
): ColumnDef<DeviationRecord>[] => {
  return [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => formatWithLeadingZero(currentPage * pageSize + row.index + 1),
    },
    {
      accessorKey: 'parentRoutePlanId',
      header: 'Plan ID',
      cell: ({ row }) => {
        const planId = row.getValue('parentRoutePlanId') as string;
        return <div>{planId || '-'}</div>;
      },
    },
    {
      accessorKey: 'userName',
      header: 'User Name',
      cell: ({ row }) => <div>{row.getValue('userName')}</div>,
    },
    {
      accessorKey: 'planType',
      header: 'Plan Type',
      cell: ({ row }) => <div>{row.getValue('planType')}</div>,
    },
    {
      accessorKey: 'deviationPeriodFormatted',
      header: 'Deviation Period',
      cell: ({ row }) => <div>{row.getValue('deviationPeriodFormatted')}</div>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div>
          {renderStatusBadge(row.getValue('status'), StatusType.ROUTE_PLANNER_APPROVAL_STATUS)}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const item = row.original;
        const router = useRouter();
        const defaultActions: Action[] = [
          {
            title: 'View/Edit',
            handleAction: (record) => {
              router.push(`/dashboard/journey-plan/deviations/deviations-manage?id=${record.deviationId}`);
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
              {actions.map((action, index) => (
                <DropdownMenuItem
                  key={item.id + action.title}
                  className={`${index < actions.length - 1 ? 'border-b border-neutral-200' : ''}`}
                  onClick={() => action.handleAction?.(item)}
                >
                  <div className="flex items-center gap-2">
                    <span>{action.title}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};


