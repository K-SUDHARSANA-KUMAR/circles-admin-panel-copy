'use client';

import { formatWithLeadingZero } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Action } from '../util/types';
import { renderStatusBadge } from '@/utils/badge-utils';
import { format } from 'date-fns';

interface PjpHistoryRecord {
  _id: string;
  outletName: string;
  visitOrderStatus: string;
  userInfo: {
    name: string;
    userId: string;
    employeeCode: string;
    email: string;
    phoneNumber: string;
  };
  outletId: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  userId: string;
  routePlanId: string;
  day: number;
  index: number;
  visitDate: string;
  isDeleted: boolean;
  visitOrderId: string;
  checkedIn?: string;
  checkedOut?: string;
  createdAt: string;
  updatedAt: string;
}

export const createColumns = (
  getActionsForRow: (item: any) => Action[],
  currentPage: number = 0,
  pageSize: number = 10
): ColumnDef<PjpHistoryRecord>[] => {
  return [
    {
      id: 'serialNumber',
      header: 'S.No',
      cell: ({ row }) => {
        const serial = currentPage * pageSize + row.index + 1;
        return <div>{formatWithLeadingZero(serial)}</div>;
      },
    },
    {
      accessorKey: 'outletName',
      header: 'Outlet Name',
    },
    {
      accessorKey: 'visitOrderStatus',
      header: 'Visit Status',
      cell: ({ row }) => {
        const status = row.getValue('visitOrderStatus') as string;
        return renderStatusBadge(status, 'outlet');
      },
    },
    {
      accessorKey: 'userInfo.name',
      header: 'Sales Person',
      cell: ({ row }) => {
        const userInfo = row.original.userInfo;
        return <div>{userInfo?.name || 'N/A'}</div>;
      },
    },
    {
      accessorKey: 'visitDate',
      header: 'Visited Date',
      cell: ({ row }) => {
        const visitDate = row.original.visitDate;
        if (!visitDate) return '-';
        const date = new Date(visitDate);
        if (isNaN(date.getTime())) return '-';
        return format(date, 'do MMM yyyy');
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const item = row.original;
        const actions = getActionsForRow(item);
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
                    key={row.original._id + action.title}
                    className={`${action.showWarning ? 'focus:bg-red-100' : ''}`}
                    onClick={() => action.handleAction?.(item)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{action.icon}</span>
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
