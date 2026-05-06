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

interface Order {
  _id: string;
  outletId: string;
  orderDate: string;
  orderStatus: string;
  products: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  orderValue: number;
  warehouseId: string;
  orderId: string;
  createdAt: string;
  updatedAt: string;
  outletDetails?: {
    outletName: string;
  };
  warehouseDetails?: {
    warehouseName: string;
  };
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
      // Replace accessorKey with custom cell for outlet name
      header: 'Outlet Name',
      cell: ({ row }) => row.original.outletDetails?.outletName || '',
    },
    {
      accessorKey: 'orderId',
      header: 'Order ID',
    },
    {
      accessorKey: 'orderDate',
      header: 'Order Date',
      cell: ({ row }) => {
        const date = new Date(row.getValue('orderDate'));
        return format(date, 'dd/MM/yyyy hh:mm a');
      },
    },
    {
      accessorKey: 'totalOrderAmount',
      header: 'Amount',
      cell: ({ row }) => {
        const amount = Number(row.getValue('totalOrderAmount'));
        const fixed = amount.toFixed(2);
        const formatted = fixed.endsWith('.00')
          ? `₹${fixed.slice(0, -3)}`
          : `₹${fixed}`;
        return formatted;
      },
    },
    {
      accessorKey: 'warehouseId',
      header: 'Warehouse',
      cell: ({ row }) => {
        // Use warehouse name from API response if available
        return row.original.warehouseDetails?.warehouseName || 'N/A';
      },
    },
    {
      accessorKey: 'orderStatus',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('orderStatus') as string;
        const statusConfig = getStatusConfig(status, StatusType.ORDER);
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
                    key={row.original.orderId + action.title}
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
  ] as ColumnDef<Order>[];
};
