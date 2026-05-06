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
import { Badge } from '@/components/ui/badge';
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
  beat: Record<string, MasterRecord>;
  paymentMode: Record<string, MasterRecord>;
}

// Beat-specific columns (for beats page)
export const beatColumns = (
  recordMaps: MasterRecordMaps,
  warehouseMap: Record<string, { warehouseName: string }>,
  getActionsForRow: (item: any) => Action[],
  currentPage: number = 0,
  pageSize: number = 10
): ColumnDef<Outlet>[] => {
  const baseColumns: ColumnDef<Outlet>[] = [
    {
      accessorKey: 'beatPriority',
      header: 'Beat Priority',
      cell: ({ row }) => {
        const outlet = row.original;
        const beatPriority = outlet.beatDetails?.beatPriority;
        return beatPriority !== undefined ? beatPriority.toString() : '-';
      },
    },
    {
      accessorKey: 'beatName',
      header: 'Beat Name',
      cell: ({ row }) => {
        const outlet = row.original;

        // First try to get from beatDetails (API response structure)
        if (outlet.beatDetails?.beatName) {
          return outlet.beatDetails.beatName;
        }

        // Fallback to direct beatName property
        if (outlet.beatName) return outlet.beatName;

        // Fallback to master record maps using beatDetails.beatId
        const beatId = outlet.beatDetails?.beatId || outlet.beatId;
        if (beatId && recordMaps?.beat?.[beatId]?.beatName) {
          return recordMaps.beat[beatId].beatName;
        }

        return '-';
      },
    },
    {
      accessorKey: 'outletCode',
      header: 'Outlet Code',
      cell: ({ row }) => row.original.outletCode || '-',
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
      id: 'gstStatus',
      header: 'GST Status',
      cell: ({ row }) => {
        const isGST = row.original.isGstOutlet;
        return (
          <Badge
            variant="secondary"
            className={
              isGST
                ? 'bg-freshleaf/10 text-freshleaf border-freshleaf/20'
                : 'bg-orange-100 text-orange-700 border-orange-200'
            }
          >
            {isGST ? 'GST Outlet' : 'Non-GST'}
          </Badge>
        );
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

// Regular outlet columns (for general outlets page)
export const outletColumns = (
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
      accessorKey: 'outletCode',
      header: 'Outlet Code',
      cell: ({ row }) => row.original.outletCode || '-',
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
      id: 'paymentModeId',
      header: 'Payment Mode',
      cell: ({ row }) => {
        const paymentModeId = row.original.paymentModeId;
        const fromNested = row.original.paymentMode?.paymentModeName; // if API sent nested object
        const fromMap = paymentModeId ? recordMaps?.paymentMode?.[paymentModeId]?.paymentModeName : undefined;
        return fromNested || fromMap || '-'
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
      id: 'gstStatus',
      header: 'GST Status',
      cell: ({ row }) => {
        const isGST = row.original.isGstOutlet;
        return (
          <Badge
            variant="secondary"
            className={
              isGST
                ? 'bg-freshleaf/10 text-freshleaf border-freshleaf/20'
                : 'bg-orange-100 text-orange-700 border-orange-200'
            }
          >
            {isGST ? 'GST Outlet' : 'Non-GST'}
          </Badge>
        );
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

// Default export for backward compatibility
export const columns = outletColumns;
