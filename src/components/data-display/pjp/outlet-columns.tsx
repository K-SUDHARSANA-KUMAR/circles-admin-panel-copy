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
import { Action } from '../util/types';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';

interface OutletRecord {
  _id: string;
  outletId: string;
  outletName: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  userId: string;
  routePlanId: string;
  status: string;
  day: number;
  isDeleted: boolean;
  visitOrderId: string;
  visitOrderStatus: string;
  visitDate: string;
  businessTypeName?: string;
  businessType?: {
    businessTypeName: string;
  };
  outletDetails?: {
    businessTypeId?: string;
    businessType?: {
      businessTypeName: string;
    };
  };
  __v: number;
  createdAt: string;
  updatedAt: string;
  userInfo: {
    userId: string;
    name: string;
    employeeCode: string;
    email: string;
    phoneNumber: string;
  };
}

export const createColumns = (
  getActionsForRow: (item: any) => Action[]
): ColumnDef<OutletRecord>[] => {
  return [
    {
      accessorKey: 'day',
      header: 'Day',
      cell: ({ row }) => {
        return `${row.original.day}`;
      },
    },
    {
      accessorKey: 'outletName',
      header: 'Outlet Name',
    },
    {
      accessorKey: 'visitOrderStatus',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.visitOrderStatus || row.original.status;
        return renderStatusBadge(status || 'Pending', StatusType.ORDER);
      },
    },
    {
      accessorKey: 'visitDate',
      header: 'Visit Date',
      cell: ({ row }) => {
        const date = row.original.visitDate;
        if (!date) return '-';
        return new Date(date).toLocaleDateString();
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
                    variant={action.showWarning ? 'destructive' : 'default'}
                    className={`${index === actions.length - 1 ? 'border-b-0' : 'border-b border-neutral-200'}`}
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

