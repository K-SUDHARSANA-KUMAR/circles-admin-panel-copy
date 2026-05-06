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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Action } from '../util/types';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';

interface Scheme {
  _id: string;
  schemeId: string;
  schemeName: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  validFrom?: string;
  validTo?: string;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    case 'DRAFT':
      return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>;
    case 'INACTIVE':
      return <Badge className="bg-red-100 text-red-800">Inactive</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export const createApprovalColumns = (
  getActionsForRow: (item: Scheme) => Action[],
  currentPage: number = 0,
  pageSize: number = 10
): ColumnDef<Scheme>[] => {
  const baseColumns: ColumnDef<Scheme>[] = [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) =>
        formatWithLeadingZero(currentPage * pageSize + row.index + 1),
    },
    {
      accessorKey: 'schemeName',
      header: 'Scheme Name',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return renderStatusBadge(status, StatusType.SCHEME);
      },
    },
    {
      accessorKey: 'validFrom',
      header: 'Valid From',
      cell: ({ row }) => {
        const date = row.getValue('validFrom') as string | undefined;
        return date ? format(new Date(date), 'dd/MM/yyyy') : '-';
      },
    },
    {
      accessorKey: 'validTo',
      header: 'Valid To',
      cell: ({ row }) => {
        const date = row.getValue('validTo') as string | undefined;
        return date ? format(new Date(date), 'dd/MM/yyyy') : '-';
      },
    },

    // Approval Status column removed as per requirement
  ];

  baseColumns.push({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const item = row.original;
      // Expectation: parent will only return an "Approve" action for this table
      const actions = getActionsForRow(item);

      if (!actions || actions.length === 0) {
        return null;
      }

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
                key={String(item._id ?? item.schemeId) + action.title}
                variant={action.showWarning ? 'destructive' : 'default'}
                className={`${index !== actions.length - 1 ? 'border-b border-neutral-200' : ''}`}
                onClick={() => action.handleAction?.(item)}
              >
                <span>{action.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  });

  return baseColumns;
};

export default createApprovalColumns;
