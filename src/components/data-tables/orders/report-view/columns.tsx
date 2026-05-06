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

interface ReportView {
  productName: string;
  quantity: number;
  unit: string;
  returnValue: number;
  expiryDate: string;
  reason: string;
  onViewLogs?: () => void;
}

export const createColumns = () => {
  return [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => formatWithLeadingZero(row.index + 1),
    },
    {
      accessorKey: 'productName',
      header: 'Product Name',
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
    },
    {
      accessorKey: 'unit',
      header: 'Unit',
    },
    {
      accessorKey: 'returnValue',
      header: 'Return Value',
    },
    {
      accessorKey: 'expiryDate',
      header: 'Expiry Date',
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
    },
    {
      id: 'actions',
      header: 'Action',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => row.original.onViewLogs?.()}>
              Logs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ] as ColumnDef<ReportView>[];
};
