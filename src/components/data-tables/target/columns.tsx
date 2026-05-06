'use client';

import { ColumnDef } from '@tanstack/react-table';
import { formatWithLeadingZero } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type TargetRow = {
  id: string;
  name: string;
  targetAmount: number;
  targetKgs: number;
  actualAmount: number;
  actualKgs: number;
  status: string;
};

type Action = {
  title: string;
  icon?: React.ReactNode;
  showWarning?: boolean;
  handleAction?: (row: TargetRow) => void;
};

export const createTargetColumns = (
  getActionsForRow: (item: TargetRow) => Action[],
  currentPage: number = 0,
  pageSize: number = 10
): ColumnDef<TargetRow>[] => [
  {
    id: 'sno',
    header: 'S.No',
    cell: ({ row }) => formatWithLeadingZero(currentPage * pageSize + row.index + 1),
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'targetAmount',
    header: 'Target Amount',
    cell: ({ row }) => String(row.original.targetAmount ?? 0),
  },
  {
    accessorKey: 'targetKgs',
    header: 'Target Kgs',
    cell: ({ row }) => String(row.original.targetKgs ?? 0),
  },
  {
    accessorKey: 'actualAmount',
    header: 'Actual Amount',
    cell: ({ row }) => {
      const a = Number(row.original.actualAmount ?? 0);
      const t = Number(row.original.targetAmount ?? 0);
      const pct = t > 0 ? ((a / t) * 100).toFixed(1) : '0.0';
      return `${a} (${pct}%)`;
    },
  },
  {
    accessorKey: 'actualKgs',
    header: 'Actual Kgs',
    cell: ({ row }) => {
      const a = Number(row.original.actualKgs ?? 0);
      const t = Number(row.original.targetKgs ?? 0);
      const pct = t > 0 ? ((a / t) * 100).toFixed(1) : '0.0';
      return `${a} (${pct}%)`;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      const getStatusLabel = (status: string) => {
        switch (status?.toLowerCase()) {
          case 'draft':
            return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Draft</span>;
          case 'active':
            return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>;
          case 'inactive':
            return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Inactive</span>;
          default:
            return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status || 'Unknown'}</span>;
        }
      };
      return getStatusLabel(status);
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
            {actions.map((action) => (
              <DropdownMenuItem
                key={action.title}
                className={`border-b border-neutral-200 ${action.showWarning ? 'focus:bg-red-100' : ''}`}
                onClick={() => action.handleAction?.(item)}
              >
                <div className="flex items-center gap-2">
                  {action.icon}
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
