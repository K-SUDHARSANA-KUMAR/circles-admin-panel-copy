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
import { MasterRecord } from '@/features/master-managment/types/master.types';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';

import { Order } from '@/features/dashboard/orders/types/order.types';



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
      accessorKey: 'sequencedOrderId',
      header: 'Sequenced Order ID',
      cell: ({ row }) => {
        const sequencedOrderId = row.getValue('sequencedOrderId') as string;
        const orderDate = row.original.orderDate;

        if (!sequencedOrderId || !orderDate) {
          return sequencedOrderId || '-';
        }

        const numericPart = sequencedOrderId.replace(/^ORD-?/i, '').replace(/-/g, '');

        const date = new Date(orderDate);
        const month = date.getMonth() + 1;

        const monthLetter = String.fromCharCode(64 + month);
        return `OD${monthLetter}${numericPart}`;
      },
    },
    {
      header: 'Placed By',
      accessorKey: 'userName',
      cell: ({ row }) => row.original.userName || '-',
    },
    {
      // Replace accessorKey with custom cell for outlet name
      header: 'Outlet Name',
      cell: ({ row }) => row.original.outletDetails?.outletName || '',
    },
    {
      header: 'Outlet Status',
      cell: ({ row }) => {
        const status = row.original.outletDetails?.outletStatus as string;
        return renderStatusBadge(status, StatusType.OUTLET);
      },
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
      header: 'Order Status',
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
