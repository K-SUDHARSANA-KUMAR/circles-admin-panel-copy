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
import { Action } from '../../util/types';
import { format } from 'date-fns';
import StatusBadge from '@/components/ui/badge';
import { getStatusConfig } from '@/constants/status-config';
import { StatusType } from '@/utils/badge-utils';
import { MasterRecord } from '@/features/master-managment/types/master.types';

interface ReturnOrder {
  _id: string;
  orderId: string;
  userId: string;
  outletId: string;
  returnDate: string;
  returnReason: string;
  products: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  returnOrderStatus: string;
  returnId: string;
  createdAt: string;
  updatedAt: string;
}

interface MasterRecordMaps {
  [key: string]: Record<string, MasterRecord>;
}

export const createColumns = (
  getActionsForRow: (item: any) => Action[],
  currentPage: number = 0,
  pageSize: number = 10,
  recordMaps?: MasterRecordMaps,
  warehouseMap?: Record<string, { warehouseName: string }>
) => {
  return [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) =>
        formatWithLeadingZero(currentPage * pageSize + row.index + 1),
    },
    {
      accessorKey: 'orderId',
      header: 'Order ID',
    },
    {
      accessorKey: 'returnId',
      header: 'Return ID',
    },
    {
      accessorKey: 'outletName',
      header: 'Outlet Name',
    },
    {
      accessorKey: 'returnDate',
      header: 'Return Date',
      cell: ({ row }) => {
        const date = new Date(row.getValue('returnDate'));
        return format(date, 'dd/MM/yyyy');
      },
    },
    {
      accessorKey: 'returnOrderStatus',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('returnOrderStatus') as string;
        const statusConfig = getStatusConfig(status, StatusType.RETURN_ORDER);
        return (
          <StatusBadge
            value={statusConfig.label || status}
            variant={statusConfig.variant}
          />
        );
      },
    },
    {
      id: 'actions',
      header: 'Action',
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
                    key={row.original.returnId + action.title}
                    className={`${index !== actions.length - 1 ? 'border-b border-neutral-200' : ''} ${action.showWarning ? 'focus:bg-red-100' : ''}`}
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
  ] as ColumnDef<ReturnOrder>[];
};
