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
import {
  getOutletTypeId,
  getWarehouseId,
} from '@/features/dashboard/outlets/hooks/useOutlets';
import { Outlet } from '@/features/dashboard/outlets/types/outlet.types';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';
import { MasterRecord } from '@/features/master-managment/types/master.types';

interface MasterRecordMaps {
  businessType: Record<string, MasterRecord>;
  warehouseMap: Record<string, MasterRecord>;
  paymentMode: Record<string, MasterRecord>;
}

export const columns = (
  recordMaps: MasterRecordMaps,
  warehouseMap: Record<string, { warehouseName: string }>,
  getActionsForRow: (item: any) => Action[],
  currentPage: number = 0,
  pageSize: number = 10
): ColumnDef<Outlet>[] => {
  const baseColumns: ColumnDef<Outlet>[] = [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) =>
        formatWithLeadingZero(currentPage * pageSize + row.index + 1),
    },
    {
      accessorKey: 'shortCode',
      header: 'Short Code',
      cell: ({ row }) => row.original.shortCode || '-',
    },
    {
      accessorKey: 'outletName',
      header: 'Outlet Name',
    },
    {
      accessorKey: 'ownerName',
      header: 'Owner Name',
      cell: ({ row }) => row.original.ownerName || '-',
    },
    {
      accessorKey: 'phoneNumber',
      header: 'Phone Number',
      cell: ({ row }) => row.original.phoneNumber || '-',
    },
    {
      id: 'businessTypeId',
      header: 'Business Type',
      cell: ({ row }) => {
        const businessTypeId = getOutletTypeId(row.original);
        const businessTypeName =
          recordMaps?.businessType?.[businessTypeId]?.businessTypeName;
        return businessTypeName || businessTypeId || '-';
      },
    },
    {
      id: 'warehouseId',
      header: 'Warehouse',
      cell: ({ row }) => {
        const mappings = row.original.mappings || [];
        const warehouseNames = mappings
          .map((mapping) => {
            const warehouseId = mapping.warehouseId;
            return (
              recordMaps?.warehouseMap?.[warehouseId]?.name ||
              mapping.warehouseName ||
              ''
            );
          })
          .filter(Boolean)
          .join(', ');

        return warehouseNames || '-';
      },
    },
    {
      accessorKey: 'outletStatus',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('outletStatus') as string;
        return renderStatusBadge(status, StatusType.OUTLET);
      },
    },
  ];
  baseColumns.push({
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
                  variant={action.showWarning ? 'destructive' : 'default'}
                  key={row.original.outletId + action.title}
                  className={`${index !== actions.length - 1 ? 'border-b border-neutral-200' : ''}`}
                  onClick={() => action.handleAction?.(item)}
                >
                  <span>{action.title}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  });
  return baseColumns;
};
